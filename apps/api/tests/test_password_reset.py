"""Regressão do fluxo de redefinição de senha via HTTP.

Cobre: pedido de reset (202 incondicional, sem vazar existência do e-mail),
confirmação com token válido, uso único do token, rejeição de senha fraca e
o efeito real (senha antiga deixa de funcionar, nova passa).
"""
from __future__ import annotations

import re

import pytest
from rest_framework.test import APIClient

from accounts.email import password_reset_token
from accounts.models import User
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

pytestmark = pytest.mark.django_db

OLD = "SenhaForte123!@"
NEW = "NovaSenha456!@"


def _make_user(email="reset@example.com"):
    return User.objects.create_user(email=email, password=OLD, full_name="Reset User")


def _tokens_for(user):
    return urlsafe_base64_encode(force_bytes(user.pk)), password_reset_token.make_token(user)


def test_request_reset_sends_email_for_existing_user(mailoutbox, django_capture_on_commit_callbacks):
    _make_user()
    # O e-mail é enfileirado em transaction.on_commit; capturamos e executamos.
    with django_capture_on_commit_callbacks(execute=True):
        resp = APIClient().post(
            "/api/v1/auth/password/reset", {"email": "reset@example.com"}, format="json"
        )
    assert resp.status_code == 202
    assert len(mailoutbox) == 1
    assert "redefinir-senha" in mailoutbox[0].body


def test_request_reset_is_silent_for_unknown_email(mailoutbox, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        resp = APIClient().post(
            "/api/v1/auth/password/reset", {"email": "naoexiste@example.com"}, format="json"
        )
    # Mesmo status e sem e-mail: não vira oráculo de enumeração de contas.
    assert resp.status_code == 202
    assert len(mailoutbox) == 0


def test_confirm_reset_changes_password(mailoutbox):
    user = _make_user()
    uidb64, token = _tokens_for(user)
    resp = APIClient().post(
        "/api/v1/auth/password/reset/confirm",
        {"uidb64": uidb64, "token": token, "new_password": NEW},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    user.refresh_from_db()
    assert user.check_password(NEW)
    assert not user.check_password(OLD)


def test_reset_token_is_single_use():
    user = _make_user()
    uidb64, token = _tokens_for(user)
    client = APIClient()
    first = client.post(
        "/api/v1/auth/password/reset/confirm",
        {"uidb64": uidb64, "token": token, "new_password": NEW},
        format="json",
    )
    assert first.status_code == 200
    # Trocar a senha muda o hash que alimenta o token → segundo uso é inválido.
    second = client.post(
        "/api/v1/auth/password/reset/confirm",
        {"uidb64": uidb64, "token": token, "new_password": "OutraSenha789!@"},
        format="json",
    )
    assert second.status_code == 400
    assert second.json()["detail"] == "invalid_reset"


def test_reset_rejects_invalid_token():
    user = _make_user()
    uidb64, _ = _tokens_for(user)
    resp = APIClient().post(
        "/api/v1/auth/password/reset/confirm",
        {"uidb64": uidb64, "token": "nao-e-um-token-valido", "new_password": NEW},
        format="json",
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "invalid_reset"


def test_reset_rejects_weak_password():
    user = _make_user()
    uidb64, token = _tokens_for(user)
    resp = APIClient().post(
        "/api/v1/auth/password/reset/confirm",
        {"uidb64": uidb64, "token": token, "new_password": "123456789012"},
        format="json",
    )
    assert resp.status_code == 400
    assert resp.json()["errors"][0]["field"] == "new_password"
    user.refresh_from_db()
    assert user.check_password(OLD)  # senha não mudou


def test_reset_email_url_completes_the_flow(mailoutbox, django_capture_on_commit_callbacks):
    """O link do e-mail (uid/token) tem que ser aceito pelo endpoint de confirmação."""
    _make_user()
    with django_capture_on_commit_callbacks(execute=True):
        APIClient().post(
            "/api/v1/auth/password/reset", {"email": "reset@example.com"}, format="json"
        )
    match = re.search(r"/redefinir-senha/([^/]+)/(\S+)", mailoutbox[0].body)
    assert match, mailoutbox[0].body
    uidb64, token = match.group(1), match.group(2)
    resp = APIClient().post(
        "/api/v1/auth/password/reset/confirm",
        {"uidb64": uidb64, "token": token, "new_password": NEW},
        format="json",
    )
    assert resp.status_code == 200, resp.content
