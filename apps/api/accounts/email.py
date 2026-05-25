"""Envio de e-mails transacionais de conta (confirmação, recuperação).

Em dev o backend SMTP aponta para o Mailhog (porta 1025), com inbox visual em
http://localhost:8025. Em prod, troque EMAIL_HOST/PORT/USER/PASSWORD pelo
provedor real (SendGrid/SES/etc.) sem mexer no código.
"""
from __future__ import annotations

import os
from urllib.parse import urljoin

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes
from django.utils.html import escape
from django.utils.http import urlsafe_base64_encode

from accounts.models import User


class EmailConfirmationTokenGenerator(PasswordResetTokenGenerator):
    """Token de confirmação de e-mail.

    Diferente do default_token_generator (que invalida ao fazer login,
    porque mistura `user.last_login` no hash), este gera/valida com base
    em `email_confirmed_at` — o token continua válido enquanto o e-mail
    não tiver sido confirmado e fica imediatamente inválido depois disso.
    """

    def _make_hash_value(self, user, timestamp):
        confirmed = user.email_confirmed_at.isoformat() if user.email_confirmed_at else ""
        return f"{user.pk}{user.password}{user.email}{confirmed}{timestamp}"


email_confirmation_token = EmailConfirmationTokenGenerator()


def _frontend_base() -> str:
    return (os.environ.get("FRONTEND_URL") or "http://localhost:3000").rstrip("/")


def build_confirmation_url(user: User) -> str:
    # A rota Next fica em app/(auth)/confirmar-email/[uidb64]/[token]; o grupo
    # (auth) não entra na URL, então o caminho público é /confirmar-email/...
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_confirmation_token.make_token(user)
    return f"{_frontend_base()}/confirmar-email/{uid}/{token}"


def send_confirmation_email(user: User) -> None:
    url = build_confirmation_url(user)
    name = (user.full_name or user.email).split(" ")[0] or "ola"

    subject = "Confirme seu e-mail no AegisHub"
    text_body = (
        f"Ola, {name}!\n\n"
        "Obrigado por se cadastrar no AegisHub. Para ativar seu acesso, "
        "confirme seu e-mail clicando no link abaixo (valido por 3 dias):\n\n"
        f"{url}\n\n"
        "Se voce nao criou essa conta, pode ignorar este e-mail.\n\n"
        "Equipe AegisHub"
    )
    safe_url = escape(url)
    html_body = (
        "<div style=\"font-family:Inter,system-ui,sans-serif;color:#111;line-height:1.5\">"
        f"<h2 style=\"margin:0 0 12px\">Ola, {escape(name)}!</h2>"
        "<p>Obrigado por se cadastrar no <strong>AegisHub</strong>. "
        "Para ativar seu acesso, confirme seu e-mail:</p>"
        f"<p><a href=\"{safe_url}\" "
        "style=\"display:inline-block;padding:10px 18px;background:#0b1220;"
        "color:#fff;text-decoration:none;border-radius:8px;font-weight:500\">"
        "Confirmar e-mail</a></p>"
        f"<p style=\"font-size:12px;color:#666\">Ou cole no navegador: <br>{safe_url}</p>"
        "<p style=\"font-size:12px;color:#666\">Link valido por 3 dias. "
        "Se voce nao criou essa conta, ignore este e-mail.</p>"
        "<p style=\"font-size:12px;color:#666\">Equipe AegisHub</p>"
        "</div>"
    )
    msg = EmailMultiAlternatives(subject, text_body, to=[user.email])
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)
