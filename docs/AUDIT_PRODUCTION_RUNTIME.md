# TakeMaster — Auditoria de Runtime e Deploy

**Estado anterior:** este documento continha uma fotografia histórica em que somente o frontend estava publicado.  
**Estado atual:** essa fotografia está obsoleta e não deve ser usada como diagnóstico atual.

## Evidência atual

- O repositório possui Worker (worker-entry.ts) e wrangler.toml.
- O Worker inclui rotas de API, Supabase e NVIDIA NIM.
- O endereço publicado respondeu ao endpoint /api/health com HTTP 200, status ok, Supabase conectado e NIM configurado durante a verificação de 2026-09-30.
- A configuração versionada não contém a service-role key.
- O código atual usa a DAL Supabase (src/server/db.ts / src/server/supabase-db.ts), não o antigo filesystem data/db.json.
- CI da entrega integrada passou em lint/typecheck e build.

## Ponto ainda não fechado

Uma tentativa externa de acessar /api/programs no endereço publicado recebeu o SPA HTML em vez do JSON esperado. Isso significa que ainda não há evidência suficiente de que a versão completa do Worker presente no main esteja efetivamente promovida ao runtime público.

Esse é o bloqueador técnico atual de F1/F7.

## Segurança e banco

O Supabase atual possui organizações, membros, organization_id e policies RLS baseadas em tm_private.is_org_member / tm_private.is_org_role. O advisor de segurança retornou zero lints na verificação atual.

Isso não substitui a integração de autenticação no produto: o backend server-side continua usando service_role e o fluxo de sessão do usuário ainda precisa ser conectado ao frontend/API.

## Próximo teste obrigatório

Depois do deploy da main atual:

1. GET /api/health
2. GET /api/programs
3. GET /api/episodes
4. POST controlado de um recurso de teste
5. PUT/DELETE controlados
6. smoke dos endpoints NIM
7. validação de autenticação e isolamento de organização

Até esses testes, não marcar F1/F7/F9 como concluídos.
