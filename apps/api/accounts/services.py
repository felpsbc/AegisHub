from __future__ import annotations

import base64
import logging
import secrets

import pyotp
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.http import HttpRequest
from django.utils import timezone

from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from accounts.crypto import decrypt_mfa_secret, encrypt_mfa_secret
from accounts.email import email_confirmation_token, password_reset_token
from accounts.models import User
from accounts.tasks import (
    send_confirmation_email_task,
    send_password_reset_email_task,
)
from audit.services import record_event
from tenants.models import DocumentKind, MembershipRole, TenantType
from tenants.services import create_tenant_for_user

PENDING_MFA_TTL_SECONDS = 300

logger = logging.getLogger("pentesthub")


class LoginError(Exception):
    pass


class MFARequired(Exception):
    """Raised quando login passa pela senha mas precisa do segundo fator."""


@transaction.atomic
def register_account(
    *,
    email: str,
    password: str,
    full_name: str,
    tenant_type: TenantType,
    legal_name: str,
    document: str,
    document_kind: DocumentKind,
) -> User:
    user = User.objects.create_user(email=email, password=password, full_name=full_name)
    tenant = create_tenant_for_user(
        user=user,
        type=tenant_type,
        legal_name=legal_name,
        document=document,
        document_kind=document_kind,
        role=MembershipRole.OWNER,
    )
    if tenant_type == TenantType.INDIVIDUAL:
        from decimal import Decimal

        from pentesters.services import create_or_update_profile

        create_or_update_profile(
            tenant=tenant,
            headline="",
            bio="",
            hourly_rate=Decimal("0"),
            actor=user,
        )
    record_event(
        actor=user,
        event_type="USER_REGISTERED",
        object_type="User",
        object_id=user.pk,
        payload={"tenant_type": tenant_type, "email": email},
    )
    # A request inteira roda em transaction.atomic (TenantMiddleware); enfileira só
    # após o commit pra o worker não buscar um usuário ainda não persistido.
    user_id = user.pk
    transaction.on_commit(lambda: send_confirmation_email_task.delay(user_id))
    return user


def confirm_email(*, uidb64: str, token: str) -> User:
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise LoginError("invalid_confirmation")
    if not email_confirmation_token.check_token(user, token):
        raise LoginError("invalid_confirmation")
    if user.email_confirmed_at is None:
        user.email_confirmed_at = timezone.now()
        user.save(update_fields=["email_confirmed_at"])
        record_event(
            actor=user,
            event_type="USER_EMAIL_CONFIRMED",
            object_type="User",
            object_id=user.pk,
            payload={"email": user.email},
        )
    return user


def resend_confirmation(*, email: str) -> None:
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return  # não revelar existência do e-mail
    if user.email_confirmed_at is not None:
        return
    user_id = user.pk
    transaction.on_commit(lambda: send_confirmation_email_task.delay(user_id))


@transaction.atomic
def admin_set_user_active(*, user: User, active: bool, actor: User) -> User:
    """Ativa/desativa uma conta (moderação). Desativar bloqueia o login.

    Preferimos desativar a excluir: o usuário pode estar referenciado como `actor`
    no audit_log (append-only), e o DELETE em cascata (SET_NULL → UPDATE) seria
    barrado pela trigger. Desativar é reversível e não mexe na trilha.
    """
    if user.pk == actor.pk:
        raise LoginError("cannot_change_own_status")
    user.is_active = active
    user.save(update_fields=["is_active", "updated_at"])
    record_event(
        actor=actor,
        event_type="USER_ACTIVATED" if active else "USER_DEACTIVATED",
        object_type="User",
        object_id=user.pk,
        payload={"email": user.email},
    )
    return user


def request_password_reset(*, email: str) -> None:
    """Dispara o e-mail de redefinição. Nunca revela se o e-mail existe.

    Sempre retorna None (o caller responde 202 incondicionalmente) para não virar
    um oráculo de enumeração de contas.
    """
    normalized = User.objects.normalize_email(email).lower()
    try:
        user = User.objects.get(email__iexact=normalized)
    except User.DoesNotExist:
        return
    if not user.is_active:
        return
    user_id = user.pk
    transaction.on_commit(lambda: send_password_reset_email_task.delay(user_id))


