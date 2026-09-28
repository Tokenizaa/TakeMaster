import React, { useState } from 'react';
import {
  Plus,
  Play,
  Tv,
  Film,
  Calendar,
  Clock,
  CheckCircle,
  TrendingUp,
  Sparkles,
  Users,
  Video,
  FileText,
  Search,
  ArrowRight,
  Sliders,
  Scissors
} from 'lucide-react';
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

export const DashboardView: React.FC<DashboardViewProps> = ({
  programs,
  episodes,
  agendaEvents,
  onSelectEpisode,
  onOpenNewEpisodeModal,
  onNavigateToPrograms,
  onNavigateToEpisodes,
}) => {
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEpisodes = episodes.filter(ep => {
    const matchesProg = selectedProgramFilter === 'all' || ep.programId === selectedProgramFilter;
    const matchesQuery = !searchQuery || ep.title.toLowerCase().includes(searchQuery.toLowerCase()) || (ep.topic || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProg && matchesQuery;
  });

  // Calculate statistics
  const totalEpisodes = episodes.length;
  const readyToRecord = episodes.filter(e => e.status === 'ready').length;
  const inScripting = episodes.filter(e => e.status === 'scripting' || e.status === 'outline').length;
  const recorded = episodes.filter(e => e.status === 'recorded' || e.status === 'editing').length;
  const published = episodes.filter(e => e.status === 'published').length;

  return (
    <div className="space-y-6">
      {/* Hero Welcome / Fast Action */}
      <div className="bg-gradient-to-r from-purple-900/40 via-slate-900 to-slate-900 border border-purple-800/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                TakeMaster • Sistema de Direção & Produção
              </span>
              <span className="text-xs text-slate-400">
                {programs.length} Programas • {totalEpisodes} Episódios
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Central de Produção Audiovisual
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Crie programas, estruture pautas e dirija gravações com teleprompter, switcher e inteligência editorial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenNewEpisodeModal()}
              className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-900/40 transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              + Novo Episódio com IA
            </button>

            <button
              onClick={onNavigateToPrograms}
              className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
            >
              <Tv className="w-4 h-4 text-purple-400" />
              Gerenciar Programas
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Pronto p/ Gravar</p>
              <p className="text-xl font-black text-emerald-400">{readyToRecord}</p>
            </div>
            <Play className="w-5 h-5 text-emerald-500/60" />
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Em Roteirização</p>
              <p className="text-xl font-black text-purple-400">{inScripting}</p>
            </div>
            <FileText className="w-5 h-5 text-purple-500/60" />
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Em Edição</p>
              <p className="text-xl font-black text-amber-400">{recorded}</p>
            </div>
            <Scissors className="w-5 h-5 text-amber-500/60" />
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Publicados</p>
              <p className="text-xl font-black text-blue-400">{published}</p>
            </div>
            <CheckCircle className="w-5 h-5 text-blue-500/60" />
          </div>
        </div>
      </div>

      {/* Main Grid: Episodes on deck & Agenda/Next actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Episodes Production Feed */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-400" />
                Episódios em Produção
              </h2>
              <span className="text-xs text-slate-400">({filteredEpisodes.length})</span>
            </div>

            {/* Filter by Program */}
            <div className="flex items-center gap-2">
              <select
                value={selectedProgramFilter}
                onChange={e => setSelectedProgramFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="all">Todos os Programas</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <button
                onClick={onNavigateToEpisodes}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
              >
                Ver Todos &rarr;
              </button>
            </div>
          </div>

          {/* Episode Cards */}
          <div className="space-y-3">
            {filteredEpisodes.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <Film className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-300">Nenhum episódio encontrado para este filtro.</p>
                <button
                  onClick={() => onOpenNewEpisodeModal()}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg"
                >
                  Criar Primeiro Episódio
                </button>
              </div>
            ) : (
              filteredEpisodes.slice(0, 6).map(ep => {
                const prog = programs.find(p => p.id === ep.programId);
                const hasScript = (ep.script || []).length > 0;
                const hasDiagnosis = !!ep.diagnosis?.centralTheme;

                return (
                  <div
                    key={ep.id}
                    onClick={() => onSelectEpisode(ep)}
                    className="bg-slate-900 border border-slate-800 hover:border-purple-500/60 rounded-xl p-4.5 cursor-pointer transition space-y-3 group shadow-sm hover:shadow-purple-950/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {prog && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            {prog.name}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium">{ep.format}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ep.targetDurationMinutes} min
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ep.status === 'ready'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : ep.status === 'recording'
                            ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {ep.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                        {ep.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                        {ep.topic || ep.synopsis}
                      </p>
                    </div>

                    {/* Footer indicators */}
                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          {(ep.participants || []).length} Participantes
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          {(ep.script || []).length} Falas / Roteiro
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-amber-400" />
                          {(ep.cameras || []).length || 3} Câmeras
                        </span>
                      </div>

                      <span className="text-purple-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Abrir Episódio &rarr;
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Studio Agenda & Quick Shortcuts */}
        <div className="lg:col-span-4 space-y-4">
          {/* Agenda / Next Recordings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Próximas Gravações & Pautas
              </h2>
              <span className="text-xs text-slate-400">{agendaEvents.length} marcadas</span>
            </div>

            <div className="space-y-2.5">
              {agendaEvents.slice(0, 4).map(event => (
                <div
                  key={event.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-1 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300">
                      {event.type.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {event.scheduledDate} {event.scheduledTime}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-white">{event.title}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{event.notes}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Formats at a Glance */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Tv className="w-4 h-4 text-emerald-400" />
              Programas Ativos
            </h2>

            <div className="space-y-2">
              {programs.map(prog => (
                <div
                  key={prog.id}
                  onClick={onNavigateToPrograms}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-200">{prog.name}</p>
                    <p className="text-[10px] text-slate-400">{prog.format} • {prog.defaultPresenterName}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
