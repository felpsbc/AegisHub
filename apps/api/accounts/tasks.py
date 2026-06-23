"""Tasks Celery para e-mails transacionais de conta.

Tirar o envio de e-mail do caminho síncrono da request: uma lentidão/queda do
SMTP não pode mais travar cadastro, login ou redefinição de senha. As tasks são
enfileiradas com `transaction.on_commit` (ver services), então o worker só roda
depois que o usuário já está commitado no banco.

Retry com backoff: falha transitória de SMTP é re-tentada algumas vezes antes de
desistir; o erro fica visível no log/worker em vez de quebrar a request.
"""
from __future__ import annotations

import logging

from celery import shared_task

from accounts.email import send_confirmation_email, send_password_reset_email
from accounts.models import User

logger = logging.getLogger("pentesthub")


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    retry_backoff=True,
    acks_late=True,
)
def send_confirmation_email_task(self, user_id: int) -> None:
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning("confirmation email skipped: user_id=%s not found", user_id)
        return
    try:
        send_confirmation_email(user)
    except Exception as exc:
        logger.exception("confirmation email failed for user_id=%s; retrying", user_id)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    retry_backoff=True,
    acks_late=True,
)
def send_password_reset_email_task(self, user_id: int) -> None:
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning("password reset email skipped: user_id=%s not found", user_id)
        return
    try:
        send_password_reset_email(user)
    except Exception as exc:
        logger.exception("password reset email failed for user_id=%s; retrying", user_id)
        raise self.retry(exc=exc)
