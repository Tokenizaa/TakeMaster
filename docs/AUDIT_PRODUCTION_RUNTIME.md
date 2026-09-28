# TakeMaster — Runtime e Deploy de Produção

> Auditoria de `main` contra `https://takemaster.olfnetto.workers.dev/`.
> Nenhum segredo é registrado neste documento. Estado dos segredos é sempre `configured` / `missing`.

## Runtime

**Produção não executa runtime de aplicação. É um deploy estático.**

A aplicação real (Express + endpoints `/api/*`) existe apenas no repositório, em `server.ts`.
Ela **não** está implantada em produção.

O bundle publicado é o resultado de `npm run build` (saída do Vite em `dist/`) e nada mais.

Comprovação de que o código local corresponde à produção — comparação byte a byte do bundle
publicado contra o build local de `main` **antes** das correções desta auditoria:

| Arquivo | Produção | Build local | sha256 (24 chars) | Resultado |
|---|---|---|---|---|
| `assets/index-dj0VKcqg.js` | 392.445 B | 392.445 B | `1f7dbf5de5b34f493606f795` | `cmp` = **IDENTICAL BYTES** |
| `index.html` | 1.400 B | 1.400 B | — | `cmp` = **IDENTICAL BYTES** |

Ou seja: o frontend em produção foi construído exatamente deste `main`. Não há divergência
de código entre o repositório e o que está no ar.

## Deployment

**Não existe configuração de deploy neste repositório.** Verificado em `main` e em todo o
histórico git (`git log --all --name-only`):

- `wrangler.toml` / `wrangler.json` / `wrangler.jsonc` — ausente
- `.github/workflows/` — ausente
- `Dockerfile` — ausente
- `worker.ts` / `_worker.js` / `functions/` / `workers/` / `cloudflare/` — ausentes
- qualquer menção a `cloudflare`, `wrangler`, `workers.dev` — **zero ocorrências** no código

Conclusão: o pipeline é `npm run build` → upload do `dist/` para Cloudflare Workers Static
Assets, feito **fora do repositório** (dashboard ou CLI na máquina de quem implanta).
O backend Express nunca foi publicado.

O repositório tem herança de Google AI Studio (`package.json` com nome `react-example`,
`metadata.json` no formato do AI Studio, comentário de `DISABLE_HMR` no `vite.config.ts`).
Isso explica o frontend, mas não há qualquer passo de backend na configuração.

## Cloudflare

Comportamento observado em `takemaster.olfnetto.workers.dev`:

```
GET    /                 → 200 text/html  1400 B   (index.html)
GET    /zzz-random       → 200 text/html  1400 B   (mesmo index.html)
GET    /api/             → 200 text/html  1400 B   (mesmo index.html)
GET    /api/programs     → 200 text/html  1400 B   (mesmo index.html)
POST   /api/ai/diagnose  → 405           0 B
PUT    /api/ai/diagnose  → 405           0 B
DELETE /api/ai/diagnose  → 405           0 B
```

Headers: `server: cloudflare`, `cf-cache-status: HIT`, `cf-ray: ...-GRU` (edge de São Paulo).

Leitura: é um Workers Static Assets com fallback de SPA para `index.html` em qualquer
`GET`, e que rejeita métodos não-GET com `405`. Confirma que existe um handler de assets,
não um servidor de API.

## Environment Variables

| Variável | Onde é lida | Estado | Observação |
|---|---|---|---|
| `NIM_API_KEY` | `src/server/ai.ts:8` | `configured` (local) | valor nunca exibido |
| `NVIDIA_API_KEY` | `src/server/ai.ts:8` (alias) | `configured` (local) | **diverge em 1 caractere de `NIM_API_KEY`** — ver Riscos |
| `NIM_BASE_URL` | `src/server/ai.ts:7` | `configured` | `https://integrate.api.nvidia.com` |
| `NIM_PRIMARY_MODEL` | `src/server/ai.ts:9`, `server.ts` | `configured` | `nvidia/nemotron-3-super-120b-a12b` |
| `NIM_FALLBACK_MODEL` | `src/server/ai.ts:10`, `server.ts` | `configured` | `nvidia/nemotron-3-ultra-550b-a55b` (era `nemotron-3-nano-30b-a3b`, EOL) |
| `NIM_TIMEOUT_MS` | `src/server/ai.ts:11` | `configured` | `60000` |
| `APP_URL` | — | `configured` | declarada no `.env`, sem consumidor no código |

