import React from 'react';
import {
  LayoutDashboard,
  Tv,
  Film,
  Calendar,
  BookMarked,
  Sliders,
  PlayCircle,
  Clapperboard,
  FileText,
  FolderKanban,
  Video,
  Info
} from 'lucide-react';
import { Episode, Program } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  activeEpisode: Episode | null;
  activeEpisodeWorkspace?: string;
  onSelectEpisodeWorkspace?: (workspace: string) => void;
  onOpenStudioMode: () => void;
  onNewEpisodeClick: () => void;
  programs: Program[];
  activeProgramId: string;
  onSelectProgramId: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  activeEpisode,
  activeEpisodeWorkspace = 'overview',
  onSelectEpisodeWorkspace,
  onOpenStudioMode,
  onNewEpisodeClick,
  programs,
  activeProgramId,
  onSelectProgramId,
}) => {
  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'programs', label: 'Programas', icon: Tv },
    { id: 'episodes', label: 'Episódios', icon: Film },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'library', label: 'Biblioteca', icon: BookMarked },
    { id: 'settings', label: 'Configurações', icon: Sliders },
  ];

  // The 4 Consolidated Workspaces for Episode Production (Section 16)
  const episodeWorkspaces = [
    { id: 'overview', label: 'Visão Geral', icon: Info, desc: 'Conceito, Participantes & Pauta' },
    { id: 'script', label: 'Roteiro', icon: FileText, desc: 'Quadros, Falas & Repiques' },
    { id: 'production', label: 'Produção', icon: FolderKanban, desc: 'Câmeras, B-Roll, Shorts & Edição' },
    { id: 'recording', label: 'Gravação', icon: Video, desc: 'Prontidão & Studio Mode' },
  ];

  return (
    <aside className="w-64 bg-zinc-900/95 border-r border-zinc-800 flex flex-col h-screen select-none shrink-0 text-sm">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-zinc-100 text-base leading-tight tracking-tight">TakeMaster</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Sistema Audiovisual</p>
          </div>
        </div>
      </div>

      {/* Program Selector */}
      <div className="px-3 pt-3 pb-2 border-b border-zinc-800/60 bg-zinc-950/40">
        <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block mb-1">
          Programa Ativo
        </label>
        <select
          value={activeProgramId}
          onChange={(e) => onSelectProgramId(e.target.value)}
          aria-label="Selecionar Programa Ativo"
          className="w-full bg-zinc-900 border border-zinc-750 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/60 font-medium"
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.format})
            </option>
          ))}
        </select>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2 block mb-1.5 font-bold">
            Produção Geral
          </span>
          <nav className="space-y-0.5">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Episode Workspace (Section 16: Consolidates the 9 steps into 4) */}
        {activeEpisode && (
          <div className="pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                Episódio em Foco
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                EP #{String(activeEpisode.episodeNumber).padStart(2, '0')}
              </span>
            </div>

            <div className="px-2 mb-2.5">
              <p className="text-xs font-bold text-zinc-200 truncate" title={activeEpisode.title}>
                {activeEpisode.title}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {activeEpisode.format} · {activeEpisode.targetDurationMin} min
              </p>
            </div>

            {/* Quick Button: Start Studio Mode */}
            <button
              onClick={onOpenStudioMode}
              className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-red-950/40 group active:scale-[0.98] cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 fill-white/20 group-hover:scale-110 transition-transform" />
              <span>Modo Estúdio (Gravar)</span>
            </button>

            <nav className="space-y-1">
              {episodeWorkspaces.map((ws) => {
                const Icon = ws.icon;
                const isWsActive = currentView === 'episode-detail' && activeEpisodeWorkspace === ws.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onNavigate('episode-detail');
                      onSelectEpisodeWorkspace(ws.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isWsActive
                        ? 'bg-zinc-800 text-amber-300 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{ws.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/60">
        <button
          onClick={onNewEpisodeClick}
          className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-950/20 active:scale-98 cursor-pointer"
        >
          <span className="text-sm font-black">+</span>
          <span>Novo Episódio</span>
        </button>
      </div>
    </aside>
  );
};
