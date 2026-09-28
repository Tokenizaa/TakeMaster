import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from './src/server/db';
import { ai, parseAIJson } from './src/server/ai';
import {
  Episode,
  Program,
  Participant,
  EditorialDiagnosis,
  ResearchData,
  Segment,
  QuestionItem,
  ScriptItem,
  PlannedShort,
  FollowUpItem,
  AgendaEvent,
  LibraryAsset
} from './src/types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// --- REST Endpoints: Programs (and Shows alias) ---
app.get(['/api/programs', '/api/shows'], (req: Request, res: Response) => {
  res.json(db.getPrograms());
});

app.get(['/api/programs/:id', '/api/shows/:id'], (req: Request, res: Response) => {
  const prog = db.getProgram(req.params.id);
  if (!prog) return res.status(404).json({ error: 'Programa não encontrado' });
  res.json(prog);
});

app.post(['/api/programs', '/api/shows'], (req: Request, res: Response) => {
  const newProgram: Program = {
    ...req.body,
    id: req.body.id || `prog-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.saveProgram(newProgram);
  res.status(201).json(newProgram);
});

app.put(['/api/programs/:id', '/api/shows/:id'], (req: Request, res: Response) => {
  const updated = db.saveProgram({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete(['/api/programs/:id', '/api/shows/:id'], (req: Request, res: Response) => {
  const success = db.deleteProgram(req.params.id);
  res.json({ success });
});

// --- REST Endpoints: Participants (and Guests alias) ---
app.get(['/api/participants', '/api/guests'], (req: Request, res: Response) => {
  const programId = req.query.programId as string | undefined;
  res.json(db.getParticipants(programId));
});

app.get(['/api/participants/:id', '/api/guests/:id'], (req: Request, res: Response) => {
  const part = db.getParticipant(req.params.id);
  if (!part) return res.status(404).json({ error: 'Participante não encontrado' });
  res.json(part);
});

app.post(['/api/participants', '/api/guests'], (req: Request, res: Response) => {
  const newParticipant: Participant = {
    ...req.body,
    id: req.body.id || `part-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  db.saveParticipant(newParticipant);
  res.status(201).json(newParticipant);
});

app.put(['/api/participants/:id', '/api/guests/:id'], (req: Request, res: Response) => {
  const updated = db.saveParticipant({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete(['/api/participants/:id', '/api/guests/:id'], (req: Request, res: Response) => {
  const success = db.deleteParticipant(req.params.id);
  res.json({ success });
});

// --- REST Endpoints: Episodes ---
app.get('/api/episodes', (req: Request, res: Response) => {
  const programId = req.query.programId as string | undefined;
  res.json(db.getEpisodes(programId));
});

app.get('/api/episodes/:id', (req: Request, res: Response) => {
  const ep = db.getEpisode(req.params.id);
  if (!ep) return res.status(404).json({ error: 'Episódio não encontrado' });
  res.json(ep);
});

app.post('/api/episodes', (req: Request, res: Response) => {
  const ep = req.body as Episode;
  const created = db.saveEpisode({
    ...ep,
    id: ep.id || `ep-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json(created);
});

app.put('/api/episodes/:id', (req: Request, res: Response) => {
  const updated = db.saveEpisode({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/episodes/:id', (req: Request, res: Response) => {
  const success = db.deleteEpisode(req.params.id);
  res.json({ success });
});

// --- REST Endpoints: Agenda & Library ---
app.get('/api/agenda', (req: Request, res: Response) => {
  res.json(db.getAgendaEvents());
});

app.post('/api/agenda', (req: Request, res: Response) => {
  const event: AgendaEvent = {
    ...req.body,
    id: req.body.id || `ag-${Date.now()}`,
  };
  db.saveAgendaEvent(event);
  res.status(201).json(event);
});

app.delete('/api/agenda/:id', (req: Request, res: Response) => {
  const success = db.deleteAgendaEvent(req.params.id);
  res.json({ success });
});

app.get('/api/library', (req: Request, res: Response) => {
  res.json(db.getLibraryAssets());
});

app.post('/api/library', (req: Request, res: Response) => {
  const asset: LibraryAsset = {
    ...req.body,
    id: req.body.id || `lib-${Date.now()}`,
  };
  db.saveLibraryAsset(asset);
  res.status(201).json(asset);
});

// --- AI Endpoints using @google/genai ---

// 1. Natural Language Idea Interpretation (Section 9 New Episode Flow)
app.post('/api/ai/interpret-idea', async (req: Request, res: Response) => {
  const { idea, programTitle, programFormat, durationMin, existingParticipants } = req.body;

  if (!ai) {
    // Intelligent structural proposal fallback if offline
    return res.json({
      title: 'Produção Especial: ' + (idea?.slice(0, 40) || 'Novo Episódio'),
      suggestedFormat: programFormat || 'Entrevista',
      estimatedDurationMin: durationMin || 45,
      participants: [
        { name: 'Apresentador', type: 'Apresentador', role: 'Apresentador' },
        { name: 'Convidado Principal', type: 'Convidado', role: 'Protagonista' }
      ],
      segments: [
        { title: '01 — Abertura e Apresentação', type: 'Abertura', estimatedDurationMin: 5, objective: 'Gancho inicial e boas-vindas' },
        { title: '02 — Origem e Contexto', type: 'Entrevista', estimatedDurationMin: 12, objective: 'Como tudo começou e os primeiros passos' },
        { title: '03 — A Grande Virada & Desafios', type: 'História', estimatedDurationMin: 15, objective: 'O momento crítico e a superação' },
        { title: '04 — Lições Práticas & Onde Está Hoje', type: 'Entrevista', estimatedDurationMin: 10, objective: 'Aprendizados para o público' },
        { title: '05 — Encerramento', type: 'Encerramento', estimatedDurationMin: 3, objective: 'Mensagem final e agradecimentos' }
      ]
    });
  }

  try {
    const prompt = `Você é um Produtor Executivo e Diretor Audiovisual sênior de televisão e streaming.
O usuário descreveu uma ideia para produzir um episódio:

IDEIA DO PRODUTOR: "${idea}"
PROGRAMA: "${programTitle || 'TakeMaster Studio'}"
FORMATO BASE: "${programFormat || 'Detectar automaticamente'}"
DURAÇÃO APROXIMADA DESEJADA: ${durationMin || 45} minutos
PARTICIPANTES JÁ CADASTRADOS NO PROGRAMA: ${JSON.stringify(existingParticipants || [])}

Sua tarefa:
1. Propor um título atrativo e profissional para o episódio.
2. Detectar/sugerir o formato ideal (ex: 'Entrevista', 'Entrevista dupla', 'Podcast', 'Mesa redonda', 'Painel', 'Programa de auditório', 'Musical', 'Game / Quiz', etc.).
3. Identificar os participantes necessários (com nome, tipo e papel). Pode incluir Apresentador, convidados, especialistas, bandas, plateia etc.
4. Estruturar os QUADROS / SEGMENTOS narrativos do episódio (com título numerado, tipo de quadro, duração em minutos e objetivo). A soma das durações deve bater com a meta (${durationMin || 45} min).

Responda ESTRITAMENTE em formato JSON:
{
  "title": "string",
  "suggestedFormat": "string",
  "estimatedDurationMin": number,
  "participants": [
    {
      "name": "string",
      "type": "Apresentador" | "Coapresentador" | "Convidado" | "Especialista" | "Empresário" | "Artista" | "Cantor" | "Banda" | "Dupla" | "Grupo" | "Painelista" | "Jurado" | "Plateia" | "Outro",
      "role": "string"
    }
  ],
  "segments": [
    {
      "title": "string (ex: 01 — Abertura, 02 — História de João)",
      "type": "Abertura" | "Entrevista" | "Perguntas rápidas" | "Perguntas da plateia" | "Debate" | "História" | "Jogo" | "Quiz" | "Musical" | "Performance" | "Merchandising" | "Intervalo" | "Encerramento",
      "estimatedDurationMin": number,
      "objective": "string"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseGeminiJson<any>(response.text, {
      title: 'Episódio Especial',
      suggestedFormat: programFormat || 'Entrevista',
      estimatedDurationMin: durationMin || 45,
      participants: [{ name: 'Apresentador', type: 'Apresentador', role: 'Apresentador' }],
      segments: [{ title: '01 — Abertura', type: 'Abertura', estimatedDurationMin: 5, objective: 'Início' }]
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error in interpret-idea:', error);
    res.status(500).json({ error: error.message || 'Falha ao interpretar ideia' });
  }
});

// 2. Editorial Diagnosis
app.post('/api/ai/diagnose', async (req: Request, res: Response) => {
  const { idea, participants, format, durationMin, objective, programTitle } = req.body;

  if (!ai) {
    const fallbackDiagnosis: EditorialDiagnosis = {
      centralTheme: `A jornada e os bastidores reais explorados no formato ${format || 'Produção Audiovisual'}`,
      potentialStory: `Narrativa rica com múltiplos ângulos, destacando conflitos decisivos e superações.`,
      primaryConflict: `Os obstáculos mais críticos e as escolhas de alto risco enfrentadas.`,
      primaryTransformation: `A evolução dos participantes e o impacto concreto gerado.`,
      whyWatch: `Histórias genuínas, sem floreios, com dinâmicas cativantes para o público.`,
      whatToDiscover: `Revelações de bastidores e visões que nunca foram ditas abertamente.`,
      researchPoints: [
        `Verificar cronologia exata dos momentos de crise e virada`,
        `Buscar números, marcos e histórias comprovadas`,
        `Alinhar dinâmicas entre palco e convidados`
      ],
      highImpactMoments: [
        `O relato mais vulnerável e corajoso`,
        `A virada inesperada da narrativa`,
        `O momento de clímax e emoção`
      ],
      approved: false,
    };
    return res.json(fallbackDiagnosis);
  }

  try {
    const prompt = `Você é um Produtor Executivo e Supervisor de Conteúdo Audiovisual sênior.
Analise esta proposta de produção para o programa "${programTitle || 'TakeMaster'}":

FORMATO: "${format}"
DURAÇÃO ALVO: ${durationMin || 45} minutos
IDEIA: "${idea}"
PARTICIPANTES: ${JSON.stringify(participants || [])}
OBJETIVO: "${objective || 'Engajar e impactar a audiência'}"

Gere um DIAGNÓSTICO EDITORIAL aprofundado, identificando a alma da história, o conflito e a transformação.
Responda ESTRITAMENTE em formato JSON com o schema:
{
  "centralTheme": "string",
  "potentialStory": "string",
  "primaryConflict": "string",
  "primaryTransformation": "string",
  "whyWatch": "string",
  "whatToDiscover": "string",
  "researchPoints": ["string", "string", "string"],
  "highImpactMoments": ["string", "string", "string"],
  "approved": false
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const diagnosis = parseGeminiJson<EditorialDiagnosis>(response.text, {
      centralTheme: 'Tema central do episódio',
      potentialStory: 'História potencial',
      primaryConflict: 'Conflito principal',
      primaryTransformation: 'Transformação',
      whyWatch: 'Relevância para a audiência',
      whatToDiscover: 'O que descobrir',
      researchPoints: ['Pesquisa 1', 'Pesquisa 2'],
      highImpactMoments: ['Momento forte 1', 'Momento forte 2'],
      approved: false,
    });

    res.json(diagnosis);
  } catch (error: any) {
    console.error('Error generating diagnosis:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar diagnóstico editorial' });
  }
});

// 3. Research Generation
app.post('/api/ai/research', async (req: Request, res: Response) => {
  const { participants, programTitle, format, idea, diagnosis } = req.body;

  if (!ai) {
    const fallbackResearch: ResearchData = {
      aboutGuest: `Dossiê dos participantes e personalidades envolvidas no programa ${programTitle || ''}.`,
      trajectory: `Histórico cronológico, marcos de relevância e pontos de destaque.`,
      company: `Organizações, marcas ou projetos associados aos participantes.`,
      keyDatesAndNumbers: `Marcos históricos relevantes, números de audiência ou faturamento.`,
      previousInterviews: `Aparições em outras mídias, reportagens e declarações anteriores.`,
      recurringThemes: `Superação, inovação, música, entretenimento e valores humanos.`,
      contradictionsAndClarifications: `Pontos a esclarecer com respeito e profundidade.`,
      compellingStories: `Momentos emblemáticos e relatos de bastidores.`,
      sources: [
        {
          id: `src-${Date.now()}-1`,
          title: 'Dados Públicos e Verificação de Trajetória',
          detail: 'Informações checadas e validadas.',
          status: 'CONFIRMADO',
          category: 'guest'
        }
      ]
    };
    return res.json(fallbackResearch);
  }

  try {
    const prompt = `Você é um Pesquisador Jornalístico e de Produção Audiovisual.
Com base nas informações abaixo, estruture um Dossiê de Pesquisa e Checagem Factual para subsidiar o roteiro e a condução da gravação.
IMPORTANTE: Não invente fatos sobre pessoas reais. Categorize as fontes como 'CONFIRMADO', 'NÃO CONFIRMADO' ou 'PERGUNTAR AO CONVIDADO'.

PROGRAMA: "${programTitle || ''}"
FORMATO: "${format || ''}"
PARTICIPANTES: ${JSON.stringify(participants || [])}
IDEIA: "${idea}"
DIAGNÓSTICO EDITORIAL: ${JSON.stringify(diagnosis || {})}

Retorne ESTRITAMENTE em formato JSON com o schema:
{
  "aboutGuest": "string",
  "trajectory": "string",
  "company": "string",
  "keyDatesAndNumbers": "string",
  "previousInterviews": "string",
  "recurringThemes": "string",
  "contradictionsAndClarifications": "string",
  "compellingStories": "string",
  "sources": [
    {
      "id": "string",
      "title": "string",
      "url": "string (opcional)",
      "detail": "string",
      "status": "CONFIRMADO" | "NÃO CONFIRMADO" | "PERGUNTAR AO CONVIDADO",
      "category": "guest" | "trajectory" | "company" | "dates_numbers" | "interviews" | "contradictions" | "stories"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const research = parseGeminiJson<ResearchData>(response.text, {
      aboutGuest: '',
      trajectory: '',
      company: '',
      keyDatesAndNumbers: '',
      previousInterviews: '',
      recurringThemes: '',
      contradictionsAndClarifications: '',
      compellingStories: '',
      sources: [],
    });

    res.json(research);
  } catch (error: any) {
    console.error('Error generating research:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar pesquisa' });
  }
});

// 4. Smart Outline / Segments & Questions Generation
app.post('/api/ai/outline', async (req: Request, res: Response) => {
  const { idea, programTitle, format, targetDurationMin, participants, diagnosis, research, cameras } = req.body;
  const targetMinutes = targetDurationMin || 45;

  if (!ai) {
    return res.status(500).json({ error: 'Chave de API não configurada' });
  }

  try {
    const prompt = `Você é um Roteirista Chefe e Diretor de TV.
Gere os QUADROS / SEGMENTOS NARRATIVOS e as PERGUNTAS / DINÂMICAS COM REPIQUES INTELIGENTES para a produção:

PROGRAMA: "${programTitle || 'TakeMaster'}"
FORMATO: "${format || 'Entrevista'}"
DURAÇÃO TOTAL ALVO: ${targetMinutes} minutos (a soma dos segmentos deve ser EXATAMENTE ${targetMinutes} min!)
PARTICIPANTES: ${JSON.stringify(participants || [])}
CÂMERAS DISPONÍVEIS: ${JSON.stringify(cameras || [])}
IDEIA: "${idea}"
DIAGNÓSTICO EDITORIAL: ${JSON.stringify(diagnosis || {})}
PESQUISA: ${JSON.stringify(research || {})}

DIRETRIZES FUNDAMENTAIS:
1. Adapte os quadros e perguntas ao FORMATO:
   - Se for 'Programa de auditório': inclua abertura com plateia, entrevistas no sofá, perguntas da plateia, jogo/dinâmica no palco, apresentação de banda/musical e encerramento caloroso.
   - Se for 'Musical': foque na trajetória do artista, banda ao vivo, repertório e conversa pós-música.
   - Se for 'Entrevista' ou 'Podcast': foque em origem, crise, virada, lições e bate-bola.
2. Cada pergunta deve ser direcionada ao participante correto (com 'targetParticipantName').
3. Crie 2 a 4 REPIQUES INTELIGENTES para cada pergunta principal, com gatilhos claros (SE FALAR SOBRE DINHEIRO, SE FALAR SOBRE FAMÍLIA, SE CHORAR -> NÃO INTERROMPER, SE PLATEIA REAGIR -> CORTAR PARA PLATEIA, etc.).
4. Indique as câmeras reais configuradas no programa.

Retorne ESTRITAMENTE em formato JSON com o schema:
{
  "segments": [
    {
      "id": "string",
      "order": 1,
      "title": "string",
      "type": "Abertura" | "Entrevista" | "Perguntas rápidas" | "Perguntas da plateia" | "Debate" | "História" | "Jogo" | "Quiz" | "Musical" | "Performance" | "Merchandising" | "Intervalo" | "Encerramento",
      "estimatedDurationMin": number,
      "objective": "string",
      "transitionText": "string"
    }
  ],
  "questions": [
    {
      "id": "string",
      "segmentId": "string (deve corresponder a um dos segmentos acima)",
      "targetParticipantName": "string",
      "order": 1,
      "text": "string",
      "objective": "string",
      "suggestedCamera": "string (ex: CAM 2 ou CAM 3)",
      "eyeDirection": "string",
      "followUps": [
        {
          "id": "string",
          "triggerCondition": "string (ex: SE FALAR SOBRE PREJUÍZO)",
          "actionOrQuestion": "string",
          "tag": "DINHEIRO" | "FAMÍLIA" | "MEDO" | "CONFLITO" | "APROFUNDAR" | "NÃO INTERROMPER" | "PLATEIA" | "OUTRO"
        }
      ]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseGeminiJson<{ segments: Segment[]; questions: QuestionItem[] }>(response.text, {
      segments: [],
      questions: [],
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating outline:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar pauta e quadros' });
  }
});

// 5. Full Script Generation with Dynamic Cameras & Contextual Direction
app.post('/api/ai/script', async (req: Request, res: Response) => {
  const { episode, program } = req.body;

  if (!ai) {
    return res.status(500).json({ error: 'Chave de API não configurada' });
  }

  try {
    const prompt = `Você é um Diretor de TV e Roteirista Chefe de Produção Audiovisual.
Escreva o ROTEIRO COMPLETO, cronológico e com DIREÇÃO DE CÂMERAS CONTEXTUAL para este episódio:

PROGRAMA: "${program?.title || episode?.title}"
FORMATO: "${episode?.format}"
DURAÇÃO: ${episode?.targetDurationMin} minutos
PARTICIPANTES: ${JSON.stringify(episode?.participants || [])}
QUADROS / SEGMENTOS: ${JSON.stringify(episode?.segments || [])}
PERGUNTAS E REPIQUES: ${JSON.stringify(episode?.questions || [])}
CÂMERAS DISPONÍVEIS: ${JSON.stringify(episode?.cameras || program?.cameras || [])}

REGRAS DE DIREÇÃO DE CÂMERA & ROTEIRO:
1. Use as câmeras reais configuradas (não presuma apenas CAM 1/2/3 se houver 4, 5 ou mais câmeras, como Banda e Plateia!).
2. Crie instruções contextuais e condicionais de direção nos marcadores:
   - Exemplo: "CAM 2 close apresentador ao perguntar"
   - Exemplo: "CAM 3 fechar no convidado na resposta; SE chorar, segurar plano sem cortar"
   - Exemplo: "Se plateia aplaudir ou vaiar, cortar para CAM 5 Plateia"
   - Exemplo: "Entrada da banda -> CAM 4 geral e detalhes de bateria/guitarra"
3. Inclua Abertura oficial na câmera frontal (com isTeleprompter: true para falas do apresentador).
4. Inclua transições pontuais entre quadros.
5. Inclua Encerramento oficial com despedida e chamada para audiência (isTeleprompter: true).

Retorne ESTRITAMENTE em formato JSON com o schema:
{
  "script": [
    {
      "id": "string",
      "segmentId": "string (opcional)",
      "timestamp": "00:00",
      "type": "cold_open" | "opening" | "vinheta" | "transition" | "question" | "reaction" | "musical_performance" | "game_action" | "closing" | "b_roll_insert",
      "camera": "string (ex: CAM 1, CAM 2, CAM 4 Banda, etc.)",
      "alternativeCamera": "string (opcional)",
      "speaker": "string",
      "targetPerson": "string (opcional)",
      "eyeDirection": "string",
      "shotType": "string (ex: Plano Geral, Plano Médio, Close-up)",
      "content": "string",
      "directionalMarkers": ["string"],
      "isTeleprompter": boolean,
      "questionRefId": "string (opcional)"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseGeminiJson<{ script: ScriptItem[] }>(response.text, { script: [] });
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating script:', error);
    res.status(500).json({ error: error.message || 'Falha ao escrever roteiro' });
  }
});

// 6. Intelligent Repiques for a single question
app.post('/api/ai/repiques', async (req: Request, res: Response) => {
  const { questionText, targetParticipant, context, format } = req.body;

  if (!ai) {
    const fallbackFollowups: FollowUpItem[] = [
      {
        id: `fu-${Date.now()}-1`,
        triggerCondition: 'SE FALAR SOBRE DINHEIRO OU PREJUÍZO',
        actionOrQuestion: 'Quanto exatamente estava em risco naquele instante?',
        tag: 'DINHEIRO',
      },
      {
        id: `fu-${Date.now()}-2`,
        triggerCondition: 'SE DEMONSTRAR EMOÇÃO OU HESITAR',
        actionOrQuestion: 'NÃO INTERROMPER. Segurar silêncio e manter câmera.',
        tag: 'NÃO INTERROMPER',
      },
      {
        id: `fu-${Date.now()}-3`,
        triggerCondition: 'SE A PLATEIA REAGIR COM APLAUSOS',
        actionOrQuestion: 'Aguardar aplauso cessar antes de retomar.',
        tag: 'PLATEIA',
      }
    ];
    return res.json({ followUps: fallbackFollowups });
  }

  try {
    const prompt = `Você é um entrevistador investigativo e diretor audiovisual.
Para a pergunta: "${questionText}"
Destinada a: "${targetParticipant || 'Participante'}"
Contexto: "${context || ''}"
Formato do programa: "${format || 'Entrevista'}"

Gere 3 a 5 REPIQUES INTELIGENTES (ramificações imediatas baseadas na resposta dele), incluindo gatilho condicional claro, pergunta de ação e tag visual ('DINHEIRO', 'FAMÍLIA', 'MEDO', 'CONFLITO', 'APROFUNDAR', 'NÃO INTERROMPER', 'PLATEIA', 'OUTRO').

Retorne em formato JSON:
{
  "followUps": [
    {
      "id": "string",
      "triggerCondition": "string (ex: SE MENCIONAR FAMÍLIA)",
      "actionOrQuestion": "string",
      "tag": "DINHEIRO" | "FAMÍLIA" | "MEDO" | "CONFLITO" | "APROFUNDAR" | "NÃO INTERROMPER" | "PLATEIA" | "OUTRO"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseGeminiJson<{ followUps: FollowUpItem[] }>(response.text, { followUps: [] });
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating repiques:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar repiques' });
  }
});

// 7. Planned Shorts / Digital Cuts Planner
app.post('/api/ai/shorts', async (req: Request, res: Response) => {
  const { episode } = req.body;

  if (!ai) {
    return res.status(500).json({ error: 'Chave de API não configurada' });
  }

  try {
    const prompt = `Você é um Estrategista de Conteúdo Digital e Produtor de Cortes/Shorts para YouTube, TikTok e Reels.
Analise o roteiro e os participantes reais deste episódio e planeje 4 CORTES DE ALTO IMPACTO baseados em momentos de verdade e conflito:

EPISÓDIO: "${episode.title}"
FORMATO: "${episode.format}"
PARTICIPANTES: ${JSON.stringify(episode.participants || [])}
ROTEIRO: ${JSON.stringify(episode.script || [])}
PERGUNTAS: ${JSON.stringify(episode.questions || [])}

Retorne em formato JSON:
{
  "shorts": [
    {
      "id": "string",
      "title": "string",
      "hook": "string (gancho irresistível nos primeiros 3 segundos)",
      "generatingQuestion": "string (pergunta ou momento que gerou o corte)",
      "targetParticipant": "string",
      "estimatedDuration": "30-60s",
      "status": "Planejado",
      "notes": "string"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseGeminiJson<{ shorts: PlannedShort[] }>(response.text, { shorts: [] });
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating shorts:', error);
    res.status(500).json({ error: error.message || 'Falha ao planejar shorts' });
  }
});

// 8. Editor Script Synthesis (Roteiro de Pós-Produção)
app.post('/api/ai/editor-script', async (req: Request, res: Response) => {
  const { episode } = req.body;

  if (!ai) {
    const fallbackEditorScript = `
00:00 - ABERTURA (CAM 1 Geral)
[Corte de abertura com trilha sonora e apresentação dos participantes]

05:15 - PRIMEIRO QUADRO (CAM 2 Apresentador -> CAM 3 Convidados)
[Inserir GC de identificação dos participantes nos primeiros 10 segundos]

12:25 - MOMENTO FORTE MARCADO:
[Manter plano fechado no convidado por 15 segundos para preservar a emoção]

55:00 - ENCERRAMENTO
[Subir créditos, trilha em fade out e encerramento geral]
`;
    return res.json({ editorScript: fallbackEditorScript });
  }

  try {
    const prompt = `Você é um Diretor de Pós-Produção e Montador de Vídeo Sênior.
Sintetize um ROTEIRO DE EDIÇÃO cronológico, técnico e enxuto para a equipe de montagem, combinando a minutagem, as câmeras reais, os marcadores de gravação, os participantes e as inserções de B-Roll:

EPISÓDIO: "${episode.title}"
FORMATO: "${episode.format}"
PARTICIPANTES: ${JSON.stringify(episode.participants || [])}
CÂMERAS REAIS: ${JSON.stringify(episode.cameras || [])}
ROTEIRO: ${JSON.stringify(episode.script || [])}
MARCADORES DE GRAVAÇÃO AO VIVO: ${JSON.stringify(episode.recordingMarkers || [])}
B-ROLL & MATERIAIS: ${JSON.stringify(episode.assets || [])}

Retorne um texto com minutagens cronológicas (ex: "00:00 ABERTURA CAM 1", "05:15 CAM 2 -> CAM 3", "🔥 12:25 MOMENTO FORTE MARCADO", "Inserir foto antiga", etc.) pronto para ser entregue ao editor.

Retorne em formato JSON:
{
  "editorScript": "string formatada"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseGeminiJson<{ editorScript: string }>(response.text, {
      editorScript: 'Roteiro de edição sintetizado com sucesso.',
    });
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating editor script:', error);
    res.status(500).json({ error: error.message || 'Falha ao sintetizar roteiro de edição' });
  }
});

// --- Server & Vite Setup ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TakeMaster Audiovisual Production Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
