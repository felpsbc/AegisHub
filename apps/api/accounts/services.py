from __future__ import annotations

import base64
import secrets

import pyotp
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.http import HttpRequest

from accounts.models import User
from audit.services import record_event
from tenants.models import DocumentKind, MembershipRole, TenantType
from tenants.services import create_tenant_for_user


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
    create_tenant_for_user(
        user=user,
        type=tenant_type,
        legal_name=legal_name,
        document=document,
        document_kind=document_kind,
        role=MembershipRole.OWNER,
    )
    record_event(
        actor=user,
        event_type="USER_REGISTERED",
        object_type="User",
        object_id=user.pk,
        payload={"tenant_type": tenant_type, "email": email},
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
    if user.mfa_enabled:
        request.session["pending_mfa_user"] = user.pk
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
    if not pending:
        raise LoginError("no_pending_mfa")
    user = User.objects.get(pk=pending)
    if not user.mfa_secret:
        raise LoginError("mfa_not_setup")
    secret = bytes(user.mfa_secret).decode("ascii")
    if not pyotp.TOTP(secret).verify(code, valid_window=1):
        raise LoginError("invalid_mfa")
    request.session.pop("pending_mfa_user", None)
    login(request, user)
    record_event(
        actor=user,
        event_type="USER_LOGIN_MFA",
        object_type="User",
        object_id=user.pk,
        payload={},
    )
    return user


def setup_mfa(user: User) -> tuple[str, list[str]]:
    """Gera segredo TOTP + 8 códigos de backup. Não ativa ainda."""
    secret = pyotp.random_base32()
    user.mfa_secret = secret.encode("ascii")
    user.save(update_fields=["mfa_secret"])
    backup_codes = [base64.b32encode(secrets.token_bytes(5)).decode("ascii") for _ in range(8)]
    return secret, backup_codes


def enable_mfa(user: User, *, code: str) -> None:
    if not user.mfa_secret:
        raise LoginError("mfa_not_setup")
    secret = bytes(user.mfa_secret).decode("ascii")
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
