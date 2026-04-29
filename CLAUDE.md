# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado do repositório

Pré-implementação. O único arquivo é `PENTESTHUB-ARQUITETURA.md` (~52 KB) — documento de arquitetura/segurança do produto **PentestHub**, marketplace B2B de pentest. Não existe código, build, testes, lint nem dependências ainda. Não invente comandos que não existem; quando for implementar, siga as decisões da seção "Stack alvo" abaixo e do próprio documento.

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
- **Toda tabela de domínio carrega `tenant_id` + RLS habilitada.** Conexão executa `SET LOCAL app.tenant_id = :id` por request. Há `Model.objects` (tenant-aware) e `Model.objects_unsafe` (apenas jobs admin auditados).
- **Apps Django não importam models de outros apps.** Comunicação cross-context é via `services`. Code review rejeita imports cruzados.
- **IDs públicos são UUID (`public_id`).** Nunca expor PK numérica na API ou na URL.
- **Dinheiro é `NUMERIC(14,2)`** com `currency` explícita. Nunca float.
- **Envelope encryption por contrato.** `Message`, `Report` e anexos são cifrados com a DEK do contrato (AES-256-GCM); a DEK é cifrada com KEK no KMS. Admin **não** vê conteúdo. No frontend Next.js a cifragem ocorre no cliente via WebCrypto antes do PUT presigned no S3.
- **`audit_log` é append-only com hash chain.** `self_hash = SHA256(prev_hash || canonical_json(payload))`. Job diário valida a cadeia; quebra é incidente sev0.
- **Transições de estado de `Contract` e `Application` usam `SELECT … FOR UPDATE`** dentro de transação para evitar race condition.
- **Webhooks de PSP:** HMAC-SHA256 em tempo constante, `event_id` único em `webhook_events` (replay protection), tolerância de timestamp ±5min, IP allowlist do PSP.
- **Sessão Django, não JWT em localStorage.** Cookie `httpOnly`+`Secure`+`SameSite=Lax`. JWT só para integrações server-to-server.
- **MFA TOTP obrigatório para admins e empresas**; recomendado para pentesters.
- **Migrations destrutivas seguem expand/contract em duas releases.** `--check` antes do switch de tráfego.
- **Catálogos públicos (`GET /pentesters`, `GET /proposals?status=PUBLISHED`) bypassam RLS via policy específica e usam serializer com projeção pública** (sem CNPJ, e-mail, documentos).

## Quando (eventualmente) houver código

A estrutura proposta no brainstorm é:

```
pentesthub/
├── apps/api/         # Django: pentesthub/, accounts/, tenants/, pentesters/,
│                     # proposals/, contracts/, payments/, messaging/, reports/,
│                     # audit/, admin_ops/, notifications/, infra/{gateways,kms,storage,celery}, api/
├── apps/web/         # Next.js App Router: app/(public|auth|app|admin)/, app/api/proxy/,
│                     # features/, components/, lib/, hooks/
├── packages/api-types/    # gerado via openapi-typescript
├── packages/schemas/      # Zod schemas compartilhados
├── infra/terraform/, infra/docker/, infra/compose/
└── .github/workflows/     # ci-api, ci-web, contract (diff openapi), security, deploy-*
```

Comandos só serão definidos quando os manifests forem criados. Não suponha que existem `pnpm test`, `pytest`, `make` etc. até ver os arquivos correspondentes (`pyproject.toml`, `package.json`, `Taskfile.yml`).
