# Onboarding — Dev Junior no PentestHub

Bem-vindo. Este guia é o caminho mais curto entre "acabei de clonar o repo" e "consigo abrir um PR sem quebrar nada importante". Leia uma vez do começo ao fim antes de tocar em código.

> **Antes de tudo**, leia também: `README.md` (visão geral + comandos), `CLAUDE.md` (decisões e invariantes não negociáveis), `PENTESTHUB-ARQUITETURA.md` (especificação do produto). Quando este guia disser "ver §X", é o doc de arquitetura.

---

## 1. O que é o produto

PentestHub é um **marketplace B2B** que liga **empresas** que precisam de pentest a **pentesters** profissionais. Empresa publica proposta → pentester se candidata → empresa aceita → vira contrato → relatório cifrado é entregue → pagamento via escrow.

Há dois tipos de tenant:

- `COMPANY` — empresa contratante. Vê catálogo de pentesters, cria propostas.
- `INDIVIDUAL` — pentester. Cria perfil, vê feed de propostas, se candidata.

**Regra de ouro do produto:** *security is the product*. Vazar conteúdo de relatório, dados de empresa cliente ou e-mail de pentester é incidente que encerra o produto. Pense nisso antes de escrever qualquer código que toque autorização, criptografia, logs ou serializer.

---

## 2. Mapa do código (quem mora onde)

```
apps/api/                       # Django + DRF + uv
  pentesthub/                   # settings.py, urls.py, asgi.py, celery.py
  accounts/                     # User custom + MFA + register/login services
  tenants/                      # Tenant, Membership, middleware tenant-aware
  audit/                        # AuditLog append-only com hash chain
  pentesters/                   # PentesterProfile + Specialty + Certification
  proposals/                    # Proposal + máquina de estados
  applications/                 # Application (candidatura) + transições FOR UPDATE
  api/                          # views.py, serializers.py, urls.py, exceptions.py
  infra/                        # storage.py (S3/MinIO), kms.py, gateways/ (Pagar.me)
  fixtures/                     # specialties, certifications

apps/web/                       # Next.js 15 + pnpm
  app/(public)/                 # landing
  app/(auth)/                   # login (+ mfa), cadastro, confirmar-email/[uidb64]/[token]
  app/(app)/                    # admin/, app/{dashboard,pentesters,propostas,perfil,favoritos,minhas-propostas}
  app/api/proxy/[...path]/      # BFF: /api/proxy/* -> api:8000/api/v1/* (já implementado)
  components/                   # Button, Card, Field, Topbar, AppGuard...
  lib/                          # cn.ts, env.ts, store.ts, api.ts (client da API real; mock.ts foi removido)

packages/
  api-types/                    # tipos TS gerados do OpenAPI
  schemas/                      # Zod schemas compartilhados (formulários)

infra/docker/                   # Dockerfiles
docker-compose.yml              # postgres, redis, minio, mailhog, api, web
```

### A regra de fluxo no Django (não desvie disto)

```
HTTP request
   ↓
api/views.py            ← faz auth/role gate, chama serializer, chama service
   ↓
api/serializers.py      ← valida payload de entrada / projeta saída
   ↓
<contexto>/services.py  ← TODA mutação acontece aqui, em transação, com AuditLog
   ↓
<contexto>/models.py    ← ORM puro, sem regra de negócio
```

**Views nunca escrevem no ORM diretamente.** Quem violar essa regra leva o PR de volta. Existe `Model.objects` (tenant-aware) e `Model.objects_unsafe` (sem filtro, só para jobs admin auditados).

**Apps Django não importam models de outros apps.** Comunicação cross-context vai por service. (Ex.: `applications/services.py` recebe um `Proposal` já materializado, não importa nada de `proposals.models` — espera, importa sim hoje. Se você for refatorar, vale separar.)

---

## 3. Como rodar localmente

```bash
cp .env.example .env
docker compose up --build
# espere postgres/minio ficarem healthy
docker compose exec api uv run python manage.py migrate
docker compose exec api uv run python manage.py seed_demo
```

Onde olhar:

| URL | O que é |
|-----|---------|
| http://localhost:3000 | Frontend Next.js |
| http://localhost:8000/api/docs | Swagger UI (use isto para testar a API) |
| http://localhost:8000/admin | Django admin |
| http://localhost:8025 | MailHog — captura todo e-mail enviado em dev |
| http://localhost:9001 | MinIO console (`minioadmin/minioadmin`) |

