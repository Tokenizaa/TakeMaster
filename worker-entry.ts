import { db, DbError } from './src/server/db';
import { checkSupabaseConnection, describeNimConfig, describeSupabaseConfig } from './src/server/supabase';
import { ai, parseAIJson } from './src/server/ai';
import { initializeMonitoring, recordRequest, incrementErrorCount, getHealthStatus, isReady, runRecoveryTests, getSliSloDefinitions, checkAlertConditions } from './src/server/monitoring';
import type { ExportedHandler } from '@cloudflare/workers-types';

interface Env {
  ASSETS: any;
  NODE_ENV: string;
  CF_WORKER: string;
  NIM_BASE_URL: string;
  NIM_PRIMARY_MODEL: string;
  NIM_FALLBACK_MODEL: string;
  NIM_TIMEOUT_MS: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NIM_API_KEY: string;
}

type FetchHandler = ExportedHandler<Env>['fetch'];

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function errorResponse(message: string, status = 500, code?: string): Response {
  return jsonResponse({ error: message, code }, status);
}

async function parseBody(request: any): Promise<any> {
  const text = await request.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

const workerStartedAt = Date.now();
// Initialize monitoring service
initializeMonitoring();

const handleRequest = async (request: any, env: Env, ctx: any) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // --- Healthcheck ---
    if (path === '/api/health' && method === 'GET') {
      const health = await getHealthStatus();
      return jsonResponse(health, health.status === 'ok' ? 200 : 503);
    }
    
    // --- Readiness check ---
    if (path === '/api/ready' && method === 'GET') {
      const isReady = await isReady(); // This calls our monitoring isReady function
      return jsonResponse({ status: isReady ? 'ready' : 'not-ready' }, isReady ? 200 : 503);
    }
    
    // --- Recovery test endpoint ---
    if (path === '/api/recovery-test' && method === 'POST') {
      const results = await runRecoveryTests();
      return jsonResponse(results, results.summary.failed === 0 ? 200 : 503);
    }
    
    // --- Metrics endpoint ---
    if (path === '/api/metrics' && method === 'GET') {
      const metricsData = getMetrics();
      const sloData = getSliSloDefinitions();
      const alerts = checkAlertConditions();
      
      // Format as Prometheus-like metrics for simplicity
      let prometheusMetrics = `# HELP takemaster_requests_total Total number of requests\n# TYPE takemaster_requests_total counter\n`;
      prometheusMetrics += `takemaster_requests_total ${metricsData.requestsTotal}\n`;
      
      prometheusMetrics += `# HELP takemaster_error_count Total number of errors\n# TYPE takemaster_error_count counter\n`;
      prometheusMetrics += `takemaster_error_count ${metricsData.errorCount}\n`;
      
      prometheusMetrics += `# HELP takemaster_programs_total Total number of programs\n# TYPE takemaster_programs_total gauge\n`;
      prometheusMetrics += `takemaster_programs_total ${metricsData.programsTotal}\n`;
      
      prometheusMetrics += `# HELP takemaster_participants_total Total number of participants\n# TYPE takemaster_participants_total gauge\n`;
      prometheusMetrics += `takemaster_participants_total ${metricsData.participantsTotal}\n`;
      
      prometheusMetrics += `# HELP takemaster_episodes_total Total number of episodes\n# TYPE takemaster_episodes_total gauge\n`;
      prometheusMetrics += `takemaster_episodes_total ${metricsData.episodesTotal}\n`;
      
      prometheusMetrics += `# HELP takemaster_supabase_connected Supabase connection status (1=connected, 0=disconnected)\n# TYPE takemaster_supabase_connected gauge\n`;
      prometheusMetrics += `takemaster_supabase_connected ${metricsData.supabaseConnectionStatus === true ? 1 : 0}\n`;
      
      prometheusMetrics += `# HELP takemaster_nim_configured NIM configuration status (1=configured, 0=not configured)\n# TYPE takemaster_nim_configured gauge\n`;
      prometheusMetrics += `takemaster_nim_configured ${(metricsData.nimPrimaryConfigured || metricsData.nimFallbackConfigured) ? 1 : 0}\n`;
      
      // Add alert information
      prometheusMetrics += `# HELP takemaster_alerts_active Number of active alerts\n# TYPE takemaster_alerts_active gauge\n`;
      prometheusMetrics += `takemaster_alerts_active ${alerts.length}\n`;
      
      return new Response(prometheusMetrics, {
        status: 200,
        headers: { 'content-type': 'text/plain' }
      });
    }

    // --- Programs / Shows ---
    if (path === '/api/programs' || path === '/api/shows') {
      if (method === 'GET') {
        return jsonResponse(await db.getPrograms());
      }
      if (method === 'POST') {
        const body = await parseBody(request);
        const now = new Date().toISOString();
        const newProgram = {
          ...body,
          id: body.id || `prog-${crypto.randomUUID()}`,
          legacy_id: body.legacy_id || body.id || `prog-${crypto.randomUUID()}`,
          createdAt: now,
          updatedAt: now,
        };
        try {
          const saved = await db.saveProgram(newProgram);
          return jsonResponse(saved, 201);
        } catch (error: any) {
          // Record error in monitoring
          incrementErrorCount();
          
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
    }

    const programMatch = path.match(/^\/(api\/(?:programs|shows)\/([^/]+))$/);
    if (programMatch) {
      const id = programMatch[2];
      if (method === 'GET') {
        const prog = await db.getProgram(id);
        if (!prog) return errorResponse('Programa não encontrado', 404);
        return jsonResponse(prog);
      }
      if (method === 'PUT') {
        const body = await parseBody(request);
        try {
          const saved = await db.saveProgram({ ...body, id });
          return jsonResponse(saved);
        } catch (error: any) {
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
      if (method === 'DELETE') {
        try {
          return jsonResponse({ success: await db.deleteProgram(id) });
        } catch (error: any) {
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
    }

    // --- Participants / Guests ---
    if (path === '/api/participants' || path === '/api/guests') {
      if (method === 'GET') {
        const programId = url.searchParams.get('programId') || undefined;
        return jsonResponse(await db.getParticipants(programId));
      }
      if (method === 'POST') {
        const body = await parseBody(request);
        const now = new Date().toISOString();
        const newParticipant = {
          ...body,
          id: body.id || `part-${crypto.randomUUID()}`,
          legacy_id: body.legacy_id || body.id || `part-${crypto.randomUUID()}`,
          createdAt: now,
        };
        try {
          return jsonResponse(await db.saveParticipant(newParticipant), 201);
        } catch (error: any) {
          // Record error in monitoring
          incrementErrorCount();
          
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
    }

    const participantMatch = path.match(/^\/(api\/(?:participants|guests)\/([^/]+))$/);
    if (participantMatch) {
      const id = participantMatch[2];
      if (method === 'GET') {
        const part = await db.getParticipant(id);
        if (!part) return errorResponse('Participante não encontrado', 404);
        return jsonResponse(part);
      }
      if (method === 'PUT') {
        const body = await parseBody(request);
        try {
          return jsonResponse(await db.saveParticipant({ ...body, id }));
        } catch (error: any) {
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
      if (method === 'DELETE') {
        try {
          return jsonResponse({ success: await db.deleteParticipant(id) });
        } catch (error: any) {
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
    }

    // --- Episodes ---
    if (path === '/api/episodes') {
      if (method === 'GET') {
        const programId = url.searchParams.get('programId') || undefined;
        return jsonResponse(await db.getEpisodes(programId));
      }
      if (method === 'POST') {
        const body = await parseBody(request);
        const now = new Date().toISOString();
        const ep = {
          ...body,
          id: body.id || `ep-${crypto.randomUUID()}`,
          legacy_id: body.legacy_id || body.id || `ep-${crypto.randomUUID()}`,
          createdAt: now,
          updatedAt: now,
        };
        try {
          return jsonResponse(await db.saveEpisode(ep), 201);
        } catch (error: any) {
          // Record error in monitoring
          incrementErrorCount();
          
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
    }

    const episodeMatch = path.match(/^\/api\/episodes\/([^/]+)$/);
    if (episodeMatch) {
      const id = episodeMatch[1];
      if (method === 'GET') {
        const ep = await db.getEpisode(id);
        if (!ep) return errorResponse('Episódio não encontrado', 404);
        return jsonResponse(ep);
      }
      if (method === 'PUT') {
        const body = await parseBody(request);
        try {
          return jsonResponse(await db.saveEpisode({ ...body, id }));
        } catch (error: any) {
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
      if (method === 'DELETE') {
        try {
          return jsonResponse({ success: await db.deleteEpisode(id) });
        } catch (error: any) {
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
    }

    // --- Agenda ---
    if (path === '/api/agenda') {
      if (method === 'GET') {
        return jsonResponse(await db.getAgendaEvents());
      }
      if (method === 'POST') {
        const body = await parseBody(request);
        const event = { ...body, id: body.id || `ag-${crypto.randomUUID()}` };
        try {
          return jsonResponse(await db.saveAgendaEvent(event), 201);
        } catch (error: any) {
          // Record error in monitoring
          incrementErrorCount();
          
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
    }

    const agendaMatch = path.match(/^\/api\/agenda\/([^/]+)$/);
    if (agendaMatch && method === 'DELETE') {
      try {
        return jsonResponse({ success: await db.deleteAgendaEvent(agendaMatch[1]) });
      } catch (error: any) {
        if (error instanceof DbError) {
          return errorResponse(error.message, error.status, error.code);
        }
        return errorResponse(error.message || 'Erro interno');
      }
    }

    // --- Library ---
    if (path === '/api/library') {
      if (method === 'GET') {
        return jsonResponse(await db.getLibraryAssets());
      }
      if (method === 'POST') {
        const body = await parseBody(request);
        const asset = { ...body, id: body.id || `lib-${crypto.randomUUID()}` };
        try {
          return jsonResponse(await db.saveLibraryAsset(asset), 201);
        } catch (error: any) {
          // Record error in monitoring
          incrementErrorCount();
          
          if (error instanceof DbError) {
            return errorResponse(error.message, error.status, error.code);
          }
          return errorResponse(error.message || 'Erro interno');
        }
      }
    }

    const libraryMatch = path.match(/^\/api\/library\/([^/]+)$/);
    if (libraryMatch && method === 'DELETE') {
      try {
        return jsonResponse({ success: await db.deleteLibraryAsset(libraryMatch[1]) });
      } catch (error: any) {
        if (error instanceof DbError) {
          return errorResponse(error.message, error.status, error.code);
        }
        return errorResponse(error.message || 'Erro interno');
      }
    }

    // --- AI Endpoints ---
    if (path.startsWith('/api/ai/')) {
      const body = await parseBody(request);

if (path === '/api/ai/assist' && method === 'POST') {
          const { episode, userPrompt, currentTab, activeBlockId, activeQuestionId } = body;
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

          try {
            const response = await ai.models.generateContent({
              model: env.NIM_PRIMARY_MODEL,
              contents: prompt,
              config: { responseMimeType: 'application/json' },
            });
            return jsonResponse(parseAIJson(response.text));
          } catch (error: any) {
            // Record error in monitoring
            incrementErrorCount();
            console.error('Error in AI assistant:', error);
            return errorResponse(error.message || 'Falha no Copiloto IA');
          }
        }

if (path === '/api/ai/interpret-idea' && method === 'POST') {
          const { idea, programTitle, programFormat, durationMin, existingParticipants } = body;
          const prompt = `Você é um Produtor Executivo e Diretor Audiovisual sênior de televisão e streaming.
O usuário descreveu uma ideia para produzir um episódio:

IDEIA DO PRODUTOR: "${idea}"
PROGRAMA: "${programTitle || 'TakeMaster Studio'}"
FORMATO BASE: "${programFormat || 'Detectar automaticamente'}"
DURAÇÃO APROXIMADA DESEJADA: ${durationMin || 45} minutos
PARTICIPANTES JÁ CADASTRADOS NO PROGRAMA: ${JSON.stringify(existingParticipants || [])}

Sua tarefa:
1. Propor um título atrativo e profissional para o episódio.
2. Detectar/sugerir o formato ideal.
3. Identificar os participantes necessários.
4. Estruturar os QUADROS / SEGMENTOS narrativos do episódio.

Responda ESTRITAMENTE em formato JSON:
{
  "title": "string",
  "suggestedFormat": "string",
  "estimatedDurationMin": number,
  "participants": [{"name": "string", "type": "string", "role": "string"}],
  "segments": [{"title": "string", "type": "string", "estimatedDurationMin": number, "objective": "string"}]
}`;

          try {
            const response = await ai.models.generateContent({
              model: env.NIM_PRIMARY_MODEL,
              contents: prompt,
              config: { responseMimeType: 'application/json' },
            });
            return jsonResponse(parseAIJson(response.text));
          } catch (error: any) {
            // Record error in monitoring
            incrementErrorCount();
            console.error('Error in interpret-idea:', error);
            return errorResponse(error.message || 'Falha ao interpretar ideia');
          }
        }

if (path === '/api/ai/diagnose' && method === 'POST') {
         const { idea, participants, format, durationMin, objective, programTitle } = body;
         const prompt = `Você é um Produtor Executivo e Supervisor de Conteúdo Audiovisual sênior.
Analise esta proposta de produção para o programa "${programTitle || 'TakeMaster'}":

FORMATO: "${format}"
DURAÇÃO ALVO: ${durationMin || 45} minutos
IDEIA: "${idea}"
PARTICIPANTES: ${JSON.stringify(participants || [])}
OBJETIVO: "${objective || 'Engajar e impactar a audiência'}"
 
Gere um DIAGNÓSTICO EDITORIAL aprofundado.
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

         try {
           const response = await ai.models.generateContent({
             model: env.NIM_PRIMARY_MODEL,
             contents: prompt,
             config: { responseMimeType: 'application/json' },
           });
           return jsonResponse(parseAIJson(response.text));
         } catch (error: any) {
           console.error('Error generating diagnosis:', error);
           return errorResponse(error.message || 'Falha ao gerar diagnóstico editorial');
         }
       }

if (path === '/api/ai/research' && method === 'POST') {
         const { participants, programTitle, format, idea, diagnosis } = body;
         const prompt = `Você é um Pesquisador Jornalístico e de Produção Audiovisual.
Com base nas informações abaixo, estruture um Dossiê de Pesquisa e Checagem Factual.

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
  "sources": [{"id": "string", "title": "string", "url": "string", "detail": "string", "status": "CONFIRMADO" | "NÃO CONFIRMADO" | "PERGUNTAR AO CONVIDADO", "category": "string"}]
}`;

         try {
           const response = await ai.models.generateContent({
             model: env.NIM_PRIMARY_MODEL,
             contents: prompt,
             config: { responseMimeType: 'application/json' },
           });
           return jsonResponse(parseAIJson(response.text));
         } catch (error: any) {
           console.error('Error generating research:', error);
           return errorResponse(error.message || 'Falha ao gerar pesquisa');
         }
       }

if (path === '/api/ai/outline' && method === 'POST') {
         const { idea, programTitle, format, targetDurationMin, participants, diagnosis, research, cameras } = body;
         const targetMinutes = targetDurationMin || 45;
         const prompt = `Você é um Roteirista Chefe e Diretor de TV.
Gere os QUADROS / SEGMENTOS NARRATIVOS e as PERGUNTAS / DINÂMICAS COM REPIQUES INTELIGENTES.

PROGRAMA: "${programTitle || 'TakeMaster'}"
FORMATO: "${format || 'Entrevista'}"
DURAÇÃO TOTAL ALVO: ${targetMinutes} minutos
PARTICIPANTES: ${JSON.stringify(participants || [])}
CÂMERAS DISPONÍVEIS: ${JSON.stringify(cameras || [])}
IDEIA: "${idea}"
DIAGNÓSTICO EDITORIAL: ${JSON.stringify(diagnosis || {})}
PESQUISA: ${JSON.stringify(research || {})}

Retorne ESTRITAMENTE em formato JSON com o schema:
{
  "segments": [{"id": "string", "order": 1, "title": "string", "type": "string", "estimatedDurationMin": number, "objective": "string", "transitionText": "string"}],
  "questions": [{"id": "string", "segmentId": "string", "targetParticipantName": "string", "order": 1, "text": "string", "objective": "string", "suggestedCamera": "string", "eyeDirection": "string", "followUps": [{"id": "string", "triggerCondition": "string", "actionOrQuestion": "string", "tag": "string"}]}]
}`;

         try {
           const response = await ai.models.generateContent({
             model: env.NIM_PRIMARY_MODEL,
             contents: prompt,
             config: { responseMimeType: 'application/json' },
           });
           return jsonResponse(parseAIJson(response.text));
         } catch (error: any) {
           console.error('Error generating outline:', error);
           return errorResponse(error.message || 'Falha ao gerar pauta e quadros');
         }
       }

if (path === '/api/ai/script' && method === 'POST') {
         const { episode, program } = body;
         const prompt = `Você é um Diretor de TV e Roteirista Chefe de Produção Audiovisual.
Escreva o ROTEIRO COMPLETO, cronológico e com DIREÇÃO DE CÂMERAS CONTEXTUAL.

PROGRAMA: "${program?.title || episode?.title}"
FORMATO: "${episode?.format}"
DURAÇÃO: ${episode?.targetDurationMin} minutos
PARTICIPANTES: ${JSON.stringify(episode?.participants || [])}
QUADROS / SEGMENTOS: ${JSON.stringify(episode?.segments || [])}
PERGUNTAS E REPIQUES: ${JSON.stringify(episode?.questions || [])}
CÂMERAS DISPONÍVEIS: ${JSON.stringify(episode?.cameras || program?.cameras || [])}

Retorne ESTRITAMENTE em formato JSON com o schema:
{"script": [{"id": "string", "segmentId": "string", "timestamp": "00:00", "type": "string", "camera": "string", "alternativeCamera": "string", "speaker": "string", "targetPerson": "string", "eyeDirection": "string", "shotType": "string", "content": "string", "directionalMarkers": ["string"], "isTeleprompter": boolean, "questionRefId": "string"}]} `;

         try {
           const response = await ai.models.generateContent({
             model: env.NIM_PRIMARY_MODEL,
             contents: prompt,
             config: { responseMimeType: 'application/json' },
           });
           return jsonResponse(parseAIJson(response.text));
         } catch (error: any) {
           console.error('Error generating script:', error);
           return errorResponse(error.message || 'Falha ao escrever roteiro');
         }
       }

if (path === '/api/ai/repiques' && method === 'POST') {
         const { questionText, targetParticipant, context, format } = body;
         const prompt = `Você é um entrevistador investigativo e diretor audiovisual.
Para a pergunta: "${questionText}"
Destinada a: "${targetParticipant || 'Participante'}"
Contexto: "${context || ''}"
Formato do programa: "${format || 'Entrevista'}"
 
Gere 3 a 5 REPIQUES INTELIGENTES.
Retorne em formato JSON:
{"followUps": [{"id": "string", "triggerCondition": "string", "actionOrQuestion": "string", "tag": "string"}]}`;

         try {
           const response = await ai.models.generateContent({
             model: env.NIM_PRIMARY_MODEL,
             contents: prompt,
             config: { responseMimeType: 'application/json' },
           });
           return jsonResponse(parseAIJson(response.text));
         } catch (error: any) {
           console.error('Error generating repiques:', error);
           return errorResponse(error.message || 'Falha ao gerar repiques');
         }
       }

if (path === '/api/ai/shorts' && method === 'POST') {
         const { episode } = body;
         const prompt = `Você é um Estrategista de Conteúdo Digital e Produtor de Cortes/Shorts.
Analise o roteiro e os participantes reais deste episódio e planeje 4 CORTES DE ALTO IMPACTO.

EPISÓDIO: "${episode.title}"
FORMATO: "${episode.format}"
PARTICIPANTES: ${JSON.stringify(episode.participants || [])}
ROTEIRO: ${JSON.stringify(episode.script || [])}
PERGUNTAS: ${JSON.stringify(episode.questions || [])}

Retorne em formato JSON:
{"shorts": [{"id": "string", "title": "string", "hook": "string", "generatingQuestion": "string", "targetParticipant": "string", "estimatedDuration": "30-60s", "status": "Planejado", "notes": "string"}]}`;

         try {
           const response = await ai.models.generateContent({
             model: env.NIM_PRIMARY_MODEL,
             contents: prompt,
             config: { responseMimeType: 'application/json' },
           });
           return jsonResponse(parseAIJson(response.text));
         } catch (error: any) {
           console.error('Error generating shorts:', error);
           return errorResponse(error.message || 'Falha ao planejar shorts');
         }
       }

if (path === '/api/ai/editor-script' && method === 'POST') {
         const { episode } = body;
         const prompt = `Você é um Diretor de Pós-Produção e Montador de Vídeo Sênior.
Sintetize um ROTEIRO DE EDIÇÃO cronológico, técnico e enxuto.

EPISÓDIO: "${episode.title}"
FORMATO: "${episode.format}"
PARTICIPANTES: ${JSON.stringify(episode.participants || [])}
CÂMERAS REAIS: ${JSON.stringify(episode.cameras || [])}
ROTEIRO: ${JSON.stringify(episode.script || [])}
MARCADORES DE GRAVAÇÃO AO VIVO: ${JSON.stringify(episode.recordingMarkers || [])}
B-ROLL & MATERIAIS: ${JSON.stringify(episode.assets || [])}

Retorne em formato JSON:
{"editorScript": "string formatada"}`;

         try {
           const response = await ai.models.generateContent({
             model: env.NIM_PRIMARY_MODEL,
             contents: prompt,
             config: { responseMimeType: 'application/json' },
           });
           return jsonResponse(parseAIJson(response.text));
         } catch (error: any) {
           console.error('Error generating editor script:', error);
           return errorResponse(error.message || 'Falha ao sintetizar roteiro de edição');
         }
       }

      return errorResponse('Endpoint IA não encontrado', 404);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response(null, { status: 404 });
  } catch (error: any) {
    // Record error in monitoring
    incrementErrorCount();
    
    if (error instanceof DbError) {
      return errorResponse(error.message, error.status, error.code);
    }
    console.error('[worker] erro:', error);
    return errorResponse(error?.message || 'Erro interno');
  }
};

export default {
  fetch: handleRequest,
};