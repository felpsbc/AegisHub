"""Cifra/decifra do `User.mfa_secret`.

Etapa intermediária no roadmap de criptografia: substitui o segredo TOTP
em claro no banco por Fernet (AES-128-CBC + HMAC-SHA256, com IV aleatório
em cada cifragem). Não é o envelope KMS completo previsto para `Message`
e `Report` na Fase 2, mas elimina a dívida `mfa_secret em claro` registrada
em CLAUDE.md sem mover a chave para o KMS ainda.

Chave: `MFA_ENCRYPTION_KEY` (Fernet base64-urlsafe 32 bytes).
Gere com `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
Em DEBUG sem chave, deriva uma da SECRET_KEY (só pra dev funcionar — em
produção a chave é obrigatória via settings).
"""
from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet
from django.conf import settings


def _derive_dev_key() -> bytes:
    """Deriva chave Fernet determinística da SECRET_KEY (dev fallback)."""
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _fernet() -> Fernet:
    key = settings.MFA_ENCRYPTION_KEY
    if not key:
        if not settings.DEBUG:
            raise RuntimeError("MFA_ENCRYPTION_KEY is required when DEBUG=False")
        return Fernet(_derive_dev_key())
    return Fernet(key.encode("ascii") if isinstance(key, str) else key)


def encrypt_mfa_secret(plain: str) -> bytes:
    return _fernet().encrypt(plain.encode("ascii"))


def decrypt_mfa_secret(ciphertext: bytes) -> str:
    return _fernet().decrypt(bytes(ciphertext)).decode("ascii")
