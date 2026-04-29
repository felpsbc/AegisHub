"""KMS local (DEV-ONLY) — substituído por boto3 KMS real em produção.

Padrão envelope encryption (ADR-005):
- KEK fixa em variável de ambiente (LOCAL_KMS_MASTER_KEY).
- generate_dek(): cria DEK aleatória, retorna (plaintext_dek, ciphertext_blob).
- decrypt_dek(blob): devolve a plaintext_dek.

ATENÇÃO: este módulo NÃO deve ser usado em produção. settings.PSP / KMS_PROVIDER
deve apontar para implementação AWS KMS quando rodando fora de DEBUG.
"""

from __future__ import annotations

import base64
import os
import secrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings


def _master_key() -> bytes:
    raw = settings.LOCAL_KMS_MASTER_KEY
    if not raw:
        raise RuntimeError("LOCAL_KMS_MASTER_KEY não configurada")
    key = base64.b64decode(raw)
    if len(key) < 32:
        # deriva determinístico para chave de 32 bytes em dev
        key = (key * (32 // len(key) + 1))[:32]
    return key


def generate_dek() -> tuple[bytes, bytes]:
    """Cria uma DEK aleatória (32 bytes) e cifra com a KEK. Retorna (plaintext, blob)."""
    dek = secrets.token_bytes(32)
    blob = _wrap(dek)
    return dek, blob


def decrypt_dek(blob: bytes) -> bytes:
    return _unwrap(blob)


def _wrap(plaintext: bytes) -> bytes:
    nonce = os.urandom(12)
    aes = AESGCM(_master_key())
    ct = aes.encrypt(nonce, plaintext, associated_data=b"pentesthub-dek")
    return nonce + ct


def _unwrap(blob: bytes) -> bytes:
    if len(blob) < 12 + 16:
        raise ValueError("blob too short")
    nonce, ct = blob[:12], blob[12:]
    aes = AESGCM(_master_key())
    return aes.decrypt(nonce, ct, associated_data=b"pentesthub-dek")
