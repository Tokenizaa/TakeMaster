# TakeMaster — Auditoria da Camada de IA e Migração para NVIDIA NIM

> Auditoria da branch `main`, com validação ao vivo contra a API hospedada da NVIDIA.
> Nenhum segredo é registrado neste documento.
> Para o runtime e o deploy, ver `docs/AUDIT_PRODUCTION_RUNTIME.md`.

## 0. Resumo do estado atual (2026-09-28)

| Item | Estado |
|---|---|
| Provider | NVIDIA NIM via Chat Completions — **ativo e verificado** |
| Principal | `nvidia/nemotron-3-super-120b-a12b` — **PASS** |
| Fallback | `nvidia/nemotron-3-ultra-550b-a55b` — **PASS** (substituiu ID EOL) |
| Cadeia de fallback | **verificada ao vivo**, com falha forçada do principal |
| Resposta fictícia em erro | **nenhuma** — erro explícito |
| Gemini em código executável | **zero** |
| Endpoints `/api/ai/*` | 9/9 apontam para o NIM; **em produção retornam 405** (não há backend publicado) |

## 1. Nova decisão arquitetural

O Gemini deixa de ser o provedor de IA do TakeMaster.

Arquitetura alvo:

~~~text
TakeMaster
    ↓
AI Service / AI Provider
    ↓
NVIDIA NIM
    ├── Nemotron Super 3 — principal
    └── fallback — Ultra (ver seção 15)
~~~

A aplicação não deve conhecer detalhes específicos dos modelos em cada funcionalidade.

## 2. Evidência do acoplamento atual

### `package.json`
A dependência atual inclui `@google/genai` versão `^2.4.0`.

### `server.ts`
O servidor importa `ai` e `parseGeminiJson` de `src/server/ai` e possui comentário explícito de endpoints usando `@google/genai`.

O endpoint `/api/ai/interpret-idea` chama diretamente `ai.models.generateContent` e fixa o modelo `gemini-3.8-flash`.

Isso confirma que o modelo está acoplado ao código de endpoint.

## 3. Fallbacks atuais — problema crítico

O endpoint de interpretação de ideia possui fallback que retorna uma proposta pré-fabricada quando a IA não está disponível. O fallback contém dados genéricos como Apresentador, Convidado Principal e segmentos pré-definidos.

Esse comportamento não é aceitável para produção se a interface apresentar a resposta como resultado real da IA.

### Regra nova

~~~text
Nemotron Super 3
      ↓ erro
fallback (Ultra — ver seção 15)
      ↓ resposta
TakeMaster continua
~~~

Se ambos falharem, a API deve retornar erro explícito de IA. Nunca retornar conteúdo fictício como se fosse geração real.

## 4. Capacidades que precisam passar pelo provider

Mapear e migrar todas as funcionalidades atuais de IA, incluindo interpretação de ideia, pesquisa, diagnóstico editorial, estrutura narrativa, roteiro, perguntas, repiques/follow-ups, assistente contextual, Shorts, roteiro de edição e demais endpoints `/api/ai/*`.

## 5. Arquitetura recomendada

~~~text
AIService
  └── NIMProvider
        ├── Nemotron Super 3
        └── fallback (Ultra)
~~~

Os endpoints devem depender do serviço, não do SDK ou modelo.

Exemplo conceitual: `aiService.generate({ task, prompt, schema })`.

O provider decide modelo principal, timeout, retry permitido, fallback, parsing e erro final.

## 6. Configuração

Os nomes dos modelos não devem ficar espalhados pelo código. Centralizar configuração por ambiente, conceitualmente:

~~~text
NIM_BASE_URL
NIM_API_KEY
NIM_PRIMARY_MODEL
NIM_FALLBACK_MODEL
NIM_TIMEOUT_MS
~~~

Os valores exatos de modelo devem ser definidos pela configuração de produção do NVIDIA NIM.

## 7. Contrato de erro

Diferenciar erro de autenticação, timeout, indisponibilidade do provider, resposta inválida, erro de parsing, erro de validação e falha após fallback.

A UI deve receber mensagem operacional clara, sem expor segredos.

## 8. Observabilidade

Cada geração deve permitir identificar tarefa, provider, modelo utilizado, se houve fallback, duração e sucesso/erro.

Não registrar API keys, prompts contendo dados sensíveis ou respostas completas sem necessidade.

## 9. Preservação dos contratos

A migração não deve obrigar uma refatoração do frontend inteiro. Prioridade:

~~~text
Frontend atual
      ↓
