import dotenv from 'dotenv';
dotenv.config();

type GenerateOptions = { model?: string; contents: string; config?: { responseMimeType?: string } };
type GenerateResponse = { text?: string };

const NIM_BASE_URL = (process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com').replace(/\/$/, '');
const NIM_API_KEY = process.env.NIM_API_KEY || process.env.NVIDIA_API_KEY || '';
const NIM_PRIMARY_MODEL = process.env.NIM_PRIMARY_MODEL || 'nvidia/nemotron-3-super-120b-a12b';
const NIM_FALLBACK_MODEL = process.env.NIM_FALLBACK_MODEL || 'nvidia/nemotron-3-nano-30b-a3b';
const NIM_TIMEOUT_MS = Number(process.env.NIM_TIMEOUT_MS || 60000);

async function callNim(model: string, contents: string, responseMimeType?: string): Promise<GenerateResponse> {
  if (!NIM_API_KEY) throw new Error('NVIDIA NIM não configurado: defina NIM_API_KEY.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NIM_TIMEOUT_MS);
  try {
    const response = await fetch(NIM_BASE_URL + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + NIM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: contents }], temperature: 0.4, ...(responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {}) }),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) throw new Error('NVIDIA NIM HTTP ' + response.status + ': ' + raw.slice(0, 500));
    const data = JSON.parse(raw);
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') throw new Error('NVIDIA NIM retornou uma resposta sem conteúdo.');
    return { text };
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('NVIDIA NIM timeout após ' + NIM_TIMEOUT_MS + 'ms.');
    throw error;
  } finally { clearTimeout(timeout); }
}

async function generateWithFallback(options: GenerateOptions): Promise<GenerateResponse> {
  const requested = options.model || NIM_PRIMARY_MODEL;
  const primary = requested.startsWith('gemini') ? NIM_PRIMARY_MODEL : requested;
  try { return await callNim(primary, options.contents, options.config?.responseMimeType); }
  catch (primaryError: any) {
    console.warn('[AI] Modelo principal falhou (' + primary + '). Tentando fallback ' + NIM_FALLBACK_MODEL + '.');
    if (!NIM_FALLBACK_MODEL || NIM_FALLBACK_MODEL === primary) throw primaryError;
    try { return await callNim(NIM_FALLBACK_MODEL, options.contents, options.config?.responseMimeType); }
    catch (fallbackError: any) { throw new Error('IA indisponível. Modelo principal: ' + (primaryError?.message || primaryError) + '. Fallback: ' + (fallbackError?.message || fallbackError) + '.'); }
  }
}

export const ai = { models: { generateContent: generateWithFallback } };

export function parseAIJson<T>(rawText: string | undefined): T {
  if (!rawText) throw new Error('A IA retornou uma resposta vazia.');
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  try { return JSON.parse(cleaned) as T; }
  catch (error) { throw new Error('A IA retornou JSON inválido: ' + (error instanceof Error ? error.message : String(error))); }
}
