# AegisHub — Marketplace B2B de pentest

Monorepo com **Django 5** (backend) e **Next.js 15** (frontend), seguindo
`PENTESTHUB-ARQUITETURA.md` e as decisões registradas em `CLAUDE.md`.
Esta release entrega **Fase 0 + Fase 1**: cadastro, autenticação (sessão
httpOnly + CSRF), MFA TOTP com backup codes one-time, catálogos do
marketplace **fechados atrás de auth + role**, criação e candidatura de
propostas, painel autenticado para empresa e pentester.

> Onboarding de dev novo? Vá direto pra [`docs/ONBOARDING.md`](docs/ONBOARDING.md).

