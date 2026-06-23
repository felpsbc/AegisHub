"""Regressão do rate-limit dedicado nos endpoints de auth.

Brute-force/enumeração: os scopes `login`/`register`/`password_reset` agora estão
atachados via ScopedRateThrottle. Sem isso, só o AnonRateThrottle global (20/min)
limitava — bem mais frouxo para um endpoint de senha.
"""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_login_is_rate_limited():
    client = APIClient()
    payload = {"email": "ninguem@example.com", "password": "errada1234567"}
    # login: 10/min. As 10 primeiras passam (401), a 11ª é barrada (429).
    codes = [
        client.post("/api/v1/auth/login", payload, format="json").status_code
        for _ in range(11)
    ]
    assert codes[:10] == [401] * 10
    assert codes[10] == 429


def test_password_reset_is_rate_limited():
    client = APIClient()
    payload = {"email": "ninguem@example.com"}
    # password_reset: 5/min. 5 passam (202), a 6ª é barrada (429).
    codes = [
        client.post("/api/v1/auth/password/reset", payload, format="json").status_code
        for _ in range(6)
    ]
    assert codes[:5] == [202] * 5
    assert codes[5] == 429
