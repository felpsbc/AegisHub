/**
 * Tipos da API gerados via openapi-typescript a partir de apps/api/schema.yml.
 *
 * Como regenerar:
 *   docker compose exec api uv run python manage.py spectacular --file schema.yml
 *   cp apps/api/schema.yml packages/api-types/schema.yml
 *   pnpm --filter @pentesthub/api-types generate
 *
 * Em produção esse pacote substitui apps/web/lib/types.ts.
 */
export * from "./generated/schema";
