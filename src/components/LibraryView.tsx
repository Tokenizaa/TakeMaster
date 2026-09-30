import React, { useState } from 'react';
import {
  BookMarked,
  Plus,
  Trash2,
  Layers,
  Music,
  Video,
  FileText,
  Search,
  ExternalLink,
  Tag
} from 'lucide-react';
import { LibraryAsset, Program } from '../types';

interface LibraryViewProps {
  assets: LibraryAsset[];
  programs: Program[];
  onAddAsset: (asset: LibraryAsset) => void;
  onDeleteAsset: (id: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  assets,
  onAddAsset,
  onDeleteAsset,
  programs,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');

  // New asset form
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<LibraryAsset['type']>('lower_third');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  const filteredAssets = assets.filter(a => {
    const matchesType = selectedType === 'all' || a.type === selectedType;
    const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newAsset: LibraryAsset = {
      id: `lib-${Date.now()}`,
      title: newTitle,
      type: newType,
      content: newContent,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      programId: selectedProgramId || undefined
    };

    onAddAsset(newAsset);
    setIsAdding(false);
    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setSelectedProgramId('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-purple-400" />
            Biblioteca de Assets & Templates
          </h1>
          <p className="text-xs text-slate-400">
            Armazene vinhetas, modelos de GC (Lower Thirds), trilhas de impacto e roteiros modelo.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          + Novo Asset
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar assets por título ou tags..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 w-full sm:w-auto"
        >
          <option value="all">Todos os Tipos</option>
          <option value="lower_third">GCs / Lower Thirds</option>
          <option value="video_bumper">Vinhetas & Bumpers</option>
          <option value="audio_cue">Trilhas & Efeitos de Áudio</option>
          <option value="overlay_graphic">Overlays Gráficos</option>
          <option value="template">Templates de Roteiro</option>
        </select>
      </div>

      {/* Add Asset Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Cadastrar Asset na Biblioteca</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Título do Asset</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ex: Lower Third - Convidado com Cargo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

<div>
  <label className="text-xs text-slate-300 font-semibold block mb-1">Tipo</label>
  <select
    value={newType}
    onChange={e => setNewType(e.target.value as any)}
    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
  >
    <option value="lower_third">GC / Lower Third</option>
    <option value="video_bumper">Vinheta / Bumper</option>
    <option value="audio_cue">Trilha / Efeito Sonoro</option>
    <option value="overlay_graphic">Overlay Gráfico</option>
    <option value="template">Template de Roteiro</option>
  </select>
</div>

<div>
  <label className="text-xs text-slate-300 font-semibold block mb-1">Programa (Tenancy)</label>
  <select
    value={selectedProgramId}
    onChange={e => setSelectedProgramId(e.target.value)}
    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
  >
    <option value="">Nenhum (Geral)</option>
    {programs.map(program => (
      <option key={program.id} value={program.id}>{program.name || program.title || 'Programa sem nome'}</option>
    ))}
  </select>
</div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Conteúdo / Texto / Link</label>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Texto do template ou descrição técnica de inserção..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  placeholder="Ex: introducao, negocio, dinamico"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg text-xs"
                >
                  Salvar Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid of Assets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map(asset => {
          const typeIcons: Record<string, any> = {
            lower_third: Layers,
            video_bumper: Video,
            audio_cue: Music,
            overlay_graphic: Layers,
            template: FileText
          };
          const Icon = (asset.type && typeIcons[asset.type]) || FileText;

          return (
            <div
              key={asset.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    <Icon className="w-3 h-3" />
                    {asset.type}
                  </span>
                  <button
                    onClick={() => onDeleteAsset(asset.id)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-white">{asset.title}</h3>
                {asset.content && (
                  <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono">
                    {asset.content}
                  </p>
                )}
              </div>

              {asset.tags && asset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-800/80">
                  {asset.tags.map(t => (
                    <span key={t} className="text-[10px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