`.env` está coberto por `.gitignore` (`.env*` com `!.env.example`) — confirmado por
`git check-ignore -v .env`.

**Questão crítica da auditoria:** "`process.env.NIM_API_KEY` existe no runtime de PROD?"

Resposta: **irrelevante no estado atual**, porque em produção não existe runtime de aplicação
para recebê-la. Não há processo Node, não há Express, não há leitura de `process.env`.
A pergunta só passa a ter sentido depois de decidir publicar o backend.

## NVIDIA NIM

Estado do provider: `src/server/ai.ts`. Endpoint `POST {NIM_BASE_URL}/v1/chat/completions`,
autenticação `Authorization: Bearer`, `temperature: 0.4`, timeout via `AbortController` +
`clearTimeout`, `response_format: {type:'json_object'}` quando o endpoint pede JSON.

Cadeia configurada e **verificada ao vivo**:

```
nvidia/nemotron-3-super-120b-a12b   (principal)
      ↓ erro / timeout
nvidia/nemotron-3-ultra-550b-a55b   (fallback)
      ↓ erro
erro explícito: "IA indisponível. Modelo principal: ... Fallback: ..."
```

Nenhum retorno de conteúdo fictício em nenhum caminho de erro.

## AI Endpoints

Nove endpoints, todos em `server.ts`, todos passando pelo mesmo provider:

| Endpoint | Provider | Modelo |
|---|---|---|
| `POST /api/ai/assist` | `ai.models.generateContent` | NIM |
| `POST /api/ai/interpret-idea` | idem | NIM |
| `POST /api/ai/diagnose` | idem | NIM |
| `POST /api/ai/research` | idem | NIM |
| `POST /api/ai/outline` | idem | NIM |
| `POST /api/ai/script` | idem | NIM |
| `POST /api/ai/repiques` | idem | NIM |
| `POST /api/ai/shorts` | idem | NIM |
| `POST /api/ai/editor-script` | idem | NIM |

Em produção, **todos os nove retornam `405`**. O frontend consome todos por caminho relativo
(`/api/...`, ver `src/services/api.ts`), portanto não há como a UI alcançar um backend em
outro host sem mudança de código.

### Mocks / respostas fictícias

Varredura por `mock`, `mockData`, `demo`, `fake`, `sample`, `hardcoded`, `placeholder` em
todo `src/`: **nenhuma resposta de IA fictícia**. Os 98 hits são quase todos atributos
`placeholder=` de inputs de formulário, mais falsos positivos de `demo` dentro de
`NewEpisodeModal` / `EpisodeModal`.

O único mock real do projeto é a massa de seeds em `src/server/db.ts` (ver Persistência).

## Persistence

`src/server/db.ts` usa **sistema de arquivos**, não banco de dados.

```
DATA_DIR = path.resolve(process.cwd(), 'data')
DB_FILE  = path.join(DATA_DIR, 'db.json')
fs.readFileSync / fs.writeFileSync
```

Mecanismo: um `data/db.json` reescrito por inteiro a cada `save()`. Se o arquivo não existir
ou não casar com o schema, `load()` cai nos seeds: `seedPrograms` (2), `seedParticipants` (8),
`seedEpisodes` (2, completos com roteiro/perguntas/diagnóstico), `seedAgenda` (2),
`seedLibrary` (4).

Classificação frente ao runtime de produção:

