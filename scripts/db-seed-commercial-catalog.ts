import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const names = ["2 ou 10","Alto Valor","As Pessoas Inspiram","Atividade","Beleza e Negócio","Beleza Inteligente","Café com Doc","Caminhos com Franzen","Conexões - Rose Mazuco","Consumidor RS","Conversa Íntima","Cultura em Cena","Debate de Gigantes","Descomplicando","Destinos & Experiências","DNA","Doctor TV","Dois Pontos","Em Movimento","Empodera+","Espelho","Fit Sou","Gabi Palma","Geli","GreNal Show","Inspira Cami","Mãe sem Culpa","Marca Texto","Na Vitrine","Negócios em Foco","Network","Papo 40+","Papo Certo","Papo de Terapeuta","Ponto de Virada","Raiz Cast Pro","RS Play Business","RS Play Sports","Sagrado","Saúde da Coluna","Sintonize","Sports Play","Tendências","Tudo de Bom","Vidas & Direitos","YoYo"];
const slug = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const rows = names.map((name) => ({ slug: slug(name), name, source_name: 'RS Play TV', source_url: 'https://www.rsplay.com.br/', source_scraped_at: new Date().toISOString(), active: true, contractable: true }));
const { error } = await supabase.from('program_catalog').upsert(rows, { onConflict: 'slug' });
if (error) throw error;
const { data: plan, error: planError } = await supabase.from('commercial_plans').upsert({ code: 'program-standard', name: 'Programa', description: 'Acesso operacional a programas contratados individualmente' }, { onConflict: 'code' }).select('id').single();
if (planError) throw planError;
const { data: catalog, error: catalogError } = await supabase.from('program_catalog').select('id').in('slug', rows.map(r => r.slug));
if (catalogError) throw catalogError;
const { error: linkError } = await supabase.from('plan_programs').upsert(catalog.map((p) => ({ plan_id: plan.id, catalog_program_id: p.id })), { onConflict: 'plan_id,catalog_program_id' });
if (linkError) throw linkError;
console.log('Catálogo sincronizado:', rows.length, 'programas');
