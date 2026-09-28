# TakeMaster — Auditoria UX e Plano de Simplificação

> Auditoria do estado atual da branch `main`.
> Objetivo: reduzir a complexidade percebida do produto sem reconstruir o sistema nem remover capacidades que já funcionam.

## 1. Diagnóstico executivo

O TakeMaster já possui uma base conceitual ampla: programas, episódios, participantes, segmentos, câmeras, roteiro, produção, gravação, agenda, biblioteca e recursos de IA.

O problema principal identificado nesta auditoria não é falta de funcionalidade. É **excesso de superfície de produto apresentada simultaneamente**.

### Princípio central
**A complexidade deve existir no modelo e desaparecer da interface até o momento em que for necessária.**

## 2. Evidências encontradas no código

### Sidebar — `src/components/Sidebar.tsx`
- navegação global: Dashboard, Programas, Episódios, Agenda, Biblioteca, Configurações;
- seletor de Programa Ativo;
- seção contextual Episódio em Foco;
- quatro workspaces do episódio;
- CTA permanente Modo Estúdio;
- CTA permanente Novo Episódio.

Isso mistura três níveis: onde estou no sistema; qual programa está ativo; em qual etapa do episódio estou.

**Problema:** o usuário precisa interpretar muito contexto antes de começar uma tarefa.

### Header — `src/components/Header.tsx`
O Header repete contexto e ações: programa ativo, formato, breadcrumb do episódio, autosave, Estúdio Conectado, + Programa e Novo Episódio.

**Direção:** Header deve responder apenas onde estou, qual é a ação principal desta tela e o estado essencial da operação.

### Dashboard — `src/components/DashboardView.tsx`
O Dashboard apresenta hero institucional, descrição do produto, contagem de programas/episódios, criação de episódio com IA, gerenciamento de programas, quatro métricas, filtro, busca, feed de episódios, agenda/próximas ações e diversos atalhos.

As métricas são úteis como informação secundária, mas não deveriam competir com a pergunta principal: **O que eu preciso fazer agora?**

**Direção:** transformar o Dashboard em uma central de próxima ação, não em painel administrativo.

### Criação de produção — `src/components/NewEpisodeModal.tsx`
A implementação já caminhou na direção correta ao permitir linguagem natural e proposta da IA: escolher programa, informar ideia, definir duração/formato, interpretar com IA e aprovar proposta.

Esse fluxo deve ser preservado e simplificado visualmente. A entrada principal deve ser a ideia do produtor; programa, duração e formato devem ser contexto secundário e, quando possível, defaults.

CTA preferencial: **Nova produção**, não Novo Episódio.

### Programas — `src/components/ShowsView.tsx`
A tela reúne criação de programa, episódios, participantes/elenco e configurações. O conceito é válido, mas a experiência se aproxima de um painel administrativo/ERP.

Participantes são recursos da produção. Câmeras e quadros padrão são configurações que nem sempre precisam estar expostas no caminho principal.

**Direção:** Programa deve ser um contexto recorrente de produção, não um centro administrativo pesado.

### Episode Workspace — `src/components/EpisodeWorkspace/EpisodeWorkspace.tsx`
A consolidação de nove etapas em quatro áreas foi um avanço, porém cada área continua ampla: Visão Geral & Pesquisa; Roteiro & Direção; Produção & Câmeras; Gravação & Estúdio.

A própria tela ainda reúne header do episódio, status, formato, duração, Copiloto IA, Exportar, Modo Estúdio e navegação das quatro áreas.

**Direção:** manter as quatro áreas como organização interna, mas reduzir a sensação de sistema operacional e apresentar uma próxima ação clara.

## 3. Modelo de navegação proposto

Navegação global:
- **Início**
- **Programas**
- **Agenda**
- **Biblioteca**
- **Configurações**

A navegação contextual do episódio aparece somente quando existe um episódio em produção.

## 4. Fluxo principal desejado

~~~text
Início
  ↓
Nova produção
  ↓
Ideia / briefing
  ↓
Proposta da IA
  ↓
Aprovar / ajustar
  ↓
Roteiro
  ↓
Produção
  ↓
Gravação
  ↓
Pós-produção
~~~

O usuário deve sempre conseguir responder: **Qual é o próximo passo?**

## 5. Dashboard alvo

Prioridade: Próxima produção, com título, participante, formato, duração, progresso e próxima gravação, seguida por produções em andamento, próxima gravação, pendências e episódios recentes.

Métricas gerais podem existir, mas como informação secundária.

## 6. Princípios de UX

1. Uma ação principal por tela.
2. Contexto aparece quando necessário.
3. Configuração avançada fica atrás de uma camada secundária.
4. Participantes são recursos, não formulários administrativos.
5. Câmeras aparecem principalmente quando há direção/produção/gravação.
6. Studio Mode é uma experiência operacional separada e minimalista.
7. O roteiro pode ser rico; o dashboard não.
8. Evitar duplicação entre Sidebar, Header e conteúdo.
9. Linguagem deve ser audiovisual e operacional.
10. Não remover funcionalidade apenas para deixar a tela menor: mover, agrupar ou revelar sob demanda.

## 7. Linguagem

Preferir: Programa, Produção, Episódio, Roteiro, Gravação, Pós-produção, Participantes, Próxima ação.

Evitar como linguagem primária: Workspace, Production Assets, Smart Outline, Handoff, Configuration Surface.

## 8. Studio Mode

Prioridade visual: REC/timer; pergunta ou fala atual; câmera sugerida; repique/follow-up; marcador; próxima ação.

Não deve carregar dashboard, métricas, navegação administrativa ou configurações não necessárias.

## 9. Critério para implementação

Não reconstruir o domínio. Preservar Programa, Episódio, Participante, Segmento, Câmeras, Roteiro, Produção, Gravação, Agenda, Biblioteca e recursos de IA.

Refatorar prioritariamente hierarquia, navegação, densidade, duplicações, exposição de configurações, criação de produção, dashboard e linguagem.

## 10. Ordem de implementação

1. Simplificar Sidebar.
2. Simplificar Header.
3. Redesenhar Dashboard em torno da próxima ação.
4. Simplificar criação de produção.
5. Simplificar página de Programa.
6. Refinar Episode Workspace.
7. Isolar e simplificar Studio Mode.
8. Testar fluxos existentes após cada bloco.

**Regra de segurança:** nenhuma funcionalidade existente deve ser removida sem identificar onde ela será acessada depois.

## 11. Estado da auditoria

- Auditoria baseada na branch `main`.
- Nenhuma alteração funcional de UX foi feita nesta etapa.
- Este documento registra o diagnóstico e serve como referência para implementação.