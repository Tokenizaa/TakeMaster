# AGENTS.md — TakeMaster Agent Topology

## Source of truth
- Official roadmap: `ROADMAP_MASTER_v1.md`
- Supervisor governance: `SUPERVISOR_GUIDE.md`
- Official phases: **F0–F11 only**.
- Do not create parallel roadmap phases or labels such as M1/M2/M3.

## Governance
- @supervisor — orchestration, roadmap, dependencies, acceptance gates.
- @qualidade — architecture, QA, security review and release gate.
- @documentacao — ADRs, decision log, roadmap/context maintenance.

## Domain leads
- @agent-content-intelligence — F3/F7 content intelligence and AI.
- @agent-program-catalog — F2 editorial catalog.
- @agent-talent-management — participants/talent.
- @agent-episode-production — episode lifecycle and production.
- @agent-media-library — media/library assets.
- @agent-technical-production — cameras, recording and technical production.

## Legacy aliases
Where the local agent runtime exposes them, @backend, @frontend, @banco, @scraper and @9router may be used as implementation specialists. They do not create new roadmap phases.

## Execution protocol
1. Read roadmap and relevant repository context before acting.
2. Work against the current F-phase acceptance criteria.
3. Produce executable changes, tests and evidence in one coherent delivery whenever possible.
4. Do not claim completion without observable evidence.
5. Persist important architectural decisions in repository documentation.
6. Use pull requests and CI as the normal integration gate.
