# ROADMAP MASTER v1

## TakeMaster — Estado reconciliado

**Data da reconciliação:** 2026-09-29  
**Fonte única de verdade:** este arquivo.  
**Regra:** F0–F11 são as únicas fases oficiais. Qualquer tarefa interna deve ser vinculada a uma dessas fases e não cria uma nova fase.

## F0 — Governance and Planning
**Status:** CONCLUÍDO  
**Evidências:** `SUPERVISOR_GUIDE.md` e `AGENTS.md` presentes; este roadmap é o registro central.

## F1 — Technical Foundation
**Status:** EM ANDAMENTO  
**Evidências:** React/Vite/TypeScript, Express, Worker e Supabase DAL presentes; CI passa a ser gate de lint/build.  
**Gap:** runtime de produção e configuração segura de secrets ainda precisam de validação operacional.  
**Próxima ação:** concluir hardening/deploy do runtime e comprovar healthcheck em produção.

## F2 — Editorial Catalog
**Status:** CONCLUÍDO  
**Evidências:** CRUD de programs, participants e episodes e DAL Supabase presentes.

## F3 — Content Intelligence
**Status:** CONCLUÍDO (local) / VALIDAR EM PRODUÇÃO  
**Evidências:** endpoints `/api/ai/*` e NVIDIA NIM presentes.  
**Próxima ação:** smoke test real após deploy.

## F4 — Episode Discovery
**Status:** PENDENTE  
**Gap:** pipeline externo completo de descoberta → insight → episódio não está comprovado.

## F5 — Customer Operations / Tenant Enablement
**Status:** EM ANDAMENTO  
**Evidências:** agenda e library existem.  
**Gaps:** agenda sem PUT; library sem upload de arquivo completo; auth/authz e isolamento por tenant não comprovados.  
**Próxima ação:** identidade/tenant isolation e completar agenda/library.

## F6 — Production
**Status:** PENDENTE  
**Gap:** fluxo operacional completo de gravação/teleprompter/câmeras não comprovado.

## F7 — AI
**Status:** CONCLUÍDO (local) / PENDENTE (produção)  
**Evidências:** NIM principal/fallback e camada de IA presentes.  
**Próxima ação:** smoke test real e validação de fallback.

## F8 — Post-production and Content
**Status:** PENDENTE  
**Gap:** pós-produção end-to-end não comprovada; existem estruturas de roteiro de edição e shorts.

## F9 — QA and Security
**Status:** EM ANDAMENTO  
**Evidências:** CI de lint/build; middleware de segurança no Express.  
**Gaps críticos:** service-role exposto em configuração; auth/authz/tenant isolation ausentes ou não comprovados; testes de aplicação insuficientes.  
**Próxima ação:** rotação de credencial, auth/authz, testes críticos e smoke/E2E.

## F10 — Commercialization
**Status:** PENDENTE  
**Dependências:** F5/F8 e identidade/entitlement.

## F11 — Continuous Operations
**Status:** PENDENTE  
**Evidências:** observabilidade básica do Worker.  
**Gap:** alerting, recovery testado e métricas operacionais ainda não comprovados.

## GATE DE PRODUÇÃO ATUAL
Não declarar produção pronta enquanto houver qualquer item sem evidência:
1. service-role removido do repositório e credencial comprometida rotacionada;
2. Worker/backend implantado e `/api/health` validado;
3. autenticação, autorização e isolamento por organização funcionando;
4. CI verde e testes críticos automatizados;
5. storage/upload da biblioteca validado;
6. smoke test real dos endpoints críticos, incluindo NIM.

**Próximo trabalho oficial:** F1/F5/F9 em execução integrada; F7 depende da validação de produção.  
**Próximo gate:** @qualidade.
