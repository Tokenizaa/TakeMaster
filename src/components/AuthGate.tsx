import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';

type CatalogProgram = { id: string; slug: string; name: string; source_name: string; source_url: string | null };

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [catalog, setCatalog] = useState<CatalogProgram[]>([]);
  const [needsOrg, setNeedsOrg] = useState(false);
  const [needsCatalog, setNeedsCatalog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh(access = session?.access_token) {
    if (!access) return;
    setLoading(true);
    try {
      const me = await api.getAuthMe();
      if (!me.organizations?.length) {
        setNeedsOrg(true);
        return;
      }
      setNeedsOrg(false);
      const programs = await api.getPrograms();
      setNeedsCatalog(programs.length === 0);
      if (programs.length === 0) setCatalog(await api.getCatalogPrograms());
    } catch (e: any) {
      setError(e.message || 'Falha ao carregar sua conta');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) refresh(data.session.access_token);
      else setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) refresh(next.access_token);
      else { setLoading(false); setNeedsOrg(false); setNeedsCatalog(false); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submitAuth(mode: 'login' | 'signup') {
    setBusy(true); setError('');
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) setError(result.error.message);
    else if (mode === 'signup' && !result.data.session) setError('Conta criada. Confirme o e-mail para entrar.');
    setBusy(false);
  }

  async function createOrg() {
    setBusy(true); setError('');
    try {
      await api.bootstrapOrganization(orgName);
      setNeedsOrg(false);
      setNeedsCatalog(true);
      setCatalog(await api.getCatalogPrograms());
    } catch (e: any) { setError(e.message || 'Falha ao criar organização'); }
    finally { setBusy(false); }
  }

  async function contract(id: string) {
    setBusy(true); setError('');
    try {
      await api.contractProgram(id);
      window.location.reload();
    } catch (e: any) { setError(e.message || 'Falha ao contratar programa'); }
    finally { setBusy(false); }
  }

  if (!session) return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form onSubmit={e => { e.preventDefault(); submitAuth('login'); }} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div><h1 className="text-2xl font-bold">TakeMaster</h1><p className="text-sm text-slate-400 mt-1">Acesso à plataforma de produção.</p></div>
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
        <input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="w-full py-2.5 rounded-lg bg-purple-600 font-semibold">{busy ? 'Aguarde...' : 'Entrar'}</button>
        <button type="button" disabled={busy} onClick={()=>submitAuth('signup')} className="w-full py-2.5 rounded-lg bg-slate-800 font-semibold">Criar conta</button>
      </form>
    </div>
  );

  if (loading) return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Carregando sua conta...</div>;

  if (needsOrg) return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form onSubmit={e=>{e.preventDefault();createOrg();}} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-bold">Sua organização</h1>
        <p className="text-sm text-slate-400">Crie o espaço de trabalho que receberá os programas contratados.</p>
        <input required value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Nome da empresa / produtora" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="w-full py-2.5 rounded-lg bg-purple-600 font-semibold">{busy ? 'Criando...' : 'Criar organização'}</button>
      </form>
    </div>
  );

  if (needsCatalog) return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Catálogo RS Play</h1><p className="text-sm text-slate-400">Selecione um programa para ativar no seu ambiente.</p></div><button onClick={()=>supabase.auth.signOut()} className="text-sm text-slate-400">Sair</button></div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {catalog.map(p=><div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3"><div><h3 className="font-semibold">{p.name}</h3><p className="text-xs text-slate-500">{p.source_name}</p></div><button disabled={busy} onClick={()=>contract(p.id)} className="px-3 py-2 rounded-lg bg-purple-600 text-xs font-semibold">Contratar</button></div>)}
        </div>
      </div>
    </div>
  );

  return <>{children}</>;
};
