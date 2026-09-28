import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Clapperboard,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Tv,
  ListOrdered
} from 'lucide-react';
import { Program, ProgramFormat, Episode, EpisodeParticipant, Segment } from '../types';
import { api } from '../services/api';

interface NewEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProgram?: Program | null;
  programs: Program[];
  initialProgramId?: string;
  onEpisodeCreated?: (createdEp: Episode) => Promise<void>;
  onCreateApprovedEpisode?: (episodeData: Partial<Episode>) => Promise<void>;
}

export const NewEpisodeModal: React.FC<NewEpisodeModalProps> = ({
  isOpen,
  onClose,
  activeProgram,
  programs,
  initialProgramId,
  onEpisodeCreated,
  onCreateApprovedEpisode,
}) => {
  const [selectedProgramId, setSelectedProgramId] = useState(
    initialProgramId || activeProgram?.id || programs[0]?.id || ''
  );
  const [ideaText, setIdeaText] = useState('');
  const [durationMin, setDurationMin] = useState<number>(activeProgram?.defaultDurationMin || 45);
  const [selectedFormat, setSelectedFormat] = useState<string>(activeProgram?.format || 'auto');
  const [interpreting, setInterpreting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proposal returned by AI
  const [proposal, setProposal] = useState<{
    title: string;
    suggestedFormat: string;
    estimatedDurationMin: number;
    participants: { name: string; type: any; role: string }[];
    segments: { title: string; type: any; estimatedDurationMin: number; objective: string }[];
  } | null>(null);

  const [saving, setSaving] = useState(false);

  // Return early AFTER hook declarations to follow Rules of Hooks
  if (!isOpen) return null;

  const currentProg = programs.find((p) => p.id === selectedProgramId) || activeProgram || programs[0];

  const handleInterpretIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaText.trim()) {
      setError('Por favor, descreva o que você deseja produzir.');
      return;
    }

    setError(null);
    setInterpreting(true);
    setProposal(null);

    try {
      const res = await api.aiInterpretIdea({
        idea: ideaText,
        programTitle: currentProg?.title,
        programFormat: selectedFormat === 'auto' ? currentProg?.format : selectedFormat,
        durationMin: Number(durationMin) || 45,
        existingParticipants: currentProg?.participants || [],
      });
      setProposal(res);
    } catch (err: any) {
      console.error('Failed to interpret idea:', err);
      setError(err.message || 'Falha ao interpretar ideia com IA.');
    } finally {
      setInterpreting(false);
    }
  };

  const handleApproveProposal = async () => {
    if (!proposal) return;
    setSaving(true);
    try {
      const formattedParticipants: EpisodeParticipant[] = proposal.participants.map((p, idx) => ({
        participantId: `part-${Date.now()}-${idx}`,
        name: p.name,
        type: p.type || 'Convidado',
        role: p.role || 'Participante',
        order: idx + 1,
        isFeatured: idx > 0,
        estimatedTimeMin: Math.round(proposal.estimatedDurationMin / Math.max(1, proposal.participants.length)),
      }));

      const formattedSegments: Segment[] = proposal.segments.map((s, idx) => ({
        id: `seg-${Date.now()}-${idx}`,
        order: idx + 1,
        blockNumber: idx + 1,
        title: s.title,
        type: s.type || 'Entrevista',
        estimatedDurationMin: s.estimatedDurationMin,
        objective: s.objective,
        transitionText: `Transição para o próximo quadro da narrativa.`,
      }));

      const createdPayload: any = {
        id: `ep-${Date.now()}`,
        programId: selectedProgramId,
        showId: selectedProgramId,
        title: proposal.title,
        idea: ideaText,
        topic: ideaText,
        format: proposal.suggestedFormat as ProgramFormat,
        targetDurationMin: proposal.estimatedDurationMin,
        targetDurationMinutes: proposal.estimatedDurationMin,
        participants: formattedParticipants,
        segments: formattedSegments,
        outline: formattedSegments,
        cameras: currentProg?.cameras || currentProg?.defaultCameras || [],
        host: currentProg?.host || currentProg?.defaultPresenterName || 'Apresentador',
        presenterName: currentProg?.defaultPresenterName || currentProg?.host || 'Apresentador',
        status: 'diagnosis',
        guestName: formattedParticipants.filter(p => p.type !== 'Apresentador').map(p => p.name).join(', ') || 'Participantes',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (onEpisodeCreated) {
        await onEpisodeCreated(createdPayload);
      } else if (onCreateApprovedEpisode) {
        await onCreateApprovedEpisode(createdPayload);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar episódio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Criar Nova Produção</h2>
              <p className="text-xs text-zinc-400">Descreva sua ideia livremente e a IA estruturará toda a produção</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          {!proposal ? (
            /* Step 1: Simple Natural Language Idea Input (Section 9) */
            <form onSubmit={handleInterpretIdea} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Programa
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => {
                    setSelectedProgramId(e.target.value);
                    const p = programs.find((pr) => pr.id === e.target.value);
                    if (p) {
                      setDurationMin(p.defaultDurationMin || p.defaultEpisodeDurationMinutes || 60);
                      setSelectedFormat(p.format);
                    }
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-semibold"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.title} ({p.format} · {p.defaultDurationMin || p.defaultEpisodeDurationMinutes || 60} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 mb-1">
                  O que você quer produzir? <span className="text-amber-400">*</span>
                </label>
                <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
                  Descreva sua ideia em linguagem natural, citando convidados, bandas ou acontecimentos que deseja explorar.
                </p>
                <textarea
                  required
                  rows={4}
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  placeholder="Ex: Quero entrevistar João, dono de uma fábrica que começou com R$ 500. Quero falar sobre como ele começou, os erros, a primeira grande venda e como superou a enchente..."
                  className="w-full bg-zinc-950 border border-zinc-750 focus:border-amber-500 rounded-xl p-3.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-300 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Duração Alvo (minutos)</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-300 mb-1.5">
                    <Tv className="w-3.5 h-3.5 text-sky-400" />
                    <span>Formato do Episódio</span>
                  </label>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="auto">✨ Detectar automaticamente</option>
                    <option value="Entrevista">Entrevista</option>
                    <option value="Entrevista dupla">Entrevista Dupla</option>
                    <option value="Programa de auditório">Programa de Auditório</option>
                    <option value="Podcast">Podcast / Videocast</option>
                    <option value="Mesa redonda">Mesa Redonda</option>
                    <option value="Painel">Painel de Especialistas</option>
                    <option value="Musical">Musical / Performance</option>
                    <option value="Game / Quiz">Game / Quiz</option>
                    <option value="Solo">Programa Solo</option>
                    <option value="Especial">Especial</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={interpreting || !ideaText.trim()}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  {interpreting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>TakeMaster interpretando ideia e montando produção...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-zinc-950" />
                      <span>Criar Produção com IA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Structured Production Proposal (Section 9: Proposta Clara) */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-1">
                <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase">
                  Proposta da Produção Gerada
                </span>
                <h3 className="text-base font-extrabold text-zinc-100">{proposal.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400 pt-1">
                  <span>Formato: <strong className="text-amber-400">{proposal.suggestedFormat}</strong></span>
                  <span>·</span>
                  <span>Duração: <strong className="text-zinc-200">{proposal.estimatedDurationMin} min</strong></span>
                </div>
              </div>

              {/* Identified Participants */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>Participantes da Produção ({proposal.participants.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {proposal.participants.map((pt, i) => (
                    <div key={i} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-zinc-200">{pt.name}</p>
                        <p className="text-[11px] text-zinc-400">{pt.role}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {pt.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proposed Segments / Quadros Structure */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase">
                  <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                  <span>Estrutura de Quadros Planejada ({proposal.segments.length})</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {proposal.segments.map((seg, i) => (
                    <div key={i} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-[11px]">{i + 1}.</span>
                        <div>
                          <p className="font-semibold text-zinc-200">{seg.title}</p>
                          <p className="text-[11px] text-zinc-400 line-clamp-1">{seg.objective}</p>
                        </div>
                      </div>
                      <span className="font-mono text-zinc-400 text-[11px] shrink-0 pl-2">
                        {seg.estimatedDurationMin} min
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions: Approve Production or Adjust */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setProposal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Ajustar Ideia
                </button>

                <button
                  type="button"
                  onClick={handleApproveProposal}
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Aprovar Produção & Abrir Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
