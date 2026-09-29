/**
 * Conexão com o Supabase (PostgreSQL) usada pelo backend Express.
 *
 * Por que service_role e nao anon: as 15 tabelas estao com RLS ligado e
 * ZERO policies (decisao da fase 1), entao `anon` cai em deny-all. O backend
 * e a unica superficie de escrita do produto hoje e entra por `service_role`,
 * que tem BYPASSRLS verificado no catalogo. Nao ha usuario no produto ainda.
 *
 * Por que nada de VITE_*: VITE_* e injetado no bundle do navegador. A service
 * role key nao pode chegar no cliente sob nenhuma hipotese. As duas variaveis
 * abaixo so sao lidas em Node.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Nomes das variaveis ausentes. Nunca os valores, nunca um prefixo de chave. */
const missing: string[] = [];
if (!SUPABASE_URL) missing.push('SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

/**
 * Falha explicita e nao silenciosa: um backend que sobe sem configuracao e
 * um backend que responde 200 e devolve [] para tudo. A segunda opcao e o
 * pior modo de falha possivel - parece saudavel e esta vazado.
 */
export const supabaseConfigured = missing.length === 0;

export function describeSupabaseConfig(): { configured: boolean; missing: string[] } {
  return { configured: supabaseConfigured, missing };
}

let client: SupabaseClient | null = null;

/**
 * Cliente unico do processo. `auth: { persistSession: false }` porque nao ha
 * login: sem sessao, sem refresh automatico, sem nada guardado em storage.
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase nao configurado. Defina no ambiente do servidor: ' +
        missing.join(', ') +
        '. (Valores vao por variavel de ambiente; nunca em VITE_* e nunca no bundle do navegador.)'
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'takemaster-backend' } },
    });
  }
  return client;
}

/**
 * Ping real de banco: uma contagem minima em programs. Usado por
 * GET /api/health. Devolve latencia em ms; nunca devolve credencial.
 */
export async function checkSupabaseConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    const { error } = await getSupabase().from('programs').select('id', { count: 'exact', head: true });
    const latencyMs = Date.now() - started;
    if (error) return { connected: false, latencyMs, error: error.message };
    return { connected: true, latencyMs };
  } catch (e) {
    return { connected: false, latencyMs: Date.now() - started, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Estado do NIM para o healthcheck.
 *
 * So `configured`. A chave nunca sai daqui - nem em caso de erro, nem em log,
 * nem no corpo da resposta. A chave real e lida por src/server/ai.ts, que nao
 * e importado por este modulo de proposito.
 */
export function describeNimConfig(): { configured: boolean } {
  return { configured: Boolean(process.env.NIM_API_KEY || process.env.NVIDIA_API_KEY) };
}
