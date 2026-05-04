# PentestHub — Marketplace B2B de pentest

Monorepo com **Django 5** (backend) e **Next.js 15** (frontend), seguindo
`PENTESTHUB-ARQUITETURA.md` e as decisões registradas em `CLAUDE.md`.
Esta release entrega **Fase 0 + Fase 1**: cadastro, autenticação (sessão
httpOnly + CSRF), MFA TOTP com backup codes one-time, catálogos do
marketplace **fechados atrás de auth + role**, criação e candidatura de
propostas, painel autenticado para empresa e pentester.

> Onboarding de dev novo? Vá direto pra [`docs/ONBOARDING.md`](docs/ONBOARDING.md).

> Pagamento (Pagar.me), chat real, contratos e relatórios cifrados ficam
> para a Fase 2. O adapter `infra/gateways/fake.py` já reserva o lugar.

---

## Como rodar localmente

Pré-requisitos: Docker + Docker Compose. Tudo o resto roda em containers.

```bash
cp .env.example .env
docker compose up --build
# espere postgres/minio ficarem healthy; api roda migrations e fixtures
# depois popule dados de demo:
docker compose exec api uv run python manage.py seed_demo
```

Endpoints:

| URL                          | O que é                                |
|-----------------------------|----------------------------------------|
| http://localhost:3000       | Next.js (UI pública e autenticada)     |
| http://localhost:8000/api/v1| Django REST API                         |
| http://localhost:8000/api/docs | Swagger UI (drf-spectacular)         |
| http://localhost:8000/api/schema | OpenAPI 3.1 (yaml)                 |
| http://localhost:8000/admin  | Django admin                           |
| http://localhost:8025       | MailHog (e-mails capturados)           |
| http://localhost:9001       | MinIO console (`minioadmin/minioadmin`) |

Logins de demo (após `seed_demo`):

- `ana@acme.com.br` / `ana-demo-pass-2026` (empresa)
- `bia@bancodigital.com.br` / `bia-demo-pass-2026` (empresa)
- `carlos@solo.com` / `carlos-demo-pass-2026` (pentester)
- `daniel@solo.com`, `eva@solo.com`, `fred@solo.com` (pentesters)

---

## Comandos do dia a dia

Há um `Taskfile.yml` na raiz. Sem `task`, use docker compose direto:

```bash
docker compose exec api uv run python manage.py migrate
docker compose exec api uv run python manage.py makemigrations
docker compose exec api uv run python manage.py createsuperuser
docker compose exec api uv run pytest
docker compose exec api uv run python manage.py spectacular --file schema.yml
```

Regenerar tipos TS após mudar a API:

```bash
docker compose exec api uv run python manage.py spectacular --file schema.yml
cp apps/api/schema.yml packages/api-types/schema.yml
pnpm --filter @pentesthub/api-types generate
```

---

## Estrutura

```
apps/
  api/                       # Django (uv)
    pentesthub/              # settings, urls, asgi, wsgi, celery
    accounts/                # User custom + MFA + management command seed_demo
    tenants/                 # Tenant, Membership, middleware, manager tenant-aware
    audit/                   # AuditLog append-only com hash chain
    pentesters/              # PentesterProfile, Specialty, Certification
    proposals/               # Proposal + máquina de estados básica
    applications/            # Application com unique constraint
    api/                     # DRF: serializers, views, urls, exception handler
    infra/                   # kms (LocalKMS dev), storage (MinIO/S3), gateways/
    fixtures/                # specialties, certifications
    pyproject.toml           # uv + dev deps
    manage.py
  web/                       # Next.js 15 (pnpm)
    app/(public)/            # landing, /pentesters, /propostas (SSR)
    app/(auth)/              # login, login/mfa, cadastro, recuperar-senha
    app/(app)/               # dashboard, pentesters, propostas, candidaturas, perfil
    app/api/proxy/[...path]  # BFF: encaminha browser -> Django interno
    components/              # Button, Card, Pill, Avatar, Field, Markdown, ...
    lib/                     # api (server), client-api, session, format, types, env, cn
    styles/                  # tokens.css (§7.5), globals.css

packages/
  api-types/                 # tipos TS gerados de OpenAPI (placeholder antes da geração)
  schemas/                   # Zod schemas compartilhados (forms <-> domain)

infra/
  docker/                    # api.Dockerfile (uv), web.Dockerfile (pnpm, standalone)

docker-compose.yml           # postgres, redis, minio, mailhog, api, web
.env.example                 # template de variáveis
Taskfile.yml                 # atalhos para fluxos comuns
```