- **Compatibilidade com Cloudflare Workers: BLOQUEADOR.** O filesystem do Workers é somente
  leitura e efêmero. `fs.writeFileSync` não tem onde escrever; `fs.mkdirSync` também não.
- **Impacto hoje: contido.** Como não há backend em produção, `db.ts` nunca executa lá.
- **Impacto ao publicar o backend em Workers: BLOQUEADOR.** Qualquer rota de leitura de dados
  precisa de armazenamento do Workers (D1, KV, R2 ou Durable Objects) antes do deploy.
- **`fs` em si**: `nodejs_compat` habilita leitura, mas não cria disco gravável.

Os seeds **não** foram removidos nem migrados, conforme instruído. Apenas diagnosticados.

## Build

| Gate | Antes | Depois |
|---|---|---|
| `npm install` | **FAIL** — `ERESOLVE` | **PASS** — 142 pacotes, 0 vulnerabilidades |
| `npm run lint` (`tsc --noEmit`) | **FAIL** — 2 erros | **PASS** — rc=0 |
| `npm run build` (`vite build`) | **PASS** | **PASS** — 1679 módulos |

Causa do `npm install`: `esbuild` estava declarado como `^0.25.0` na raiz e é importado em
lugar nenhum do projeto. Ele resolvia para 0.25.x, violando o `peerOptional`
`esbuild@^0.27.0 || ^0.28.0` do `vite@8.3.1`. Correção: `^0.25.0` → `^0.28.0`.

Erros de TypeScript corrigidos:

1. `src/components/Sidebar.tsx:142` — `onSelectEpisodeWorkspace` é prop opcional e era
   chamada sem guarda. Agora `onSelectEpisodeWorkspace?.(ws.id)`.
2. `src/components/AiContextAssistant.tsx:87` — **contrato quebrado entre servidor e cliente**,
   não apenas um erro de tipo. Ver Riscos.

## Production Test

Executado contra `https://takemaster.olfnetto.workers.dev/` com navegador real.

1. **Carga inicial** — a página abre (HTTP 200), mas o console registra:
   ```
   Falha ao carregar dados iniciais: SyntaxError: Unexpected token '<',
   "<!doctype "... is not valid JSON
   ```
   As cinco chamadas de dados (`/api/programs`, `/api/episodes`, `/api/participants`,
   `/api/agenda`, `/api/library`) recebem `200` com o HTML do SPA em vez de JSON.
2. **Estado visível** — o dashboard mostra "Nenhuma produção em andamento", "0 agendadas",
   "Nada pendente por enquanto", "0 ativos". Não é um estado vazio real: é falha de carga.
3. **Fluxo de IA, pela tela** — clique em "Criar primeira produção", ideia preenchida,
   clique em "Criar Produção com IA":
   ```
   POST https://takemaster.olfnetto.workers.dev/api/ai/interpret-idea  => [405]
   Failed to load resource: the server responded with a status of 405 ()
   Failed to interpret idea: Error: Falha ao interpretar ideia com IA
   ```
4. **Nenhum dado de produção foi modificado.** As chamadas que falharam foram todas de leitura,
   mais uma geração de IA que não chegou a executar.

## Risks

1. **Sem backend em produção (BLOQUEADOR).** Toda a camada Express + NIM + persistência é
   código morto no ar. O produto em produção é um shell estático que não carrega dados e não
   gera IA.
2. **Persistência em filesystem (BLOQUEADOR para publicar em Workers).** `db.ts` depende de
   disco gravável; o Workers não oferece. Precisa de D1/KV/R2 antes de qualquer deploy do
   backend.
3. **`NIM_API_KEY` e `NVIDIA_API_KEY` divergem em 1 caractere.** `ai.ts:8` lê `NIM_API_KEY`
   primeiro, então funciona. Mas se alguém configurar apenas `NVIDIA_API_KEY` no ambiente
   (ou o inverso em Cloudflare), a autenticação falha em silêncio até o primeiro 401.
   Recomenda-se padronizar em **uma** variável.
