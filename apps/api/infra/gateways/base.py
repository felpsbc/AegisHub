"""Protocolo de gateway de pagamento. Implementações: pagarme, asaas, fake."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True)
class Charge:
    psp: str
    psp_charge_id: str
    method: str
    amount: Decimal
    currency: str
    status: str
    pix_qr_code: str | None = None


class PaymentGateway(Protocol):
    def create_charge(
        self,
        *,
        contract_id: str,
        amount: Decimal,
        method: str,
        idempotency_key: str,
    ) -> Charge: ...

    def verify_webhook(self, *, payload: bytes, signature: str, timestamp: str) -> dict: ...
