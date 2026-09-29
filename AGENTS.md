# Agent Topology — TakeMaster

## Agentes de Governança

| Agente | Papel |
|--------|-------|
| Supervisor | Orquestrador único. Lê estado, distribui tarefas, detecta conflitos, valida dependências, controla roadmap, revisa PRs, garante arquitetura. |
| Architecture Review (@qualidade) | Guardião de qualidade. Revisa PRs, valida SOLID, acoplamento, performance, contratos entre agentes. Pode reprovar mudanças que violam arquitetura. |
| Context Manager (@documentacao) | Documentação viva. Cria/atualiza ADRs, sincroniza folder-structure, registra topologia de agentes, roadmap e decision-log. |

## Agentes de Domínio

### @agent-content-intelligence
- **Objetivo**: Gerar, analisar ou otimizar conteúdo audiovisual usando IA para auxiliar na concepção, pesquisa, roteirização e planejamento de episódios
- **Escopo**: src/server/ai.ts, src/server/mappers.ts (partes relacionadas a IA), novos arquivos relacionados a funcionalidades de IA para criação de conteúdo
- **Depende de**: @agent-program-catalog, @agent-talent-management, @agent-episode-production
- **Dependido por**: Neném (fornece conteúdo para outros domínios)

### @agent-program-catalog
- **Objetivo**: Gerenciar programas de TV, seus formatos, configurações e estruturas
- **Escopo**: src/types/index.ts (seções relacionadas a Program, ProgramFormat, ProgramDefaultSegment, CameraConfig), src/server/db.ts (métodos relacionados a programas), src/server/mappers.ts (funções de mapeamento relacionadas a programas), src/server/seeds.ts (dados de semente para programas)
- **Depende de**: Neném (informações centrais)
- **Dependido por**: @agent-content-intelligence, @agent-talent-management, @agent-episode-production, @agent-media-library, @agent-technical-production

### @agent-talent-management
- **Objetivo**: Gerenciar participantes, convidados, hosts, artistas e talentos
- **Escopo**: src/types/index.ts (seções relacionadas a Participant, ParticipantType, EpisodeParticipant), src/server/db.ts (métodos relacionados a participantes), src/server/mappers.ts (funções de mapeamento relacionadas a participantes), src/server/seeds.ts (dados de semente para participantes), src/components/ (componentes relacionados à gestão de participantes)
- **Depende de**: @agent-program-catalog (para validar programas existentes)
- **Dependido por**: @agent-content-intelligence, @agent-episode-production

### @agent-episode-production
- **Objetivo**: Gerenciar o ciclo de vida de episódios do TakeMaster
- **Escopo**: src/types/index.ts (seções relacionadas a Episode, EpisodeStatus, EpisodeParticipant, Segment, QuestionItem, ScriptItem, PlannedShort, ProductionAsset, RecordingMarker, TechnicalChecklist, EditorialDiagnosis, ResearchData, Shorts, etc.), src/server/db.ts (métodos relacionados a episódios), src/server/mappers.ts (funções de mapeamento relacionadas a episódios), src/server/seeds.ts (dados de semente para episódios), src/components/ (componentes relacionados à gestão de episódios)
- **Depende de**: @agent-program-catalog, @agent-talent-management
- **Dependido por**: @agent-content-intelligence (recebe conteúdo gerado por IA), @agent-media-library (associa assets), @agent-technical-production (obtém configurações técnicas)

### @agent-media-library
- **Objetivo**: Gerenciar bibliotecas de mídia e assets reutilizáveis
- **Escopo**: src/types/index.ts (seções relacionadas a LibraryAsset, ProductionAsset, ProductionMaterial), src/server/db.ts (métodos relacionados a library assets), src/server/mappers.ts (funções de mapeamento relacionados a library assets), src/server/seeds.ts (dados de semente para library assets), src/components/ (componentes relacionados à biblioteca)
- **Depende de**: @agent-program-catalog (para associar assets a programas específicos)
- **Dependido por**: @agent-episode-production (associa assets a episódios)

### @agent-technical-production
- **Objetivo**: Gerenciar aspectos técnicos de produção de episódios
- **Escopo**: src/types/index.ts (seções relacionadas a CameraConfig, TechnicalChecklist, TechnicalChecklistItem, RecordingMarker), src/server/db.ts (métodos relacionados a aspectos técnicos), src/server/mappers.ts (funções de mapeamento relacionados a aspectos técnicos), src/server/seeds.ts (dados de semente para configurações técnicas), src/components/ (componentes relacionados à produção técnica)
- **Depende de**: @agent-program-catalog (para obter configurações padrão de câmeras para programas)
- **Dependido por**: @agent-episode-production (associa configurações técnicas a episódios)

## Shared Kernel

- src/types/index.ts (tipos e interfaces compartilhados)
- src/utils/ (utilitários compartilhados)
- Qualquer código que seja genuinamente compartilhado entre múltiplos domínios

## Arquitetura

Padrão arquitetural: Monolítico modular com domínios claramente separados
Camadas:
- Presentation Layer (React components)
- Application Layer (Agent skills boundaries)
- Domain Layer (Rich domain models in types/)
- Infrastructure Layer (Supabase database access, AI services)

## Dependências Externas

- Express.js (backend framework)
- React.js (frontend library)
- Vite (build tool)
- TailwindCSS (styling)
- Supabase (database)
- NVIDIA NIM (AI service)