4. **Sem retry antes do fallback.** Qualquer erro do principal — inclusive 503 transitório de
   ~700 ms — consome o fallback imediatamente. Em rajada, os dois modelos podem estar
   saturados e o usuário vê erro mesmo com os dois sadios. Recomendado: 1 retry no mesmo
   modelo após 1,5-2 s quando o erro for 503/429, antes de cair no fallback.
5. **`NIM_TIMEOUT_MS=60000` está no limite.** O principal estourou 60 s em 1 de 12 chamadas e
   os endpoints `script`/`outline` geram milhares de tokens. Se o principal ficar sob carga, o
   timeout vira a causa dominante de falha.
6. **`parseAIJson` é ponto único de falha.** Ele só remove cercas ``` e chama `JSON.parse`.
   Um modelo que quebre o JSON mode devolve `200` e o erro aparece como
   "A IA retornou JSON inválido", mascarando a causa. Medido: o modelo de fallback duplica
   prefixo e quebra o parse em 4 de 4 tentativas com prompt degenerado de "ecoar template",
   embora tenha passado em 7 de 7 com os schemas reais do app. Se ele entrar em produção,
   vale logar o `content` bruto quando o parse falhar.
7. **Contrato do Copiloto IA divergente.** `POST /api/ai/assist` instrui o modelo a devolver
   `{"answer": "...", "suggestionApplied": null}` e o cliente tipava
   `{actionType, summary, targetField, updatedData}`. O botão "Aplicar ao Episódio" lia campos
   que a resposta nunca trazia, então essa funcionalidade estava **morta por construção**.
   O TypeScript acusou o descompasso. Nesta auditoria o cliente passou a refletir o contrato
   real: exibe `answer`/`summary`, e "Aplicar ao Episódio" só fica habilitado quando
   `suggestionApplied.targetField` existe. **O prompt do servidor ainda pede `suggestionApplied:
   null`**, então a aplicação automática continua inerte até alguém decidir qual schema o modelo
   deve produzir. Essa é uma decisão de produto, não uma correção de auditoria.

## Blockers

Ordem sugerida, do maior impacto para o menor:

1. **Publicar o backend, ou declarar que o TakeMaster é só frontend.** Sem isso, nenhuma das
   demais correções importa. A decisão define o caminho: container/VM com Node (onde
   `server.ts` e `db.ts` funcionam como estão) ou.adapter para Workers (exige trocar `db.ts`
   por armazenamento do Workers e revisar o manuseio de `fs`).
2. **Mover a persistência para fora do filesystem** se a opção for Workers.
3. **Padronizar `NIM_API_KEY` / `NVIDIA_API_KEY`** em uma variável só.
4. **Decidir o schema de `suggestionApplied`** para religar o "Aplicar ao Episódio".
5. **Adicionar retry 503/429** antes do fallback, e considerar elevar `NIM_TIMEOUT_MS`.
6. **Versionar a configuração de deploy no repositório** (wrangler + workflow), para que o
   próximo deploy não dependa de conhecimento não registrado.

## Próximas ações

Nada da refatoração grande de UX deve começar antes do item 1 dos Blockers. Enquanto o backend
não estiver publicado, trabalhar na UX é polir uma interface que não carrega dados e não
executa IA — o risco é entregar ganho visual sobre um produto quebrado.

Sequência sugerida:

1. Decidir o destino do backend (Node em container/VM **ou** Workers com reescrita de `db.ts`).
2. Implementar a publicação escolhida e comitar a configuração no repositório.
3. Reexecutar esta auditoria: agora com o backend no ar, os gates de `/api/ai/*` em produção
   passam a ser verificáveis de verdade.
4. Só então atacar a simplificação de UX.

## Nota sobre Secrets

Nenhum valor de chave, token ou credencial aparece neste documento. Referências a segredos
são sempre `configured` / `missing`. O `.env` é coberto por `.gitignore` e nunca foi lido
integralmente para output.
