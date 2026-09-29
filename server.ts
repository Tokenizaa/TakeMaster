import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { SupabaseDatabase } from './src/server/supabase-db';
import { ai, parseAIJson } from './src/server/ai';
import {
  Episode, Program, Participant, EditorialDiagnosis, ResearchData, Segment,
  QuestionItem, ScriptItem, PlannedShort, FollowUpItem, AgendaEvent, LibraryAsset
} from './src/types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const db = new SupabaseDatabase();

app.use(express.json({ limit: '15mb' }));

// --- REST Endpoints backed by Supabase ---
app.get(['/api/programs', '/api/shows'], async (req: Request, res: Response) => {
  try { res.json(await db.getPrograms()); } catch (e:any) { res.status(500).json({error:e.message}); }
});
app.get(['/api/programs/:id', '/api/shows/:id'], async (req: Request, res: Response) => {
  try { const prog = await db.getProgram(req.params.id); if (!prog) return res.status(404).json({error:'Programa não encontrado'}); res.json(prog); } catch(e:any){res.status(500).json({error:e.message});}
});
app.post(['/api/programs', '/api/shows'], async (req: Request, res: Response) => {
  try { const now=new Date().toISOString(); const p={...req.body,id:req.body.id||`prog-${crypto.randomUUID()}`,legacy_id:req.body.legacy_id||req.body.id,createdAt:now,updatedAt:now}; const saved=await db.saveProgram(p); res.status(201).json(saved); } catch(e:any){res.status(500).json({error:e.message});}
});
app.put(['/api/programs/:id', '/api/shows/:id'], async (req: Request, res: Response) => {
  try { const saved=await db.saveProgram({...req.body,id:req.params.id,legacy_id:req.body.legacy_id||req.params.id}); res.json(saved); } catch(e:any){res.status(500).json({error:e.message});}
});
app.delete(['/api/programs/:id', '/api/shows/:id'], async (req: Request, res: Response) => {
  try { res.json({success:await db.deleteProgram(req.params.id)}); } catch(e:any){res.status(500).json({error:e.message});}
});

app.get(['/api/participants', '/api/guests'], async (req: Request, res: Response) => {
  try { res.json(await db.getParticipants(req.query.programId as string|undefined)); } catch(e:any){res.status(500).json({error:e.message});}
});
app.get(['/api/participants/:id', '/api/guests/:id'], async (req: Request, res: Response) => {
  try { const p=await db.getParticipant(req.params.id); if(!p)return res.status(404).json({error:'Participante não encontrado'}); res.json(p); } catch(e:any){res.status(500).json({error:e.message});}
});
app.post(['/api/participants', '/api/guests'], async (req: Request, res: Response) => {
  try { const p={...req.body,id:req.body.id||`part-${crypto.randomUUID()}`,legacy_id:req.body.legacy_id||req.body.id||`part-${crypto.randomUUID()}`,createdAt:new Date().toISOString()}; const saved=await db.saveParticipant(p); res.status(201).json(saved); } catch(e:any){res.status(500).json({error:e.message});}
});
app.put(['/api/participants/:id', '/api/guests/:id'], async (req: Request, res: Response) => {
  try { res.json(await db.saveParticipant({...req.body,id:req.params.id,legacy_id:req.body.legacy_id||req.params.id})); } catch(e:any){res.status(500).json({error:e.message});}
});
app.delete(['/api/participants/:id', '/api/guests/:id'], async (req: Request, res: Response) => {
  try { res.json({success:await db.deleteParticipant(req.params.id)}); } catch(e:any){res.status(500).json({error:e.message});}
});

app.get('/api/episodes', async (req: Request, res: Response) => {
  try { res.json(await db.getEpisodes(req.query.programId as string|undefined)); } catch(e:any){res.status(500).json({error:e.message});}
});
app.get('/api/episodes/:id', async (req: Request, res: Response) => {
  try { const ep=await db.getEpisode(req.params.id); if(!ep)return res.status(404).json({error:'Episódio não encontrado'}); res.json(ep); } catch(e:any){res.status(500).json({error:e.message});}
});
app.post('/api/episodes', async (req: Request, res: Response) => {
  try { const ep=req.body as Episode; const saved=await db.saveEpisode({...ep,id:ep.id||`ep-${crypto.randomUUID()}`,legacy_id:ep.legacy_id||ep.id||`ep-${crypto.randomUUID()}`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}); res.status(201).json(saved); } catch(e:any){res.status(500).json({error:e.message});}
});
app.put('/api/episodes/:id', async (req: Request, res: Response) => {
  try { res.json(await db.saveEpisode({...req.body,id:req.params.id,legacy_id:req.body.legacy_id||req.params.id})); } catch(e:any){res.status(500).json({error:e.message});}
});
app.delete('/api/episodes/:id', async (req: Request, res: Response) => {
  try { res.json({success:await db.deleteEpisode(req.params.id)}); } catch(e:any){res.status(500).json({error:e.message});}
});

app.get('/api/agenda', async (req: Request, res: Response) => { try {res.json(await db.getAgendaEvents());} catch(e:any){res.status(500).json({error:e.message});} });
app.post('/api/agenda', async (req: Request, res: Response) => { try {const e={...req.body,id:req.body.id||`ag-${crypto.randomUUID()}`,legacy_id:req.body.legacy_id||req.body.id}; res.status(201).json(await db.saveAgendaEvent(e));} catch(e:any){res.status(500).json({error:e.message});} });
app.delete('/api/agenda/:id', async (req: Request, res: Response) => { try {res.json({success:await db.deleteAgendaEvent(req.params.id)});} catch(e:any){res.status(500).json({error:e.message});} });

