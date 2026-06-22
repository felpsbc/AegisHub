"""Regressão para o cadastro via HTTP.

Antes desta cobertura, `POST /auth/register` com e-mail ou documento já
existente estourava `IntegrityError` no INSERT e devolvia **HTTP 500** — o
erro que o usuário via na prática. O contrato correto é **400** (validação),
nunca 500. Cobre também a normalização de documento (pontuação de CPF/CNPJ)
e o gate de e-mail não confirmado no login.
"""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from accounts.models import User
from tenants.models import Tenant

pytestmark = pytest.mark.django_db


def _payload(**over):
    base = {
        "email": "novo@example.com",
        "password": "SenhaForte123!",
        "full_name": "Novo Usuário",
        "tenant_type": "INDIVIDUAL",
        "legal_name": "Novo ME",
        "document": "12345678000199",
        "document_kind": "CNPJ",
    }
    base.update(over)
    return base


def test_register_creates_user_and_tenant():
    client = APIClient()
    resp = client.post("/api/v1/auth/register", _payload(), format="json")
    assert resp.status_code == 201, resp.content
    assert User.objects.filter(email="novo@example.com").exists()
    assert Tenant.objects.filter(document="12345678000199").exists()


def test_register_duplicate_email_returns_400_not_500():
    client = APIClient()
    assert client.post("/api/v1/auth/register", _payload(), format="json").status_code == 201
    # mesmo e-mail, documento diferente → tem que ser 400, jamais 500
    resp = client.post(
        "/api/v1/auth/register",
        _payload(document="99887766000155"),
        format="json",
    )
    assert resp.status_code == 400, resp.content
    assert "email" in resp.content.decode().lower()


def test_register_duplicate_document_returns_400_not_500():
    client = APIClient()
    assert client.post("/api/v1/auth/register", _payload(), format="json").status_code == 201
    resp = client.post(
        "/api/v1/auth/register",
        _payload(email="outro@example.com"),
        format="json",
    )
    assert resp.status_code == 400, resp.content


def test_register_normalizes_document_punctuation():
    client = APIClient()
    assert client.post("/api/v1/auth/register", _payload(), format="json").status_code == 201
    # mesmo documento, agora com pontuação: a normalização precisa colidir → 400
    resp = client.post(
        "/api/v1/auth/register",
        _payload(email="outro@example.com", document="12.345.678/0001-99"),
        format="json",
    )
    assert resp.status_code == 400, resp.content


def test_login_blocked_until_email_confirmed():
    client = APIClient()
    assert client.post("/api/v1/auth/register", _payload(), format="json").status_code == 201
    resp = client.post(
        "/api/v1/auth/login",
        {"email": "novo@example.com", "password": "SenhaForte123!"},
        format="json",
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "email_not_confirmed"
