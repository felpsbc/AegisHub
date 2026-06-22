# Deploy em produção — AegisHub

Guia para colocar o AegisHub no ar num servidor único (VPS) com Docker.
O stack sobe Postgres, Redis, MinIO, a API (Django/gunicorn), o web
(Next.js standalone) e o **Caddy** como porta de entrada com **TLS
automático** (Let's Encrypt).

Arquitetura em produção:

```
Internet ──443──> Caddy ──> web (Next.js) ──BFF /api/proxy──> api (gunicorn) ──> postgres
                                                                              └─> redis / minio
```

O browser só fala com o Next. A API, o banco e o Redis ficam numa rede
docker privada, sem portas expostas no host.

---

## Pré-requisitos

1. Um servidor Linux (Ubuntu 22.04+ recomendado) com **Docker** e o plugin
   **docker compose v2** instalados.
2. Um **domínio** (ex.: `app.seudominio.com.br`) com registro **DNS A/AAAA
   apontando para o IP do servidor**. O Caddy só consegue emitir o
   certificado TLS depois que o DNS estiver propagado.
3. Portas **80** e **443** abertas no firewall do servidor.

---

## Passo a passo

### 1. Clonar o repositório no servidor

```bash
git clone <url-do-repo> aegishub
cd aegishub
```

### 2. Criar o arquivo de ambiente de produção

```bash
cp .env.production.example .env.production
```

Edite `.env.production` e preencha **todos** os valores marcados com
`TROQUE`. Os críticos:

| Variável | O que é |
|---|---|
| `APP_DOMAIN` | Seu domínio público (o mesmo do DNS). |
| `POSTGRES_PASSWORD` | Senha do owner do banco (roda migrations). |
| `DJANGO_DB_PASSWORD` | Senha da role de runtime `pentesthub_app` (RLS). **Diferente** da do owner. |
| `DJANGO_SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DJANGO_ALLOWED_HOSTS` / `DJANGO_CSRF_TRUSTED_ORIGINS` | Devem conter o `APP_DOMAIN`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin provisionado no primeiro boot. |
| `EMAIL_*` | SMTP real (SES, Resend, SendGrid…) para os e-mails de confirmação. |
| `MFA_ENCRYPTION_KEY` | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `LOCAL_KMS_MASTER_KEY` | `python -c "import base64,os; print(base64.b64encode(os.urandom(32)).decode())"` |

> `.env.production` está no `.gitignore` — nunca será commitado.

### 3. Subir o stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

O entrypoint da API faz, automaticamente e de forma idempotente:

1. espera o Postgres ficar pronto;
2. roda as **migrations** como owner;
3. carrega as taxonomias (especialidades/certificações);
4. dá **LOGIN + senha** à role `pentesthub_app` (ativa o RLS de verdade);
5. provisiona o **admin** a partir das envs `ADMIN_*`;
6. roda `collectstatic`;
7. sobe o **gunicorn** conectando como `pentesthub_app` (RLS enforce).

### 4. Verificar

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f caddy   # acompanha a emissão do TLS
```

Abra `https://APP_DOMAIN` no navegador. O cadastro deve funcionar e o
e-mail de confirmação chegar na caixa real configurada no SMTP.

---

## Operação do dia a dia

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web

# Atualizar para uma nova versão
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Shell Django (ex.: criar outro admin)
docker compose -f docker-compose.prod.yml exec api uv run python manage.py shell

# Backup do banco
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-$(date +%F).sql
```

---

## Notas de segurança e escala

- **RLS ativo**: em produção a aplicação conecta como `pentesthub_app`
  (`NOBYPASSRLS`), então as policies de `proposals`/`applications` valem de
  verdade — diferente do dev, onde se conecta como owner.
- **Banco gerenciado (RDS) em vez do Postgres embarcado**: aponte
  `POSTGRES_HOST`/`POSTGRES_PORT` para o endpoint gerenciado e troque
  `DJANGO_DB_SSLMODE=require`. Rode os passos do entrypoint uma vez para
  criar a role (a migration `accounts/0002_postgres_setup` + `setup_app_role`).
- **TLS**: o Caddy renova o certificado sozinho. Garanta que 80/443 fiquem
  abertas (o desafio HTTP-01 usa a 80).
- **E-mail**: hoje o envio de confirmação é **síncrono** no registro. Sob
  carga alta, mover para uma task Celery (worker + Redis já disponíveis).
- **Backups**: agende o `pg_dump` acima num cron e leve para storage externo.
- **Segredos**: nunca commite `.env.production`. Rotacione `DJANGO_SECRET_KEY`,
  senhas do banco e `MFA_ENCRYPTION_KEY` periodicamente.
