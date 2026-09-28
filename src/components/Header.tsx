import React from 'react';
import { Plus, Check, Clock, Radio, Tv, Sparkles } from 'lucide-react';
import { Program, Episode } from '../types';

interface HeaderProps {
  currentView: string;
  activeEpisode: Episode | null;
  activeProgram: Program | null;
  savingStatus: 'saved' | 'saving' | 'idle';
  onNewEpisodeClick: () => void;
  onNewProgramClick: () => void;
  onBackToEpisodes: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  activeEpisode,
  activeProgram,
  savingStatus,
  onNewEpisodeClick,
  onNewProgramClick,
  onBackToEpisodes,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
      {/* Left Breadcrumb & Context */}
      <div className="flex items-center gap-3">
        {currentView === 'episode-detail' && activeEpisode ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={onBackToEpisodes}
              className="text-slate-400 hover:text-slate-200 transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>&larr; Episódios</span>
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-purple-400 font-mono font-bold">{activeProgram?.name || 'TakeMaster'}</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold truncate max-w-sm">{activeEpisode.title}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Tv className="w-4 h-4 text-purple-400" />
            <span className="text-slate-200 font-bold">{activeProgram?.name || 'TakeMaster Studio'}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{activeProgram?.format || 'Produção Audiovisual com IA'}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Autosave Indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          {savingStatus === 'saving' ? (
            <>
              <Clock className="w-3.5 h-3.5 text-purple-400 animate-spin" />
              <span className="text-purple-300">Salvando...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Salvo</span>
            </>
          )}
        </div>

        {/* Keep the header operational: context + save state only. Primary actions live in the page. */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono">
        {savingStatus === 'saving' ? (
          <>
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span className="text-amber-300">Salvando...</span>
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Salvo</span>
          </>
        )}
      </div>
      </div>
    </header>
  );
};
