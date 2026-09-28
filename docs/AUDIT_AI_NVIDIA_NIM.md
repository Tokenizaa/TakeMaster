# TakeMaster — Auditoria da Camada de IA e Migração para NVIDIA NIM

> Auditoria da branch `main`.
> Objetivo: substituir o acoplamento atual ao Gemini por uma camada de provider baseada em NVIDIA NIM.

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
    └── Nemotron Nano — fallback
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
Nemotron Nano
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
        └── Nemotron Nano
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
`Super 3 → resposta; fallbackUsed = false`.

### Super 3 indisponível
`Super 3 → erro/timeout; Nano → resposta; fallbackUsed = true`.

### Ambos indisponíveis
`Super 3 → falha; Nano → falha; API → erro explícito`.

Nenhum conteúdo fake deve ser retornado.

### Resposta inválida
O provider deve tratar parsing e validação sem derrubar o servidor.

## 12. Ordem de implementação

1. Mapear todos os endpoints `/api/ai/*`.
2. Mapear `src/server/ai.ts`.
3. Criar contrato provider-neutral.
4. Implementar NVIDIA NIM.
5. Implementar Super 3 como principal.
6. Implementar Nano como fallback.
7. Migrar endpoint por endpoint.
8. Remover fallbacks fictícios.
9. Remover Gemini.
10. Executar build/typecheck e testes de fluxo.

## 13. Critério de conclusão

A migração será considerada concluída somente quando nenhum endpoint de produção depender diretamente de Gemini; Super 3 for o principal; Nano funcionar como fallback; falha dupla produzir erro explícito; não houver conteúdo fictício apresentado como IA; frontend continuar funcionando; e referências residuais ao Gemini forem eliminadas ou justificadas.

## 14. Estado da auditoria

- Auditoria baseada na branch `main`.
- Esta etapa documenta o estado e a arquitetura alvo.
- Nenhuma troca de provider foi executada nesta etapa.

## 15. Modelos adotados

Para o endpoint hospedado compatível com OpenAI da NVIDIA, a configuração atual usa `nvidia/nemotron-3-super-120b-a12b` como principal e `nvidia/nemotron-3-nano-30b-a3b` como fallback. Os IDs foram conferidos na documentação oficial da NVIDIA em setembro de 2026.

## 16. Implementação inicial registrada

A primeira etapa da migração foi aplicada na branch `main`:
- cliente Gemini removido de `src/server/ai.ts`;
- NVIDIA NIM via Chat Completions implementado;
- Nemotron 3 Super configurado como principal;
- Nemotron 3 Nano configurado como fallback;
- fallback automático por erro/timeout;
- parser JSON agora falha explicitamente em resposta inválida;
- respostas fictícias de indisponibilidade removidas dos endpoints migrados;
- Copiloto IA deixou de retornar texto mockado e passou a usar `/api/ai/assist`;
- dependência `@google/genai` removida;
- `.env.example` atualizado;

A validação de build/typecheck ainda precisa ser executada em ambiente com as dependências instaladas.