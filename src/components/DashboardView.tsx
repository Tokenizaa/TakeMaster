import React from 'react';
import { Plus, ArrowRight, Calendar, Clock, Film, Play, CheckCircle2 } from 'lucide-react';
import { Program, Episode, AgendaEvent } from '../types';

interface DashboardViewProps {
  programs: Program[];
  episodes: Episode[];
  agendaEvents: AgendaEvent[];
  onSelectEpisode: (episode: Episode) => void;
  onOpenNewEpisodeModal: (programId?: string) => void;
  onNavigateToPrograms: () => void;
  onNavigateToEpisodes: () => void;
}

const statusLabel: Record<string, string> = {
  idea: 'Ideia',
  diagnosis: 'Pesquisa',
  outline: 'Pauta',
  scripting: 'Roteiro',
  ready: 'Pronto para gravar',
  recording: 'Gravando',
  recorded: 'Gravado',
  editing: 'Em edição',
  published: 'Publicado',
};

function getNextEpisode(episodes: Episode[]) {
  const priority = ['recording', 'ready', 'scripting', 'outline', 'diagnosis', 'idea', 'editing'];
  for (const status of priority) {
    const found = episodes.find((episode) => episode.status === status);
    if (found) return found;
  }
  return episodes[0];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  programs,
  episodes,
  agendaEvents,
  onSelectEpisode,
  onOpenNewEpisodeModal,
  onNavigateToPrograms,
  onNavigateToEpisodes,
}) => {
  const nextEpisode = getNextEpisode(episodes);
  const nextProgram = nextEpisode ? programs.find((program) => program.id === nextEpisode.programId) : undefined;
  const upcomingEvents = [...agendaEvents]
    .sort((a, b) => String(a.scheduledDate || '').localeCompare(String(b.scheduledDate || '')))
    .slice(0, 3);
  const recentEpisodes = episodes.filter((episode) => episode.id !== nextEpisode?.id).slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-amber-400 font-semibold">TakeMaster</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-black text-white tracking-tight">O que vamos produzir?</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl">
            Sua central de produção. Entre direto na próxima tarefa ou comece uma nova produção.
          </p>
        </div>
        <button
          onClick={() => onOpenNewEpisodeModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-sm font-bold transition shadow-lg shadow-amber-950/20"
        >
          <Plus className="w-4 h-4" />
          Nova produção
        </button>
      </section>

      {nextEpisode ? (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold">Próxima produção</span>
                {nextProgram && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                    {nextProgram.name}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px]">
                  {nextEpisode.format}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white truncate">{nextEpisode.title}</h2>
              <p className="mt-1 text-sm text-slate-400 line-clamp-2 max-w-3xl">
                {nextEpisode.topic || nextEpisode.synopsis || 'Produção pronta para continuar.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{nextEpisode.targetDurationMinutes || nextEpisode.targetDurationMin} min</span>
                <span>{(nextEpisode.participants || []).length} participantes</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />{statusLabel[nextEpisode.status] || nextEpisode.status}</span>
              </div>
            </div>

            <button
              onClick={() => onSelectEpisode(nextEpisode)}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-slate-950 hover:bg-slate-200 rounded-xl text-sm font-bold transition"
            >
              Continuar produção
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      ) : (
        <section className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-8 text-center">
          <Film className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-white">Nenhuma produção em andamento</h2>
          <p className="text-sm text-slate-400 mt-1 mb-4">Descreva sua próxima ideia e deixe o TakeMaster estruturar o primeiro rascunho.</p>
          <button onClick={() => onOpenNewEpisodeModal()} className="px-4 py-2 bg-amber-500 text-zinc-950 rounded-lg text-sm font-bold">
            Criar primeira produção
          </button>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Produções em andamento</h2>
              <p className="text-xs text-slate-500 mt-0.5">Continue de onde parou.</p>
            </div>
            <button onClick={onNavigateToEpisodes} className="text-xs text-amber-400 hover:text-amber-300 font-semibold">
              Ver episódios
            </button>
          </div>

          <div className="space-y-2">
            {recentEpisodes.length === 0 ? (
              <p className="py-5 text-sm text-slate-500">Nada pendente por enquanto.</p>
            ) : recentEpisodes.map((episode) => {
              const program = programs.find((item) => item.id === episode.programId);
              return (
                <button
                  key={episode.id}
                  onClick={() => onSelectEpisode(episode)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    {episode.status === 'ready' ? <Play className="w-4 h-4 text-emerald-400" /> : <Film className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white">{episode.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {program?.name || 'Produção'} · {statusLabel[episode.status] || episode.status}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </section>

        <div className="space-y-5">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Próximas gravações</h2>
                <p className="text-[11px] text-slate-500">{agendaEvents.length} agendadas</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhuma gravação agendada.</p>
              ) : upcomingEvents.map((event) => (
                <div key={event.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <p className="text-xs font-semibold text-white truncate">{event.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{event.scheduledDate} {event.scheduledTime}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-white">Programas</h2>
                <p className="text-[11px] text-slate-500">{programs.length} ativos</p>
              </div>
              <button onClick={onNavigateToPrograms} className="text-xs text-amber-400 hover:text-amber-300">Gerenciar</button>
            </div>
            <div className="space-y-1.5">
              {programs.slice(0, 4).map((program) => (
                <div key={program.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <span className="text-xs text-slate-300 truncate">{program.name}</span>
                  <span className="text-[10px] text-slate-600 ml-2">{program.format}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