app.get('/api/library', async (req: Request, res: Response) => { try {res.json(await db.getLibraryAssets());} catch(e:any){res.status(500).json({error:e.message});} });
app.post('/api/library', async (req: Request, res: Response) => { try {const a={...req.body,id:req.body.id||`lib-${crypto.randomUUID()}`,legacy_id:req.body.legacy_id||req.body.id}; res.status(201).json(await db.saveLibraryAsset(a));} catch(e:any){res.status(500).json({error:e.message});} });

// --- AI Endpoints using NVIDIA NIM (Nemotron 3 Super -> Ultra fallback) ---

// 0. Contextual AI Assistant
app.post('/api/ai/assist', async (req: Request, res: Response) => {
  const { episode, userPrompt, currentTab, activeBlockId, activeQuestionId } = req.body;

  try {
    const prompt = `Você é o Copiloto Editorial e de Direção do TakeMaster.
Responda de forma prática, curta e acionável ao produtor/apresentador.

CONTEXTO DA PRODUÇÃO:
EPISÓDIO: ${episode?.title || ''}
PROGRAMA: ${episode?.programName || episode?.program?.name || ''}
FORMATO: ${episode?.format || ''}
DURAÇÃO: ${episode?.targetDurationMin || episode?.targetDurationMinutes || ''} minutos
PARTICIPANTES: ${JSON.stringify(episode?.participants || [])}
QUADROS: ${JSON.stringify(episode?.segments || episode?.outline || [])}
PERGUNTAS: ${JSON.stringify(episode?.questions || [])}
ABA ATUAL: ${currentTab || ''}
BLOCO ATIVO: ${activeBlockId || ''}
PERGUNTA ATIVA: ${activeQuestionId || ''}

PEDIDO DO USUÁRIO:
${userPrompt || ''}

Não invente fatos sobre pessoas reais. Quando faltar informação, diga o que precisa ser definido.
Retorne JSON:
{"answer":"string","suggestionApplied":null}`;

    const response = await ai.models.generateContent({
      model: process.env.NIM_PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = parseAIJson<{ answer: string; suggestionApplied?: any }>(response.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in AI assistant:', error);
    res.status(500).json({ error: error.message || 'Falha no Copiloto IA' });
  }
});

// 1. Natural Language Idea Interpretation (Section 9 New Episode Flow)
app.post('/api/ai/interpret-idea', async (req: Request, res: Response) => {
  const { idea, programTitle, programFormat, durationMin, existingParticipants } = req.body;

  

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
      model: process.env.NIM_PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseAIJson<any>(response.text);

    res.json(parsed);
  } catch (error: any) {
    console.error('Error in interpret-idea:', error);
    res.status(500).json({ error: error.message || 'Falha ao interpretar ideia' });
  }
});

// 2. Editorial Diagnosis
app.post('/api/ai/diagnose', async (req: Request, res: Response) => {
  const { idea, participants, format, durationMin, objective, programTitle } = req.body;

  

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
      model: process.env.NIM_PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const diagnosis = parseAIJson<EditorialDiagnosis>(response.text);

    res.json(diagnosis);
  } catch (error: any) {
    console.error('Error generating diagnosis:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar diagnóstico editorial' });
  }
});

// 3. Research Generation
app.post('/api/ai/research', async (req: Request, res: Response) => {
  const { participants, programTitle, format, idea, diagnosis } = req.body;

  

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
      model: process.env.NIM_PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const research = parseAIJson<ResearchData>(response.text);

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
      model: process.env.NIM_PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseAIJson<{ segments: Segment[]; questions: QuestionItem[] }>(response.text);

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating outline:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar pauta e quadros' });
  }
});

// 5. Full Script Generation with Dynamic Cameras & Contextual Direction
app.post('/api/ai/script', async (req: Request, res: Response) => {
  const { episode, program } = req.body;

  

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
      model: process.env.NIM_PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseAIJson<{ script: ScriptItem[] }>(response.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating script:', error);
    res.status(500).json({ error: error.message || 'Falha ao escrever roteiro' });
  }
});

// 6. Intelligent Repiques for a single question
app.post('/api/ai/repiques', async (req: Request, res: Response) => {
  const { questionText, targetParticipant, context, format } = req.body;

  

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
      model: process.env.NIM_PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseAIJson<{ followUps: FollowUpItem[] }>(response.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating repiques:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar repiques' });
  }
});

// 7. Planned Shorts / Digital Cuts Planner
app.post('/api/ai/shorts', async (req: Request, res: Response) => {
  const { episode } = req.body;

  

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
      model: process.env.NIM_PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseAIJson<{ shorts: PlannedShort[] }>(response.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating shorts:', error);
    res.status(500).json({ error: error.message || 'Falha ao planejar shorts' });
  }
});

// 8. Editor Script Synthesis (Roteiro de Pós-Produção)
app.post('/api/ai/editor-script', async (req: Request, res: Response) => {
  const { episode } = req.body;

  

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
      model: process.env.NIM_PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = parseAIJson<{ editorScript: string }>(response.text);
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