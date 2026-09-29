/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { EpisodesListView } from './components/EpisodesListView';
import { ShowsView } from './components/ShowsView';
import { AgendaView } from './components/AgendaView';
import { LibraryView } from './components/LibraryView';
import { StudioSetupView } from './components/StudioSetupView';
import { EpisodeWorkspace } from './components/EpisodeWorkspace/EpisodeWorkspace';
import { StudioModeModal } from './components/StudioMode/StudioModeModal';
import { ExportModal } from './components/ExportModal';
import { NewEpisodeModal } from './components/NewEpisodeModal';
import { AiContextAssistant } from './components/AiContextAssistant';
import {
  Episode,
  Program,
  Participant,
  AgendaEvent,
  LibraryAsset,
  CameraConfig
} from './types';
import { api } from './services/api';

export default function App() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Navigation
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeProgramId, setActiveProgramId] = useState<string>('');
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);

  // Modals & Panels
  const [isStudioModeOpen, setIsStudioModeOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isNewEpisodeModalOpen, setIsNewEpisodeModalOpen] = useState(false);
  const [newEpisodeInitialProgramId, setNewEpisodeInitialProgramId] = useState<string | undefined>(undefined);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Autosave status
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const debounceTimerRef = useRef<any>(null);

  // Initial Data Load
  useEffect(() => {
    async function loadData() {
      try {
        const [progData, epData, partData, agendaData, libData] = await Promise.all([
          api.getPrograms(),
          api.getEpisodes(),
          api.getParticipants(),
          api.getAgenda(),
          api.getLibrary()
        ]);
        setPrograms(progData);
        setEpisodes(epData);
        setParticipants(partData);
        setAgendaEvents(agendaData);
        setLibraryAssets(libData);

        if (progData.length > 0) {
          setActiveProgramId(progData[0].id);
        }
        if (epData.length > 0) {
          setActiveEpisode(epData[0]);
        }
      } catch (err) {
        console.error('Falha ao carregar dados iniciais:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  const activeProgram = programs.find((p) => p.id === activeProgramId) || programs[0] || null;

  // Persist episode changes with debounce
  const handleUpdateEpisode = useCallback(
    (updatedEpisode: Episode) => {
      setActiveEpisode(updatedEpisode);
      setEpisodes((prev) =>
        prev.map((e) => (e.id === updatedEpisode.id ? updatedEpisode : e))
      );

      setSavingStatus('saving');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(async () => {
        try {
          await api.updateEpisode(updatedEpisode.id, updatedEpisode);
          setSavingStatus('saved');
        } catch (err) {
          console.error('Falha ao autosalvar episódio:', err);
          setSavingStatus('saved');
        }
      }, 700);
    },
    []
  );

  // Navigation handlers
  const handleSelectEpisode = (episode: Episode) => {
    setActiveEpisode(episode);
    if (episode.programId) {
      setActiveProgramId(episode.programId);
    }
    setCurrentView('episode-detail');
  };

  const handleOpenStudioModeForEpisode = (episode: Episode) => {
    setActiveEpisode(episode);
    setIsStudioModeOpen(true);
  };

  const handleDeleteEpisode = async (id: string) => {
    await api.deleteEpisode(id);
    setEpisodes(prev => prev.filter(e => e.id !== id));
    if (activeEpisode?.id === id) {
      setActiveEpisode(episodes.find(e => e.id !== id) || null);
      if (currentView === 'episode-detail') {
        setCurrentView('episodes');
      }
    }
  };

  // Program Handlers
  const handleSaveProgram = async (prog: Program) => {
    const created = await api.createProgram(prog);
    setPrograms(prev => [...prev, created]);
    setActiveProgramId(created.id);
  };

  const handleDeleteProgram = async (id: string) => {
    await api.deleteProgram(id);
    setPrograms(prev => prev.filter(p => p.id !== id));
    if (activeProgramId === id && programs.length > 1) {
      setActiveProgramId(programs.find(p => p.id !== id)?.id || '');
    }
  };

  const handleSaveParticipant = async (participant: Participant) => {
    const created = await api.createParticipant(participant);
    setParticipants(prev => [...prev, created]);
  };

  // Agenda & Library Handlers
  const handleAddAgendaEvent = async (event: AgendaEvent) => {
    const created = await api.createAgendaEvent(event);
    setAgendaEvents(prev => [...prev, created]);
  };

  const handleDeleteAgendaEvent = async (id: string) => {
    await api.deleteAgendaEvent(id);
    setAgendaEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleAddLibraryAsset = async (asset: LibraryAsset) => {
    const created = await api.createLibraryAsset(asset);
    setLibraryAssets(prev => [...prev, created]);
  };

  const handleDeleteLibraryAsset = async (id: string) => {
    await api.deleteLibraryAsset(id);
    setLibraryAssets(prev => prev.filter(a => a.id !== id));
  };

  // Studio setup update
  const handleUpdateProgramCameras = async (cameras: CameraConfig[]) => {
    if (!activeProgram) return;
    const updated = await api.updateProgram(activeProgram.id, { defaultCameras: cameras });
    setPrograms(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleOpenNewEpisodeModal = (programId?: string) => {
    setNewEpisodeInitialProgramId(programId);
    setIsNewEpisodeModalOpen(true);
  };

  const handleCreateEpisodeFromModal = async (createdEp: Episode) => {
    // Persist first so a newly created production survives reloads.
    // Keep the existing episode model and derive the next number locally.
    const nextEpisodeNumber =
      episodes.reduce(
        (max, episode) => Math.max(max, Number((episode as any).episodeNumber) || 0),
        0
      ) + 1;

    const persistedEpisode = await api.createEpisode({
      ...createdEp,
      episodeNumber: (createdEp as any).episodeNumber || nextEpisodeNumber,
    });

    setEpisodes(prev => [persistedEpisode, ...prev]);
    setActiveEpisode(persistedEpisode);
    if (persistedEpisode.programId) {
      setActiveProgramId(persistedEpisode.programId);
    }
    setIsNewEpisodeModalOpen(false);
    setCurrentView('episode-detail');
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-9 h-9 rounded-full border-3 border-purple-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono">Iniciando TakeMaster Studio...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        activeEpisode={activeEpisode}
        activeEpisodeWorkspace="overview"
        onSelectEpisodeWorkspace={() => {}}
        onOpenStudioMode={() => {
          if (activeEpisode) setIsStudioModeOpen(true);
        }}
        onNewEpisodeClick={() => handleOpenNewEpisodeModal()}
        programs={programs}
        activeProgramId={activeProgramId}
        onSelectProgramId={setActiveProgramId}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentView={currentView}
          activeEpisode={activeEpisode}
          activeProgram={activeProgram}
          savingStatus={savingStatus}
          onNewEpisodeClick={() => handleOpenNewEpisodeModal()}
          onNewProgramClick={() => setCurrentView('shows')}
          onBackToEpisodes={() => setCurrentView('episodes')}
        />

        {/* View Switcher */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 md:p-8 bg-slate-950">
          {currentView === 'dashboard' && (
            <DashboardView
              programs={programs}
              episodes={episodes}
              agendaEvents={agendaEvents}
              onSelectEpisode={handleSelectEpisode}
              onOpenNewEpisodeModal={handleOpenNewEpisodeModal}
              onNavigateToPrograms={() => setCurrentView('shows')}
              onNavigateToEpisodes={() => setCurrentView('episodes')}
            />
          )}

          {currentView === 'shows' && (
            <ShowsView
              programs={programs}
              episodes={episodes}
              participants={participants}
              onSelectEpisode={handleSelectEpisode}
              onOpenNewEpisodeModal={handleOpenNewEpisodeModal}
              onSaveProgram={handleSaveProgram}
              onDeleteProgram={handleDeleteProgram}
              onSaveParticipant={handleSaveParticipant}
            />
          )}

          {currentView === 'episodes' && (
            <EpisodesListView
              episodes={episodes}
              programs={programs}
              onSelectEpisode={handleSelectEpisode}
              onOpenNewEpisodeModal={handleOpenNewEpisodeModal}
            />
          )}

          {currentView === 'agenda' && (
            <AgendaView
              events={agendaEvents}
              episodes={episodes}
              programs={programs}
              onAddEvent={handleAddAgendaEvent}
              onDeleteEvent={handleDeleteAgendaEvent}
            />
          )}

          {currentView === 'library' && (
            <LibraryView
              assets={libraryAssets}
              onAddAsset={handleAddLibraryAsset}
              onDeleteAsset={handleDeleteLibraryAsset}
            />
          )}

          {currentView === 'studio-setup' && (
            <StudioSetupView
              activeShow={activeProgram ? {
                ...activeProgram,
                title: activeProgram.name,
                cameras: activeProgram.defaultCameras
              } as any : null}
              onUpdateShowCameras={handleUpdateProgramCameras}
            />
          )}

          {/* Consolidated Master Episode Workspace */}
          {currentView === 'episode-detail' && activeEpisode && (
            <EpisodeWorkspace
              episode={activeEpisode}
              program={programs.find(p => p.id === activeEpisode.programId) || activeProgram || undefined}
              onUpdateEpisode={handleUpdateEpisode}
              onBackToDashboard={() => setCurrentView('episodes')}
              onLaunchStudio={() => setIsStudioModeOpen(true)}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Full-Screen Studio Recording HUD */}
      {activeEpisode && isStudioModeOpen && (
        <StudioModeModal
          episode={activeEpisode}
          isOpen={isStudioModeOpen}
          onClose={() => setIsStudioModeOpen(false)}
          onUpdateEpisode={(fields) => handleUpdateEpisode({ ...activeEpisode, ...fields })}
        />
      )}

      {/* Export Modal */}
      {activeEpisode && isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          episode={activeEpisode}
        />
      )}

      {/* New Episode Creation from Natural Language Idea Modal */}
      {isNewEpisodeModalOpen && (
        <NewEpisodeModal
          isOpen={isNewEpisodeModalOpen}
          onClose={() => setIsNewEpisodeModalOpen(false)}
          programs={programs}
          initialProgramId={newEpisodeInitialProgramId || activeProgramId}
          onEpisodeCreated={handleCreateEpisodeFromModal}
        />
      )}

      {/* AI Contextual Assistant Right Drawer */}
      {activeEpisode && isAiAssistantOpen && (
        <AiContextAssistant
          isOpen={isAiAssistantOpen}
          onClose={() => setIsAiAssistantOpen(false)}
          episode={activeEpisode}
          currentTab="overview"
          onUpdateEpisode={(fields) => handleUpdateEpisode({ ...activeEpisode, ...fields })}
        />
      )}
    </div>
  );
}
