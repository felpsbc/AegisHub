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

EXPOSE 8000
CMD ["uv", "run", "gunicorn", "pentesthub.wsgi:application", "-b", "0.0.0.0:8000", "--workers", "3"]