Primeiro acesso (não há mais usuários de demo — `seed_demo` só carrega catálogos):

- Crie um admin: `ADMIN_EMAIL=... ADMIN_PASSWORD=... docker compose exec api uv run python manage.py create_admin` (já nasce com e-mail confirmado).
- Ou registre empresa/pentester em `/cadastro` e **confirme o e-mail** clicando no link que aparece no MailHog (http://localhost:8025) — sem isso o login retorna `email_not_confirmed`.

---

## 4. Autenticação e autorização — o que você PRECISA saber

### Como o login funciona

1. Frontend faz `GET /api/v1/auth/csrf` → recebe cookie `pentesthub_csrf`.
2. `POST /api/v1/auth/login` com email+senha + header `X-CSRFToken`.
3. Se o e-mail não foi confirmado: API retorna `401 {"detail": "email_not_confirmed"}`. Cadastro **não** faz auto-login — o usuário precisa clicar no link de confirmação (`/confirmar-email/...`, capturado pelo MailHog em dev) que dispara `POST /api/v1/auth/email/confirm/<uidb64>/<token>`. Admins via `create_admin` já nascem confirmados.
4. Se MFA habilitado: API retorna `202 {"mfa_required": true}` e guarda `pending_mfa_user` + `pending_mfa_at` na sessão.
5. Frontend pede TOTP (ou backup code), faz `POST /api/v1/auth/login/mfa`.
6. API valida com `pyotp.TOTP(...)` ou, se falhar, itera os hashes em `user.mfa_backup_codes` via `check_password` (constant-time). Se for backup, **remove** o hash da lista (one-time).
7. `pending_mfa` expira em **300 segundos** — passou disso, recomeça do passo 2.

Toda essa lógica vive em `apps/api/accounts/services.py`. Se for adicionar fator novo (e-mail OTP, WebAuthn), **escreva no service**, não na view.

### Quem pode ver o quê

Hoje os gates do marketplace são funções inline no topo de `apps/api/api/views.py`:

```python
_has_company_membership(user)     # True se user tem Membership(tenant.type=COMPANY)
_pentester_profile_for(user)      # retorna PentesterProfile ou None
_is_member_of(user, tenant)       # True se user pertence a este tenant específico
```

E são aplicados assim:

| Endpoint | Quem libera |
|---|---|
| `GET /pentesters` | só company |
| `GET /pentesters/{id}` | company OU dono do tenant |
| `GET /proposals` (sem `?mine=1`) | só pentester com `pentester_profile` |
| `GET /proposals` (`?mine=1`) | qualquer user, devolve só os tenants do user |
| `GET /proposals/{id}` PUBLISHED | pentester OU dono — se nem um nem outro, **404** (não 403) |
| `GET /proposals/{id}` outros | só dono — senão **404** |

> **Por que 404 e não 403?** Porque 403 confirma que o recurso existe. Para conteúdo privado, queremos negar a existência. Esta é a invariante; nunca mude para 403 sem aprovação.

**Dívida técnica conhecida:** estes helpers deveriam virar `IsCompany` / `IsPentester` (DRF Permission classes). Quando isso for feito, **escreva os testes primeiro** — a regressão aqui é vazamento de PII.

### Como adicionar um endpoint novo (checklist)

1. Decidir o gate. Default já é `IsAuthenticated` (vem de `REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES']`). Se precisa de role, **chame os helpers** ou adicione um check explícito. Nunca, jamais, ponha `permission_classes = [AllowAny]` em endpoint que retorna dado de domínio sem autorização explícita do code review.
2. Criar serializer em `api/serializers.py`. **Sempre** declare `max_length` em `CharField`/`TextField` — DoS por payload grande é trivial sem isso.
3. Criar service em `<contexto>/services.py` se houver mutação. Sempre `@transaction.atomic` + `record_event(...)` no mesmo bloco.
4. Adicionar URL em `api/urls.py`.
5. Regenerar tipos TS:
   ```bash
   docker compose exec api uv run python manage.py spectacular --file schema.yml
   cp apps/api/schema.yml packages/api-types/schema.yml
   pnpm --filter @pentesthub/api-types generate
   ```
6. Escrever teste do gate: anônimo → 401/403; role errada → 403; role certa → 200.

---

## 5. Convenções que valem ouro

- **IDs públicos são UUID (`public_id`).** Nunca exponha PK numérica em URL ou response. Se você ver `/proposals/123/`, isso é bug.
- **Dinheiro é `NUMERIC(14,2)`** com `currency` explícita. Nunca `float`.
- **`audit_log` é append-only com hash chain — enforced no Postgres.** Triggers `BEFORE UPDATE/DELETE/TRUNCATE` estouram exception, e `BEFORE INSERT` recomputa `prev_hash`/`self_hash` server-side (Python só envia placeholder). Se você precisar "desfazer", grave evento contrário, não apague. Validar a cadeia: `from audit.services import verify_chain; verify_chain()`.
- **RLS está aplicada em `proposals` e `applications`.** Em dev a app conecta como owner do banco e bypassa as policies; em prod o role é `pentesthub_app` e o RLS bate. Antes de assumir que algo "está protegido por RLS", rode o smoke test (`pytest tests/test_db_hardening.py`) — ele usa `SET LOCAL ROLE pentesthub_app` pra exercitar enforcement.
- **Senhas em Argon2id**, mínimo 12 chars (settings já cuida).
- **Cookies**: `httpOnly`, `Secure` em prod, `SameSite=Lax`.
- **CSRF**: header `X-CSRFToken` obrigatório em POST/PATCH/DELETE.
- **Sessão**, não JWT em localStorage. JWT só para integrações server-to-server.

---

## 6. Armadilhas frequentes (cole na parede)

1. **"Vou só remover o `permission_classes = [AllowAny]`"** — verifique se o default de `DEFAULT_PERMISSION_CLASSES` cobre o caso. Hoje é `IsAuthenticated`, então remover `AllowAny` é seguro, mas adicionar role check explícito ainda é necessário.

2. **"Vou usar `Model.objects.all()` direto na view"** — não. (a) Quebra a regra "view não toca ORM"; (b) bypassa o filtro tenant-aware. Use service.

3. **"O frontend ainda usa mock"** — **não usa mais.** O BFF `app/api/proxy/[...path]/route.ts` já existe e reescreve `/api/proxy/*` → `api:8000/api/v1/*`, repassando cookies de sessão; `apps/web/lib/api.ts` (TanStack Query) é o único client e `lib/mock.ts` foi removido. O que ainda falta: CSP `connect-src 'self'` e HSTS no `next.config.ts`.

4. **"As rotas de catálogo ainda são públicas no frontend"** — não são mais. `/app/pentesters` e `/app/propostas` vivem em `app/(app)/app/...` atrás do `AppGuard`; `app/(public)/` só tem a landing. Cuidado se você for criar nova página: se for de marketplace, ela mora em `(app)/`, não em `(public)/`.

5. **"Vou cifrar relatório aqui no backend"** — não. Cifragem de relatório/anexo é **client-side via WebCrypto** antes do PUT presigned no S3. Backend só armazena ciphertext. KEK fica no KMS.

6. **`mfa_secret` está em claro no DB** — sim, é dívida. **Não use o segredo TOTP para nada além de TOTP**, e quando for cifrar, faça envelope encryption igual aos relatórios.

7. **"Vou aceitar `description` sem max_length"** — DoS por payload de 100 MB. Sempre `max_length`.

8. **Webhook do PSP** — nunca compare HMAC com `==`. Use `hmac.compare_digest`. Sempre confira `event_id` em `webhook_events` (replay protection). Tolerância de timestamp ±5min.

9. **Backup codes do MFA** — mostre em claro **uma única vez** ao usuário (na ativação). O DB só guarda hash. Não loga, não envia por e-mail, não devolve em GET.

10. **"Vou rodar `DELETE FROM audit_auditlog` pra limpar dev"** — não vai dar. Trigger Postgres bloqueia. Pra zerar o banco em dev, use `docker compose down -v` (apaga o volume inteiro) e rode `migrate` + `seed_demo` de novo.

11. **"Mexi nos models, vou esquecer de gerar migration"** — sempre rode `makemigrations` + faça commit do arquivo gerado. Antes de PR, `manage.py migrate --check` no CI vai te chamar. Migrations escritas à mão (RunSQL) precisam de `reverse_sql` para rollback ser possível.

12. **"Vou alterar `users.email` pra ser case-sensitive de novo"** — é `CITEXT` por design. Nunca use `iexact` em queries de email; só compare igual.

---

## 7. Comandos do dia a dia

```bash
# subir tudo
docker compose up

# rodar migrations / criar nova
docker compose exec api uv run python manage.py migrate
docker compose exec api uv run python manage.py makemigrations <app>

# popular dados demo
docker compose exec api uv run python manage.py seed_demo

# abrir shell Django
docker compose exec api uv run python manage.py shell

# rodar testes (smoke do banco já existe; gates HTTP ainda são dívida)
docker compose exec api uv run pytest tests/test_db_hardening.py -v

# regenerar dump do schema (após mudar migrations)
docker compose exec postgres pg_dump -U pentesthub --schema-only \
  --no-owner --no-privileges pentesthub > infra/db/schema.sql

# regenerar OpenAPI + tipos TS
docker compose exec api uv run python manage.py spectacular --file schema.yml
cp apps/api/schema.yml packages/api-types/schema.yml
pnpm --filter @pentesthub/api-types generate

# rodar lint frontend
pnpm --filter @pentesthub/web lint

# rodar dev frontend isolado
pnpm --filter @pentesthub/web dev
```

Há um `Taskfile.yml` na raiz com atalhos. Se você tem `task` instalado, prefira ele.

---

## 8. Como abrir um PR sem dor

1. **Branch nomeada por contexto + objetivo:** `harden/auth-on-pentester-list`, `feat/email-otp`, `fix/backup-code-persistence`.
2. **PR pequeno.** Se você abriu mais de 600 linhas alteradas, divida.
3. **Cheque a invariante.** `CLAUDE.md` lista as não-negociáveis. Se seu PR quebra alguma, abra ADR primeiro.
4. **Migration tem que rodar para frente E para trás.** Se seu campo é destrutivo, faça expand/contract em duas releases (ver `CLAUDE.md`).
5. **Atualize `CLAUDE.md`** se você mudou comportamento de invariante. Atualize `PENTESTHUB-ARQUITETURA.md` se você mudou contrato de endpoint ou esquema de dado. Atualize **este onboarding** se você mudou regra de fluxo, comando do dia a dia ou armadilha conhecida.
6. **Nunca commite `.env`**, chave PEM, dump de produção, screenshot com PII de cliente.
7. **Em endpoint sensível, escreva o teste primeiro.** Sem teste de regressão, autorização não merge.

---

## 9. Quando você não sabe o que fazer

Em ordem:

1. Procure no `PENTESTHUB-ARQUITETURA.md` (use `grep -n`).
2. Procure no `CLAUDE.md`.
3. Veja se há `service.py` correspondente — provavelmente a regra está lá.
4. Pergunte ao tech lead. **Não chuta** em código que toca autorização, criptografia ou pagamento.

---

## 10. Glossário rápido

- **Tenant** — empresa OU pentester (cada um é um tenant). Tudo em domain tem `tenant_id`.
- **Membership** — relação user ↔ tenant com `role` (OWNER, MEMBER, BILLING).
- **Pentester profile** — perfil público do tenant `INDIVIDUAL` no catálogo.
- **Proposal** — vaga aberta por empresa. Estados: DRAFT → PUBLISHED → CLOSED → ARCHIVED.
- **Application** — candidatura de pentester a uma proposal. Estados: PENDING → SHORTLISTED → ACCEPTED/REJECTED/WITHDRAWN.
- **Contract** — gerado quando uma application vira ACCEPTED. (Ainda não implementado em código.)
- **Audit log** — tabela append-only com hash chain. Toda mutação relevante grava evento.
- **BFF** — *backend for frontend*. Rotas `/api/proxy/*` no Next (`app/api/proxy/[...path]/route.ts`) que falam com Django. Browser nunca fala direto com a API. (Já implementado.)
- **DEK / KEK** — Data Encryption Key (cifra payload) / Key Encryption Key (cifra a DEK, fica no KMS).
- **PSP** — *payment service provider* (Pagar.me, Asaas).

---

Boas-vindas e seja desconfiado de qualquer código que dispense autorização "por enquanto".
