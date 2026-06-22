FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.local/bin/uv /usr/local/bin/uv

WORKDIR /app

COPY apps/api/pyproject.toml apps/api/uv.lock* ./
RUN uv sync --no-dev --frozen 2>/dev/null || uv sync --no-dev

COPY apps/api ./
COPY infra/docker/api-entrypoint.prod.sh /usr/local/bin/api-entrypoint.prod.sh
RUN chmod +x /usr/local/bin/api-entrypoint.prod.sh

EXPOSE 8000
# Default = produção (migra como owner, configura RLS, sobe gunicorn como app role).
# O docker-compose.yml de dev sobrescreve este CMD com runserver.
CMD ["/usr/local/bin/api-entrypoint.prod.sh"]
