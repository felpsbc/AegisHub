"""PSP fake para desenvolvimento. Substituível pelo adapter Pagar.me na fase 2."""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from decimal import Decimal

from django.conf import settings

from infra.gateways.base import Charge


class FakePSP:
    name = "fake"

    def create_charge(
        self,
        *,
        contract_id: str,
        amount: Decimal,
        method: str,
        idempotency_key: str,
    ) -> Charge:
        return Charge(
            psp=self.name,
            psp_charge_id=f"fake_{secrets.token_hex(8)}",
            method=method,
            amount=amount,
            currency="BRL",
            status="CREATED",
            pix_qr_code=None if method != "PIX" else f"00020126{contract_id[:8]}fake-pix-payload",
        )

    def verify_webhook(self, *, payload: bytes, signature: str, timestamp: str) -> dict:
        secret = settings.PSP_WEBHOOK_SECRET.encode("utf-8")
        expected = hmac.new(secret, timestamp.encode() + b"." + payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise ValueError("invalid_signature")
        return json.loads(payload.decode("utf-8"))


def get_gateway() -> FakePSP:
    if settings.PSP == "fake":
        return FakePSP()
    raise NotImplementedError(f"PSP {settings.PSP} not wired in this phase")
