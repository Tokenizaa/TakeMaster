import React from 'react';
import { ArrowRight, Calendar, CheckCircle2, Clock, Film, ListChecks, Plus, Sparkles, Tv } from 'lucide-react';
import { Program, Episode, AgendaEvent } from '../types';

interface DashboardViewProps {
  programs: Program[];
  episodes: Episode[];
  agendaEvents: AgendaEvent[];
  activeProgramId: string;
  onSelectProgram: (id: string) => void;
  onSelectEpisode: (episode: Episode) => void;
  onOpenNewEpisodeModal: (programId?: string) => void;
  onNavigateToPrograms: () => void;
  onNavigateToEpisodes: () => void;
  onNavigateToAgenda: () => void;
}

const statusLabel: Record<string, string> = {
  idea: 'Ideia',
  diagnosis: 'Diagnóstico',
  outline: 'Pauta',
  scripting: 'Roteiro',
  ready: 'Pronto',
  recording: 'Gravando',
  recorded: 'Gravado',
  editing: 'Pós-produção',
  published: 'Publicado',
};

const statusOrder = ['recording', 'ready', 'scripting', 'outline', 'diagnosis', 'idea', 'editing'];

function getNextEpisode(episodes: Episode[]) {
  for (const status of statusOrder) {
    const found = episodes.find((episode) => episode.status === status);
    if (found) return found;
  }
  return episodes[0];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  programs,
  episodes,
  agendaEvents,
  activeProgramId,
  onSelectProgram,
  onSelectEpisode,
  onOpenNewEpisodeModal,
  onNavigateToPrograms,
  onNavigateToEpisodes,
  onNavigateToAgenda,
}) => {
  const activeProgram = programs.find((program) => program.id === activeProgramId) || programs[0];
  const scopedEpisodes = activeProgram ? episodes.filter((episode) => episode.programId === activeProgram.id) : episodes;
  const nextEpisode = getNextEpisode(scopedEpisodes);
  const upcomingEvents = [...agendaEvents]
    .sort((a, b) => String(a.scheduledDate || '').localeCompare(String(b.scheduledDate || '')))
    .slice(0, 4);
  const activeCount = scopedEpisodes.filter((episode) => !['published'].includes(episode.status)).length;
  const recordingCount = scopedEpisodes.filter((episode) => ['recording', 'ready'].includes(episode.status)).length;
  const postCount = scopedEpisodes.filter((episode) => ['recorded', 'editing'].includes(episode.status)).length;\n  const metricCards = [\n    { label: 'Produções ativas', value: activeCount, icon: Film },\n    { label: 'Gravações / prontas', value: recordingCount, icon: CheckCircle2 },\n    { label: 'Em pós-produção', value: postCount, icon: Sparkles },\n    { label: 'Eventos na agenda', value: agendaEvents.length, icon: Calendar },\n  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400 font-bold">RS Play TV · Operação</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-black text-white tracking-tight">Visão geral da produção</h1>
          <p className="mt-2 text-sm text-slate-400">Acompanhe o que precisa acontecer agora, por programa e por etapa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onOpenNewEpisodeModal(activeProgram?.id)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-sm font-bold shadow-lg shadow-amber-950/20">
            <Plus className="w-4 h-4" /> Nova produção
          </button>
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Tv className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Programa em foco</p>
              <p className="text-sm font-bold text-white">{activeProgram?.name || 'Nenhum programa contratado'}</p>
            </div>
          </div>
          <select value={activeProgram?.id || ''} onChange={(e) => e.target.value && onSelectProgram(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 min-w-56">
            {programs.length === 0 && <option value="">Sem programas</option>}
            {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Produções ativas', activeCount, Film],
          ['Gravações / prontas', recordingCount, CheckCircle2],
          ['Em pós-produção', postCount, Sparkles],
          ['Eventos na agenda', agendaEvents.length, Calendar],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <Icon className="w-4 h-4 text-amber-400 mb-3" />
            <p className="text-2xl font-black text-white">{value as number}</p>
            <p className="text-xs text-slate-500 mt-1">{label as string}</p>
          </div>
        ))}
      </section>

      {nextEpisode ? (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold">Próxima ação</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">{statusLabel[nextEpisode.status] || nextEpisode.status}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white truncate">{nextEpisode.title}</h2>
              <p className="mt-1 text-sm text-slate-400 line-clamp-2 max-w-3xl">{nextEpisode.topic || nextEpisode.synopsis || 'Produção pronta para continuar.'}</p>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{nextEpisode.targetDurationMinutes || nextEpisode.targetDurationMin} min</span>
                <span>{(nextEpisode.participants || []).length} participantes</span>
                <span className="text-slate-500">{activeProgram?.name || 'Produção'}</span>
              </div>
            </div>
            <button onClick={() => onSelectEpisode(nextEpisode)} className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-slate-950 hover:bg-slate-200 rounded-xl text-sm font-bold">
              Continuar produção <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      ) : (
        <section className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-8 text-center">
          <Film className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-white">Nenhuma produção em andamento</h2>
          <p className="text-sm text-slate-400 mt-1 mb-4">Comece uma produção para ativar o fluxo editorial e operacional.</p>
          <button onClick={() => onOpenNewEpisodeModal(activeProgram?.id)} className="px-4 py-2 bg-amber-500 text-zinc-950 rounded-lg text-sm font-bold">Criar produção</button>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h2 className="text-sm font-bold text-white">Produções em andamento</h2><p className="text-xs text-slate-500 mt-0.5">O trabalho ativo do programa em foco.</p></div>
            <button onClick={onNavigateToEpisodes} className="text-xs text-amber-400 hover:text-amber-300 font-semibold">Ver produções</button>
          </div>
          <div className="space-y-2">
            {scopedEpisodes.slice(0, 6).map((episode) => (
              <button key={episode.id} onClick={() => onSelectEpisode(episode)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 transition">
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0"><Film className="w-4 h-4 text-slate-400" /></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-200 truncate">{episode.title}</p><p className="text-[11px] text-slate-500 truncate">{statusLabel[episode.status] || episode.status} · {episode.format}</p></div>
                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
              </button>
            ))}
            {scopedEpisodes.length === 0 && <p className="py-5 text-sm text-slate-500">Nenhuma produção neste programa.</p>}
          </div>
        </section>

        <div className="space-y-5">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div><h2 className="text-sm font-bold text-white">Agenda de produção</h2><p className="text-[11px] text-slate-500">Próximos compromissos.</p></div>
              <button onClick={onNavigateToAgenda} className="text-xs text-amber-400">Ver agenda</button>
            </div>
            <div className="space-y-2.5">
              {upcomingEvents.map((event) => <div key={event.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800"><p className="text-xs font-semibold text-white truncate">{event.title}</p><p className="text-[11px] text-slate-500 mt-1">{event.scheduledDate} {event.scheduledTime}</p></div>)}
              {upcomingEvents.length === 0 && <p className="text-xs text-slate-500">Nenhum compromisso agendado.</p>}
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3"><ListChecks className="w-4 h-4 text-amber-400" /><h2 className="text-sm font-bold text-white">Etapas</h2></div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              {['Ideia', 'Diagnóstico', 'Pauta', 'Roteiro', 'Produção', 'Gravação', 'Pós', 'Publicação'].map((step) => <span key={step} className="px-2 py-1.5 rounded-md bg-slate-950 border border-slate-800">{step}</span>)}
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3"><div><h2 className="text-sm font-bold text-white">Programas</h2><p className="text-[11px] text-slate-500">{programs.length} acessíveis</p></div><button onClick={onNavigateToPrograms} className="text-xs text-amber-400">Gerenciar</button></div>
            <div className="space-y-1.5">{programs.slice(0, 4).map((program) => <button key={program.id} onClick={() => onSelectProgram(program.id)} className="w-full flex items-center justify-between py-2 border-b border-slate-800 last:border-0 text-left"><span className="text-xs text-slate-300 truncate">{program.name}</span><span className="text-[10px] text-slate-600 ml-2">{program.format}</span></button>)}</div>
          </section>
        </div>
      </div>
    </div>
  );
};
