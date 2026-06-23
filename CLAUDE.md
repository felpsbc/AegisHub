# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado do repositório

Fase 0 + Fase 1 + entrega 1.0: cadastro, login com sessão httpOnly + CSRF, **confirmação de e-mail obrigatória antes do acesso**, **redefinição de senha por e-mail** (`/esqueci-senha` → e-mail → `/redefinir-senha/<uidb64>/<token>`), MFA TOTP (com backup codes persistidos), painel autenticado para empresa e pentester, criação/publicação/candidatura de propostas, favoritos (`apps/api/favorites/`) e **edição do perfil público da empresa** (`CompanyProfile`). O `apps/api` (Django + DRF + uv) e o `apps/web` (Next.js 15 + pnpm) rodam via `docker compose up`. **O BFF `app/api/proxy/[...path]` já existe e o frontend consome a API real** — o antigo `apps/web/lib/mock.ts` foi removido. Toda chamada passa por `apps/web/lib/api.ts` → `/api/proxy/*` → `api:8000/api/v1/*`, então os gates de autorização do backend já valem para o browser. Veja o `README.md` para comandos do dia a dia e `docs/ONBOARDING.md` para o passo-a-passo do dev novo.

## Fonte canônica

`PENTESTHUB-ARQUITETURA.md` é a referência primária para qualquer decisão de produto, domínio, segurança e infraestrutura. Sempre leia a seção relevante antes de propor mudanças. Estrutura do doc:

- §1–2: visão de produto e ADRs (decisões arquiteturais já tomadas)
- §3: bounded contexts e máquina de estados de `Contract`
- §4: camadas internas do Django (`api/views → api/serializers → domain/services → domain/models`)
- §5: DDL PostgreSQL completo, índices, particionamento, RLS
- §6: contratos REST `/api/v1/*`
- §7: estrutura do frontend (originalmente React+Vite — ver override abaixo)
- §8: modelo de ameaças, criptografia, cabeçalhos, defesas — leitura obrigatória
- §9: estratégia de multi-tenancy em três camadas
- §10–11: pagamentos/escrow e observabilidade
- §12–13: infraestrutura AWS e CI/CD
- §14: LGPD, NDA, fiscal
- §15–16: roadmap e riscos
- Apêndice B: decisões pendentes

## Stack alvo (override do doc)

O doc original prevê **React + Vite** (ADR-007). Decisão posterior trocou o frontend por **Next.js**, com 14 escolhas técnicas tomadas em sessão de brainstorm. Em caso de conflito, este bloco prevalece sobre §7 e parte do §8.5/§12 do doc.

**Backend (`apps/api`):** Django 5 + DRF + drf-spectacular (OpenAPI 3.1) + Celery + Redis + PostgreSQL 16. Gerenciador: `uv`.

**Frontend (`apps/web`):** Next.js 15 (App Router, RSC, Server Actions) + TypeScript estrito + Tailwind + TanStack Query (client) + Zustand (UI ephemera) + React Hook Form + Zod. Gerenciador: `pnpm`.

**Comunicação Next ↔ Django:** BFF leve em `app/api/proxy/*`. Browser nunca fala direto com `api.pentesthub.com.br`; cookie `httpOnly` vive só no domínio do Next. CSP `connect-src 'self'`.

**Repo:** monorepo com `apps/web`, `apps/api`, `packages/api-types` (gerado via `openapi-typescript`), `packages/schemas` (Zod compartilhado).

**Outros:** Pagar.me primário com Asaas via adapter (`infra/gateways/`); chat por polling 5s na fase 1 (Channels só na fase 5); upload cifrado via **WebCrypto no cliente** com DEK por contrato; busca v1 com `tsvector`+`pg_trgm`; deploy ECS Fargate atrás de CloudFront; CI em GitHub Actions; observabilidade OTel → Prometheus+Loki+Tempo+Grafana + Sentry.

## Invariantes arquiteturais (não negociáveis sem ADR novo)