@transaction.atomic
def reset_password(*, uidb64: str, token: str, new_password: str) -> User:
    """Valida o token e troca a senha. Token é de uso único (muda o hash da senha)."""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise LoginError("invalid_reset")
    if not password_reset_token.check_token(user, token):
        raise LoginError("invalid_reset")
    user.set_password(new_password)
    user.save(update_fields=["password"])
    record_event(
        actor=user,
        event_type="USER_PASSWORD_RESET",
        object_type="User",
        object_id=user.pk,
        payload={"email": user.email},
    )
    return user


def login_with_password(
    request: HttpRequest, *, email: str, password: str
) -> User:
    user = authenticate(request, username=email, password=password)
    if user is None:
        raise LoginError("invalid_credentials")
    if not user.is_active:
        raise LoginError("inactive")
    # Gate de segurança: ninguém entra sem confirmar o e-mail. Admins são
    # provisionados via CLI (create_admin) já confirmados, então não caem aqui.
    if user.email_confirmed_at is None:
        raise LoginError("email_not_confirmed")
    if user.mfa_enabled:
        request.session["pending_mfa_user"] = user.pk
        request.session["pending_mfa_at"] = int(timezone.now().timestamp())
        raise MFARequired
    login(request, user)
    record_event(
        actor=user,
        event_type="USER_LOGIN",
        object_type="User",
        object_id=user.pk,
        payload={},
    )
    return user


def verify_mfa(request: HttpRequest, *, code: str) -> User:
    pending = request.session.get("pending_mfa_user")
    started_at = request.session.get("pending_mfa_at")
    if not pending or not started_at:
        raise LoginError("no_pending_mfa")
    if int(timezone.now().timestamp()) - int(started_at) > PENDING_MFA_TTL_SECONDS:
        request.session.pop("pending_mfa_user", None)
        request.session.pop("pending_mfa_at", None)
        raise LoginError("pending_mfa_expired")
    user = User.objects.get(pk=pending)
    if not user.mfa_secret:
        raise LoginError("mfa_not_setup")
    secret = decrypt_mfa_secret(user.mfa_secret)
    used_backup = False
    if pyotp.TOTP(secret).verify(code, valid_window=1):
        pass
    else:
        # Backup codes são one-time. Comparação em tempo constante via check_password.
        backup_codes: list[str] = list(user.mfa_backup_codes or [])
        match_index = next(
            (i for i, h in enumerate(backup_codes) if check_password(code, h)),
            None,
        )
        if match_index is None:
            raise LoginError("invalid_mfa")
        backup_codes.pop(match_index)
        user.mfa_backup_codes = backup_codes
        user.save(update_fields=["mfa_backup_codes"])
        used_backup = True
    request.session.pop("pending_mfa_user", None)
    request.session.pop("pending_mfa_at", None)
    login(request, user)
    record_event(
        actor=user,
        event_type="USER_LOGIN_MFA",
        object_type="User",
        object_id=user.pk,
        payload={"backup_code": used_backup},
    )
    return user


def setup_mfa(user: User) -> tuple[str, list[str]]:
    """Gera segredo TOTP + 8 códigos de backup. Não ativa ainda.

    Backup codes são retornados em claro UMA única vez ao caller (mostrar ao usuário)
    e persistidos como hash Argon2/PBKDF2 — `verify_mfa` consome o hash one-time.
    """
    secret = pyotp.random_base32()
    backup_codes = [base64.b32encode(secrets.token_bytes(5)).decode("ascii") for _ in range(8)]
    user.mfa_secret = encrypt_mfa_secret(secret)
    user.mfa_backup_codes = [make_password(c) for c in backup_codes]
    user.save(update_fields=["mfa_secret", "mfa_backup_codes"])
    return secret, backup_codes


def enable_mfa(user: User, *, code: str) -> None:
    if not user.mfa_secret:
        raise LoginError("mfa_not_setup")
    secret = decrypt_mfa_secret(user.mfa_secret)
    if not pyotp.TOTP(secret).verify(code, valid_window=1):
        raise LoginError("invalid_mfa")
    user.mfa_enabled = True
    user.save(update_fields=["mfa_enabled"])
    record_event(
        actor=user,
        event_type="USER_MFA_ENABLED",
        object_type="User",
        object_id=user.pk,
        payload={},
    )


def logout_session(request: HttpRequest) -> None:
    user = request.user if request.user.is_authenticated else None
    logout(request)
    if user:
        record_event(
            actor=user,
            event_type="USER_LOGOUT",
            object_type="User",
            object_id=user.pk,
            payload={},
        )