---

## Verificação end-to-end

Smoke test rápido (após `docker compose up` e `seed_demo`):

```bash
# 1. API responde
curl -s http://localhost:8000/healthz

# 2. Catálogo agora exige auth + role: anônimo recebe 403
curl -si http://localhost:8000/api/v1/pentesters | head -1
# HTTP/1.1 403 Forbidden  (only_companies_can_browse_pentesters)

# 3. Login como empresa + sessão
curl -s -c /tmp/c -X GET http://localhost:8000/api/v1/auth/csrf
CSRF=$(grep pentesthub_csrf /tmp/c | awk '{print $7}')
curl -s -b /tmp/c -c /tmp/c -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" -H "X-CSRFToken: $CSRF" \
  -d '{"email":"ana@acme.com.br","password":"ana-demo-pass-2026"}'

curl -s -b /tmp/c http://localhost:8000/api/v1/auth/me | jq

# 4. Já logada como empresa, agora vê pentesters
curl -s -b /tmp/c http://localhost:8000/api/v1/pentesters | jq '.[0].headline'

# 5. Logue como pentester para ver o feed de propostas (sem ?mine=1)
curl -s -b /tmp/c2 http://localhost:8000/api/v1/proposals | jq '.[0].title'
```

Fluxo manual no navegador (após o BFF/integração real existir — hoje o frontend usa mock):

1. Abra `http://localhost:3000` → landing pública.
2. `/login` como `ana@acme.com.br` (empresa) → cai em `/app`.
3. `/app/pentesters` → ver catálogo (só visível pra empresa).
4. **Nova proposta** → preencha → publique.
5. Logout. Logue como `carlos@solo.com` (pentester).
6. `/app/propostas` → ver feed (só pentester vê). Abra a proposta → **Candidatar-se**.
7. Logout. Logue como `ana@acme.com.br` → veja a candidatura → **Shortlist** / **Aceitar** / **Rejeitar**.

> ⚠️ Anônimo nunca vê dados do marketplace. As rotas `/pentesters` e `/propostas` no `(public)/` precisam virar `(app)/` ou redirecionar para `/login` — ajuste pendente no frontend (ver `docs/ONBOARDING.md`).

---

## Princípios mantidos do doc

- Cookie de sessão `httpOnly`+`Secure`+`SameSite=Lax`. Browser fala com Next; Next fala com Django via BFF (`/api/proxy/*`).
- Senhas em `argon2id` (PASSWORD_HASHERS), mínimo 12 chars, lockout via `django-axes`.
- Múltiplas camadas de auth: DRF `IsAuthenticated`, checks adicionais em service e (em produção) RLS no Postgres. RLS está habilitada na intenção (managers tenant-aware), mas as policies SQL serão ativadas com migration dedicada na próxima release.
- `audit_log` append-only com hash chain (`SHA256(prev_hash || canonical_json(payload))`). Verificação via `audit.services.verify_chain`.
- IDs públicos sempre UUID; PK numérica nunca exposta.
- Money em `NUMERIC(14,2)`; nunca float.
- Views nunca tocam o ORM para escrever. Toda mutação passa pelos `services` com transação + audit no mesmo bloco.
- Erros DRF formatados como `application/problem+json` (RFC 7807).

---

## O que **ainda não** está nesta release (Fase 2+)

- `contracts/`, `messaging/`, `reports/`, `payments/`
- WebCrypto + presigned upload S3 (módulos `infra/kms.py` e `infra/storage.py` já prontos)
- Webhooks Pagar.me (`infra/gateways/fake.py` já implementa o protocolo)
- Verificação humana de certificações (admin queue)
- Disputas, ratings, NFS-e
- RLS policies SQL ativadas (managers já filtram por tenant; falta o `ENABLE ROW LEVEL SECURITY` por migration)
- Testes Playwright e suite parametrizada de autorização

A arquitetura completa está em `PENTESTHUB-ARQUITETURA.md`. As decisões técnicas que diferem do doc original (Next.js no lugar de Vite, BFF, etc.) estão em `CLAUDE.md`.