- **Security is the product.** Falha de autorização ou vazamento de relatório encerra o produto. Defesa em profundidade: policy na view + service + RLS no Postgres.
- **Views nunca fazem escrita no ORM diretamente.** Toda mutação passa por `domain/services`, em transação, com `AuditLog` e side effects (Celery) na mesma unidade.
- **Toda tabela de domínio carrega `tenant_id`.** Conexão executa `SET LOCAL app.tenant_id = :id` por request via `TenantMiddleware` (envolve a request em `transaction.atomic()` pra o GUC ter escopo). RLS está aplicada em `proposals_proposal` e `applications_application` com `NULLIF(current_setting(...), '')::BIGINT`. Em dev, owner Postgres bypassa RLS — para enforce real, conectar como `pentesthub_app` (role criada na migration `accounts/0002_postgres_setup`). `Model.objects_unsafe` previsto pra jobs admin auditados; ainda não em uso.
- **Apps Django não importam models de outros apps.** Comunicação cross-context é via `services`. Code review rejeita imports cruzados.
- **IDs públicos são UUID (`public_id`).** Nunca expor PK numérica na API ou na URL.
- **Dinheiro é `NUMERIC(14,2)`** com `currency` explícita. Nunca float.
- **Envelope encryption por contrato.** `Message`, `Report` e anexos são cifrados com a DEK do contrato (AES-256-GCM); a DEK é cifrada com KEK no KMS. Admin **não** vê conteúdo. No frontend Next.js a cifragem ocorre no cliente via WebCrypto antes do PUT presigned no S3.
- **`audit_log` é append-only com hash chain.** `self_hash = SHA256(prev_hash || canonical_json(payload))`. Job diário valida a cadeia; quebra é incidente sev0.
- **Transições de estado de `Contract` e `Application` usam `SELECT … FOR UPDATE`** dentro de transação para evitar race condition.
- **Webhooks de PSP:** HMAC-SHA256 em tempo constante, `event_id` único em `webhook_events` (replay protection), tolerância de timestamp ±5min, IP allowlist do PSP.
- **Sessão Django, não JWT em localStorage.** Cookie `httpOnly`+`Secure`+`SameSite=Lax`. JWT só para integrações server-to-server.
- **MFA TOTP obrigatório para admins e empresas**; recomendado para pentesters. Backup codes são gerados na ativação, exibidos UMA vez em claro e persistidos como hash (`make_password`); `verify_mfa` consome o hash one-time e remove da lista.
- **`pending_mfa_user` da sessão tem TTL de 300s** (`PENDING_MFA_TTL_SECONDS` em `accounts/services.py`). Expirado → `LoginError("pending_mfa_expired")` e o usuário recomeça do `/auth/login`.
- **Confirmação de e-mail obrigatória para login.** `login_with_password` rejeita com `LoginError("email_not_confirmed")` enquanto `user.email_confirmed_at is None` (gate antes do MFA). O token é gerado pelo `EmailConfirmationTokenGenerator` (`accounts/email.py`), que mistura `email_confirmed_at` no hash — invalida sozinho assim que o e-mail é confirmado. O link aponta para a rota Next `/confirmar-email/<uidb64>/<token>` (o grupo `(auth)` **não** entra na URL — não use `/auth/...`), que dispara `POST /auth/email/confirm/<uidb64>/<token>`. No cadastro **não há auto-login**: o frontend mostra a tela "Confirme seu e-mail" com reenvio. Admins criados via `create_admin`/`createsuperuser` já entram com `email_confirmed_at` setado. Em dev todo e-mail é capturado pelo **MailHog** (inbox em http://localhost:8025), nunca chega a caixa real.
- **Redefinição de senha por e-mail.** `POST /auth/password/reset` (e-mail) sempre responde **202**, mesmo para e-mail inexistente/inativo — nunca vira oráculo de enumeração (`request_password_reset` em `accounts/services.py`). `POST /auth/password/reset/confirm` (`uidb64`, `token`, `new_password`) valida o token via `password_reset_token` (= `default_token_generator`, que mistura `user.password` no hash → **uso único**: trocar a senha invalida o link) e aplica os `AUTH_PASSWORD_VALIDATORS` na nova senha. Token expira em `PASSWORD_RESET_TIMEOUT` (**1h**, settings). Link aponta para a rota Next `/redefinir-senha/<uidb64>/<token>` (grupo `(auth)` não entra na URL). Erro de token inválido/expirado → `LoginError("invalid_reset")` → 400. E-mail capturado pelo MailHog em dev.
- **Validação de senha centralizada.** Cadastro (`RegisterSerializer`) e redefinição (`PasswordResetConfirmSerializer`) rodam `django.contrib.auth.password_validation.validate_password` (min 12, não-comum, não-numérica). `create_user`/`set_password` sozinhos **não** validam — a checagem mora no serializer.
- **Migrations destrutivas seguem expand/contract em duas releases.** `--check` antes do switch de tráfego.
- **Catálogos do marketplace exigem auth + role.** ~~Bypass público~~ derrubado em sessão de hardening:
  - `GET /pentesters` e `GET /pentesters/{id}` exigem Membership `tenant.type=COMPANY` (ou ser dono do tenant para o detail).
  - `GET /proposals` (sem `?mine=1`) exige Membership `INDIVIDUAL` com `pentester_profile`.
  - `GET /proposals/{id}` PUBLISHED libera para pentester ou dono do tenant; non-PUBLISHED só dono. Retorna **404** (não 403) para não vazar existência.
  - Anônimo nunca acessa dados de marketplace; só landing/marketing/`/auth/*`/`/specialties`. Os gates moram em `apps/api/api/views.py` (helpers `_has_company_membership`, `_pentester_profile_for`, `_is_member_of`). Ainda não foram extraídos para DRF Permission classes — dívida técnica anotada em `docs/ONBOARDING.md`.

## Estrutura do repo (estado atual + alvo)

```
pentesthub/
├── apps/api/         # Django (Fase 1): pentesthub/, accounts/, tenants/, pentesters/,
│                     # proposals/, applications/, favorites/, audit/, api/, infra/{gateways,kms,storage}
│                     # Fase 2+: contracts/, payments/, messaging/, reports/, admin_ops/, notifications/
├── apps/web/         # Next.js App Router: app/{(public),(auth),(app)}/, app/api/proxy/[...path] (BFF),
│                     # components/, lib/ (api.ts = client da API), styles/. Pendente: features/, hooks/
├── packages/api-types/    # gerado via openapi-typescript (já existe; gerar após `manage.py spectacular`)
├── packages/schemas/      # Zod schemas compartilhados
├── infra/docker/          # api.Dockerfile, web.Dockerfile (Fase 2: terraform/, compose extra)
└── .github/workflows/     # alvo Fase 2: ci-api, ci-web, contract (diff openapi), security, deploy-*
```

Comandos disponíveis: `Taskfile.yml` (preferir `task <alvo>` se você tem `task` instalado) e `Makefile` espelham os mesmos atalhos (`up`, `seed`, `api-shell`, `api-migrate`, `api-test`, `api-schema`, `web-gen-types`). Pytest, ESLint e gerador de tipos já existem — confira o manifest correspondente (`apps/api/pyproject.toml`, `apps/web/package.json`, `package.json` da raiz) antes de inventar comando novo.

## Dívidas técnicas conhecidas (Fase 2)

Mantenha esta lista atualizada — itens aqui são candidatos naturais a próximos PRs:

- **Confirmação de e-mail** já é exigida no login (ver invariante). Falta o **2FA por e-mail** como segundo fator (código por e-mail no login), distinto da confirmação — ainda não implementado.
- **E-mail transacional é assíncrono via Celery** (`accounts/tasks.py`): `register_account`/`resend_confirmation`/`request_password_reset` enfileiram com `transaction.on_commit(lambda: task.delay(user.pk))` — **on_commit é obrigatório** porque o `TenantMiddleware` envolve a request em `transaction.atomic()` (senão o worker buscaria um usuário ainda não commitado). Serviço `worker` no `docker-compose.yml` (`celery -A pentesthub worker`). Sob pytest, `RUNNING_TESTS` em settings liga `CELERY_TASK_ALWAYS_EAGER` (o alias interno da conf do Celery impede flipar em runtime), e os testes usam `django_capture_on_commit_callbacks`. **Resolve** a dívida de e-mail síncrono.
- **DRF Permission classes** (`IsCompany`, `IsPentester`, `IsAdmin`) não existem; gates são funções inline em `views.py` (`_has_company_membership`, `_pentester_profile_for`, `_is_admin`) + base `_AdminView`. Extrair para classes Permission é dívida aberta.
- **`mfa_secret` cifrado com Fernet** (`accounts/crypto.py`, chave `MFA_ENCRYPTION_KEY`) — **resolve** a dívida de "segredo em claro". Falta só migrar a chave para envelope KMS (mesmo padrão futuro de `Message`/`Report`).
- **Rate-limit dedicado nos endpoints de auth** (`ScopedRateThrottle`): `login` 10/min, `mfa` 10/min, `register` 10/min, `password_reset` 5/min — atachados via `throttle_scope` em `views.py`, somados ao lockout do `django-axes`. Cobertura em `tests/test_throttle.py`. **Resolve** a dívida de throttle por endpoint.
- **CI no GitHub Actions** (`.github/workflows/ci.yml`): job `api` (Postgres+Redis, `makemigrations --check`, `pytest`) e job `web` (typecheck + `next build`). Roda em push/PR pra `main`.
- **Painel admin (`/admin`)** já é funcional: stats, listar/desativar usuários, listar/excluir propostas via `/api/v1/admin/*` (base `_AdminView`, gate `_is_admin`, ações com `AuditLog`). 3 camadas: `middleware.ts` (sessão) → `admin/layout.tsx` (role) → 403 no backend. Cobertura em `tests/test_admin_endpoints.py`. **Não** expõe grant/revoke de admin nem exclusão de usuário (usar Django admin / `create_admin`).
- **Cobertura de testes de gate HTTP** existe para auth/admin (`test_register_flow.py`, `test_password_reset.py`, `test_admin_endpoints.py`), mas os gates de **marketplace** (`/pentesters`, `/proposals`) ainda não têm regressão — adicionar antes de mexer neles.
- **Hardening de produção já aplicado** (não mexer sem motivo): `SECRET_KEY`/`ALLOWED_HOSTS`/chaves S3·email·PSP·MFA são `required=not DEBUG`; Django traz `SECURE_SSL_REDIRECT`/`HSTS`/`NOSNIFF`/`X_FRAME_OPTIONS=DENY`/`SECURE_PROXY_SSL_HEADER`/COOP guardados por `DEBUG`; `next.config.ts` traz CSP completa + HSTS + headers. Itens antigos "Sem CSP/HSTS" e "SECRET_KEY default" da dívida **foram resolvidos**.
- **RLS não enforce em dev**: as policies estão aplicadas em `proposals_proposal` e `applications_application` (ver migrations `0003_rls`/`0002_rls`), mas o owner Postgres bypassa. Em prod, setar `DJANGO_DB_USER=pentesthub_app` (role criada na migration `accounts/0002_postgres_setup`) e a app passa a estar sujeita ao RLS. Smoke test usa `SET LOCAL ROLE pentesthub_app` pra provar que as policies bloqueiam.
- **`audit_log` não particionado**. Tabela única hoje. Em escala (>10M linhas) virar `PARTITION BY RANGE (occurred_at)` com job mensal pra criar próxima partição. Precisa ajustar PK pra incluir `occurred_at`.
- **Aplicação ainda conecta como owner em dev**, então RLS é teatro local. Quem montar staging precisa lembrar de passar `DJANGO_DB_USER=pentesthub_app`.
- **Sem job de `verify_chain` periódico** — função existe (`audit.services.verify_chain`), falta agendar via Celery beat e alertar sev0 em quebra.
