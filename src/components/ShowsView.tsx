import React, { useState } from 'react';
import {
  Tv,
  Plus,
  Trash2,
  Users,
  Video,
  Clock,
  Sparkles,
  ArrowRight,
  FolderKanban,
  Edit2,
  CheckCircle,
  Sliders,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { Program, Episode, Participant, ProgramFormat } from '../types';

interface ShowsViewProps {
  programs: Program[];
  episodes: Episode[];
  participants: Participant[];
  onSelectEpisode: (episode: Episode) => void;
  onOpenNewEpisodeModal: (programId?: string) => void;
  onSaveProgram: (program: Program) => void;
  onDeleteProgram: (id: string) => void;
  onSaveParticipant: (participant: Participant) => void;
}

export const ShowsView: React.FC<ShowsViewProps> = ({
  programs,
  episodes,
  participants,
  onSelectEpisode,
  onOpenNewEpisodeModal,
  onSaveProgram,
  onDeleteProgram,
  onSaveParticipant,
}) => {
  const [selectedProgramId, setSelectedProgramId] = useState<string>(programs[0]?.id || '');
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);
  const [activeTab, setActiveTab] = useState<'episodes' | 'participants' | 'settings'>('episodes');

  // New Program form state
  const [newName, setNewName] = useState('');
  const [newFormat, setNewFormat] = useState<ProgramFormat>('Entrevista');
  const [newDesc, setNewDesc] = useState('');
  const [newPresenter, setNewPresenter] = useState('');
  const [newDuration, setNewDuration] = useState(60);

  // New Participant for selected program form state
  const [newPartName, setNewPartName] = useState('');
  const [newPartRole, setNewPartRole] = useState<'Apresentador' | 'Co-apresentador' | 'Convidado Principal' | 'Especialista' | 'Atração Musical' | 'Jurado' | 'Plateia / Povo' | 'Outro'>('Convidado Principal');
  const [newPartBio, setNewPartBio] = useState('');
  const [newPartEntity, setNewPartEntity] = useState<'individual' | 'group' | 'band'>('individual');

  const selectedProgram = programs.find(p => p.id === selectedProgramId) || programs[0];
  const programEpisodes = episodes.filter(e => e.programId === selectedProgram?.id);
  const programParticipants = participants.filter(p => p.programId === selectedProgram?.id);

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newProg: Program = {
      id: `prog-${Date.now()}`,
      name: newName,
      description: newDesc,
      format: newFormat,
      defaultPresenterName: newPresenter || 'Apresentador',
      targetAudience: 'Público geral e profissionais',
      tone: 'Profissional, dinâmico e envolvente',
      defaultEpisodeDurationMinutes: newDuration,
      defaultCameras: [
        { id: 'c1', name: 'CAM 1 (Apresentador)', type: 'close', target: 'Apresentador Principal', shotType: 'close' },
        { id: 'c2', name: 'CAM 2 (Convidado)', type: 'close', target: 'Convidado em Destaque', shotType: 'close' },
        { id: 'c3', name: 'CAM 3 (Geral / Mesa)', type: 'wide', target: 'Plano Conjunto do Estúdio', shotType: 'wide' }
      ],
      defaultSegments: [
        { id: 'ds1', title: 'Abertura & Gancho', description: 'Impacto nos primeiros 45 segundos', defaultDurationMinutes: 2 },
        { id: 'ds2', title: 'O Grande Desafio', description: 'Ponto de virada e conflito', defaultDurationMinutes: 15 },
        { id: 'ds3', title: 'Encerramento & Aprendizados', description: 'Conclusão e chamada para ação', defaultDurationMinutes: 5 }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveProgram(newProg);
    setSelectedProgramId(newProg.id);
    setIsCreatingProgram(false);
    setNewName('');
    setNewDesc('');
    setNewPresenter('');
  };

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim() || !selectedProgram) return;

    const newPart: Participant = {
      id: `part-${Date.now()}`,
      programId: selectedProgram.id,
      name: newPartName,
      role: newPartRole,
      entityType: newPartEntity,
      bio: newPartBio,
      socialHandles: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveParticipant(newPart);
    setNewPartName('');
    setNewPartBio('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-purple-400" />
            Programas & Elenco
          </h1>
          <p className="text-xs text-slate-400">
            Gerencie seus formatos audiovisuais, elenco fixo, apresentadores e episódios estruturados.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingProgram(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          Novo Programa
        </button>
      </div>

      {/* Program Creation Modal */}
      {isCreatingProgram && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Criar Novo Programa</h2>
            <form onSubmit={handleCreateProgram} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Nome do Programa</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Sala de Negócios, Arena dos Criadores..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Formato</label>
                  <select
                    value={newFormat}
                    onChange={e => setNewFormat(e.target.value as ProgramFormat)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="Entrevista">Entrevista 1 a 1</option>
                    <option value="Mesa redonda / Painel">Mesa Redonda / Painel</option>
                    <option value="Programa de auditório">Programa de Auditório</option>
                    <option value="Talk show">Talk Show</option>
                    <option value="Jornalístico / Investigativo">Jornalístico</option>
                    <option value="Solo / Monólogo">Solo / Monólogo</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Apresentador Principal</label>
                  <input
                    type="text"
                    value={newPresenter}
                    onChange={e => setNewPresenter(e.target.value)}
                    placeholder="Nome do apresentador"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Duração Padrão (minutos)</label>
                <input
                  type="number"
                  value={newDuration}
                  onChange={e => setNewDuration(parseInt(e.target.value) || 60)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Descrição & Proposta Editorial</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="Qual é a proposta, o público e o objetivo deste programa?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingProgram(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg text-xs"
                >
                  Criar Programa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Programs Selector Column */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Seus Programas ({programs.length})
          </h2>

          <div className="space-y-2">
            {programs.map(prog => {
              const isSelected = prog.id === selectedProgram?.id;
              const count = episodes.filter(e => e.programId === prog.id).length;

              return (
                <button
                  key={prog.id}
                  onClick={() => setSelectedProgramId(prog.id)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 shadow-md'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{prog.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-purple-300">
                      {prog.format}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-1 mt-1">
                    {prog.description || 'Sem descrição'}
                  </p>

                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <FolderKanban className="w-3 h-3 text-purple-400" />
                      {count} episódios
                    </span>
                    <span>•</span>
                    <span>{prog.defaultPresenterName}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Program Detail Workspace */}
        {selectedProgram && (
          <div className="lg:col-span-8 space-y-4">
            {/* Program Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-900/60 text-purple-300 border border-purple-700">
                      {selectedProgram.format}
                    </span>
                    <span className="text-xs text-slate-400">
                      Duração Padrão: {selectedProgram.defaultEpisodeDurationMinutes} min
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white">{selectedProgram.name}</h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    {selectedProgram.description}
                  </p>
                </div>

                <button
                  onClick={() => onOpenNewEpisodeModal(selectedProgram.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md transition self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  + Novo Episódio neste Programa
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setActiveTab('episodes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'episodes'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Episódios ({programEpisodes.length})
                </button>

                <button
                  onClick={() => setActiveTab('participants')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'participants'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Participantes & Elenco ({programParticipants.length})
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'settings'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Câmeras & Quadros Padrão
                </button>
              </div>
            </div>

            {/* TAB: EPISODES */}
            {activeTab === 'episodes' && (
              <div className="space-y-3">
                {programEpisodes.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                    <p className="text-sm text-slate-400">Nenhum episódio criado para este programa ainda.</p>
                    <button
                      onClick={() => onOpenNewEpisodeModal(selectedProgram.id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Criar Primeiro Episódio
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {programEpisodes.map(ep => (
                      <div
                        key={ep.id}
                        onClick={() => onSelectEpisode(ep)}
                        className="bg-slate-900 border border-slate-800 hover:border-purple-500/60 rounded-xl p-4 cursor-pointer transition space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold uppercase">
                            {ep.status}
                          </span>
                          <span className="text-xs text-slate-400">{ep.targetDurationMinutes} min</span>
                        </div>

                        <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                          {ep.title}
                        </h3>

                        <p className="text-xs text-slate-400 line-clamp-2">
                          {ep.topic || ep.synopsis}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                          <span>{(ep.participants || []).length} participantes</span>
                          <span className="text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Abrir Workspace &rarr;
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: PARTICIPANTS */}
            {activeTab === 'participants' && (
              <div className="space-y-4">
                {/* Add participant form */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    Adicionar Participante ao Elenco do Programa
                  </h3>
                  <form onSubmit={handleAddParticipant} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        value={newPartName}
                        onChange={e => setNewPartName(e.target.value)}
                        placeholder="Nome completo / Banda"
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <select
                        value={newPartRole}
                        onChange={e => setNewPartRole(e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Apresentador">Apresentador</option>
                        <option value="Co-apresentador">Co-apresentador</option>
                        <option value="Convidado Principal">Convidado Principal</option>
                        <option value="Especialista">Especialista</option>
                        <option value="Atração Musical">Atração Musical / Banda</option>
                        <option value="Jurado">Jurado</option>
                        <option value="Plateia / Povo">Plateia / Povo</option>
                      </select>
                      <select
                        value={newPartEntity}
                        onChange={e => setNewPartEntity(e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="individual">Pessoa Individual</option>
                        <option value="band">Banda Musical</option>
                        <option value="group">Grupo / Painel</option>
                      </select>
                    </div>

                    <textarea
                      value={newPartBio}
                      onChange={e => setNewPartBio(e.target.value)}
                      placeholder="Breve biografia, histórico ou relevância para o programa..."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />

                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Cadastrar no Elenco
                    </button>
                  </form>
                </div>

                {/* List participants */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {programParticipants.map(part => (
                    <div
                      key={part.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{part.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                          {part.role}
                        </span>
                      </div>
                      {part.bio && (
                        <p className="text-xs text-slate-400 line-clamp-2">{part.bio}</p>
                      )}
                      <div className="text-[10px] text-slate-500">
                        Tipo: {part.entityType === 'band' ? 'Banda Musical' : part.entityType === 'group' ? 'Grupo' : 'Individual'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SETTINGS & DEFAULT CAMERAS */}
            {activeTab === 'settings' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  Câmeras e Quadros Padrão do Programa
                </h3>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">Câmeras Pré-Configuradas:</span>
                  {(selectedProgram.defaultCameras || []).map(cam => (
                    <div key={cam.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{cam.name}</span>
                      <span className="text-slate-400">{cam.target}</span>
                      <span className="text-purple-400">{cam.shotType}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">Quadros Padrão na Criação:</span>
                  {(selectedProgram.defaultSegments || []).map(seg => (
                    <div key={seg.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{seg.title}</span>
                        <span className="text-slate-400">{seg.defaultDurationMinutes} min</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{seg.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