contratos /api/ai/*
      ↓
AIService
      ↓
NVIDIA NIM
~~~

## 10. Remoção do Gemini

Após a migração completa:
- remover `@google/genai`;
- remover imports Gemini;
- remover `parseGeminiJson` ou torná-lo provider-neutral;
- remover nomes de modelos Gemini;
- remover fallback fake;
- revisar variáveis de ambiente Gemini;
- revisar documentação;
- procurar referências residuais a Gemini.

## 11. Testes obrigatórios

### Super 3 disponível
`Super 3 → resposta; fallbackUsed = false`. — **executado, PASS**

### Super 3 indisponível
`Super 3 → erro/timeout; fallback → resposta`. — **executado, PASS** (falha forçada,
log do provider confirmando a troca de modelo)

### Ambos indisponíveis
`Super 3 → falha; fallback → falha; API → erro explícito`. — **não executado** contra a
API ao vivo; o caminho de erro foi verificado por leitura do código e por uma falha real
observada durante a auditoria, quando o fallback configurado era o ID EOL e a resposta foi
`IA indisponível. Modelo principal: ... Fallback: HTTP 410 ...`

Nenhum conteúdo fake deve ser retornado. — **confirmado por varredura de código**

### Resposta inválida
O provider deve tratar parsing e validação sem derrubar o servidor. — `parseAIJson` lança
erro explícito; o endpoint responde `500` com mensagem, sem derrubar o processo.

## 12. Ordem de implementação

1. Mapear todos os endpoints `/api/ai/*`.
2. Mapear `src/server/ai.ts`.
3. Criar contrato provider-neutral.
4. Implementar NVIDIA NIM.
5. Implementar Super 3 como principal.
6. Implementar o fallback (vira `nvidia/nemotron-3-ultra-550b-a55b`, seção 15).
7. Migrar endpoint por endpoint.
8. Remover fallbacks fictícios.
9. Remover Gemini.
10. Executar build/typecheck e testes de fluxo.

## 13. Critério de conclusão

A migração será considerada concluída somente quando nenhum endpoint de produção depender
diretamente de Gemini; Super 3 for o principal; o fallback funcionar de verdade; falha dupla
produzir erro explícito; não houver conteúdo fictício apresentado como IA; o frontend
continuar funcionando; e referências residuais ao Gemini forem eliminadas ou justificadas.

**Estado em 2026-09-28:** todos os itens acima atendidos no código, exceto o fallback, que foi
corrigido para `nvidia/nemotron-3-ultra-550b-a55b` porque o ID Nano original saiu de operação.
Ressalva: os endpoints não estão publicados em produção, então "endpoint de produção" ainda
não existe para ser avaliado. Ver `docs/AUDIT_PRODUCTION_RUNTIME.md`.

## 14. Estado da auditoria

- Auditoria baseada na branch `main`.
- Esta etapa documenta o estado e a arquitetura alvo.
- Nenhuma troca de provider foi executada nesta etapa.

## 15. Modelos adotados — corrigido por medição

A escolha inicial (`nemotron-3-nano-30b-a3b` como fallback) foi feita por consulta à
documentação. A validação contra a API ao vivo mostrou que esse ID **não existe mais**.
Os IDs não são derivados da documentação: são medidos.

### Catálogo ao vivo

`GET https://integrate.api.nvidia.com/v1/models` devolve 82 modelos, mas a maioria retorna
`404 Function not found for account` — estar no catálogo não garante acesso. Só 2 modelos
funcionam nesta conta: o Super e o Ultra.

### Candidatos testados como fallback

| ID | Resultado medido |
|---|---|
| `nvidia/nemotron-3-nano-30b-a3b` (configurado antes) | **410 Gone** — `end of life on 2026-09-01T09:00:00Z` |
| `nvidia/nemotron-nano-3-30b-a3b` (nome invertido, está no catálogo) | **404** — `Function '<uuid>': Not found for account` |
| `nvidia/nemotron-3.5-lightning-30b-a3b` | **8 timeouts de 60 s** em payloads reais; passou em JSON pequeno, mas não entrega trabalho de endpoint |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` | **503 em 7 de 11** — `ResourceExhausted: Worker local total request limit reached` |
| `nvidia/nemotron-4-340b-instruct` | **404** — não provisionado |
| `nvidia/nemotron-3-ultra-550b-a55b` | **PASS** — 7/7 nos schemas reais do app |

Detalhe que derrubou a classe 30B-A3B: o "lightning" gastou 26 s para 966 tokens enquanto o
Super gastou 3,6 s para 471. O nome não corresponde ao comportamento, e um fallback que não
entrega payload médio dentro de 60 s é inútil justamente no cenário em que ele existe.

### Configuração final

~~~text
NIM_PRIMARY_MODEL="nvidia/nemotron-3-super-120b-a12b"
NIM_FALLBACK_MODEL="nvidia/nemotron-3-ultra-550b-a55b"
NIM_TIMEOUT_MS="60000"
~~~

O fallback saiu da família Nano. É uma troca deliberada: resiliência acima de economia e de
fidelidade ao nome. A razão é objetiva — não existe mais nenhum modelo Nano utilizável nesta
conta.

### Comportamento do fallbackultra, medido

Nos schemas reais dos 9 endpoints o Ultra passou em 7 de 7. Em prompt degenerado de "ecoar
template" ele duplica o prefixo e quebra o parse estrito em 4 de 4:

~~~text
{"status":"{"status":"NIM_OK" }
~~~

O app não envia prompts degenerados, então isso não afeta os endpoints atuais. Está
registrado em `docs/AUDIT_PRODUCTION_RUNTIME.md` como risco 6, com a recomendação de logar o
`content` bruto quando o parse falhar.

### Sobre 503 e rate limit

Os HTTP 503 observados são **saturação de worker por rajada**, não falha de JSON mode. Com
espaçamento de 3 s entre chamadas, 12/12 requisições deram `200`. Diagnóstico correto importa:
tratar 503 como "modelo quebrado" levaria a trocar um modelo que funciona.

## 16. Implementação e validação

### Provider (`src/server/ai.ts`)

- `POST {NIM_BASE_URL}/v1/chat/completions`, `Authorization: Bearer`
- `temperature: 0.4`; `response_format: {type:'json_object'}` quando o endpoint pede JSON
- timeout com `AbortController` + `clearTimeout`, respeitando `NIM_TIMEOUT_MS`
- `generateWithFallback` tenta o principal e, em qualquer erro, tenta o fallback
- falha dupla vira erro explícito: `IA indisponível. Modelo principal: ... Fallback: ...`
- `parseAIJson` falha de forma explícita em resposta inválida, sem inventar conteúdo
- chave lida de `NIM_API_KEY`, com `NVIDIA_API_KEY` como alias
- **remoção da guarda `requested.startsWith('gemini')`**: era inalcançável, já que os 9
  endpoints só passam IDs Nemotron. Era a última referência a Gemini em código executável

### Testes executados (evidência observada)

| Teste | Resultado |
|---|---|
| Chamada mínima ao principal | `HTTP 200`, 3.794 s, conteúdo `NIM_OK` |
| JSON mode no principal | `HTTP 200`, parse estrito **PASS** |
| Prompt real de `/interpret-idea`, 3 rodadas | `200`, soma das durações = 45 min exato nas 3 |
| **Fallback com falha forçada do principal** | `[AI] Modelo principal falhou (nvidia/bogus-model-forced-failure). Tentando fallback nvidia/nemotron-3-ultra-550b-a55b.` → `200` em 1.494 s, JSON válido |
| `npm install` | **PASS** (142 pacotes, 0 vulnerabilidades) |
| `npm run lint` (`tsc --noEmit`) | **PASS**, rc=0 |
| `npm run build` | **PASS**, 1679 módulos |

Nota de método: o teste de fallback exigiu definir `process.env.NIM_PRIMARY_MODEL` **antes**
do import de `ai.ts`. Em ESM os imports são içados para cima, então atribuir a variável depois
do import não surte efeito e o teste passa a exercitar o principal — um falso verde. A ordem
correta foi adotada no probe e o resultado foi reconfirmado.

### Referências residuais a Gemini

| Local | Tipo | Decisão |
|---|---|---|
| `src/server/ai.ts` | código executável | **removido** (guarda inalcançável) |
| `server.ts:155` | comentário obsoleto | **corrigido** para NVIDIA NIM |
| `metadata.json` | manifesto do AI Studio, não executado | **mantido** — `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` descreve um SDK que não está mais no projeto. Não foi alterado porque não há como saber o token válido equivalente sem inventar, e o projeto é implantado no Cloudflare, não no AI Studio. Requer decisão explícita. |
| `docs/AUDIT_AI_NVIDIA_NIM.md` | histórico | mantido por rastreabilidade |

### Mocks e dados fictícios

Varredura por `mock`, `mockData`, `demo`, `fake`, `sample`, `hardcoded`, `placeholder` em todo
`src/`: **nenhuma resposta de IA fictícia**. Os hits são atributos `placeholder=` de inputs e
falsos positivos de `demo` dentro de `NewEpisodeModal`. A única massa de dados fictícios é a de
seeds em `src/server/db.ts`, tratada em `docs/AUDIT_PRODUCTION_RUNTIME.md`.

## 17. Pendências conhecidas

1. **Sem backend em produção.** Os 9 endpoints retornam `405` porque só o `dist/` foi
   publicado. A camada de IA está correta e verificada, mas não está no ar. Detalhes em
   `docs/AUDIT_PRODUCTION_RUNTIME.md`.
2. **Sem retry antes do fallback.** Um 503 transitório de ~700 ms consome o fallback sem
   necessidade. Recomendado 1 retry em 503/429 antes de trocar de modelo.
3. **`NIM_TIMEOUT_MS=60000` no limite.** O principal estourou 60 s em 1 de 12 chamadas.
4. **`NIM_API_KEY` e `NVIDIA_API_KEY` divergem em 1 caractere.** Funciona porque
   `NIM_API_KEY` tem precedência, mas é armadilha latente.
5. **Schema de `suggestionApplied` indefinido.** O prompt do servidor pede
   `suggestionApplied: null`, então o botão "Aplicar ao Episódio" do Copiloto permanece inerte.
   Escolher o schema é decisão de produto.