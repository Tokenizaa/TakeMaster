import {
  Program,
  Episode,
  Participant,
  EditorialDiagnosis,
  ResearchData,
  Segment,
  QuestionItem,
  ScriptItem,
  FollowUpItem,
  PlannedShort,
  AgendaEvent,
  LibraryAsset,
} from '../types';

export const api = {
  // Programs
  async getPrograms(): Promise<Program[]> {
    const res = await fetch('/api/programs');
    if (!res.ok) throw new Error('Falha ao carregar programas');
    return res.json();
  },

  async getProgram(id: string): Promise<Program> {
    const res = await fetch(`/api/programs/${id}`);
    if (!res.ok) throw new Error('Programa não encontrado');
    return res.json();
  },

  async createProgram(program: Partial<Program>): Promise<Program> {
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(program),
    });
    if (!res.ok) throw new Error('Falha ao criar programa');
    return res.json();
  },

  async updateProgram(id: string, program: Partial<Program>): Promise<Program> {
    const res = await fetch(`/api/programs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(program),
    });
    if (!res.ok) throw new Error('Falha ao atualizar programa');
    return res.json();
  },

  async deleteProgram(id: string): Promise<boolean> {
    const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir programa');
    const data = await res.json();
    return data.success;
  },

  // Shows aliases for compatibility
  async getShows(): Promise<Program[]> {
    return this.getPrograms();
  },
  async getShow(id: string): Promise<Program> {
    return this.getProgram(id);
  },
  async createShow(show: Partial<Program>): Promise<Program> {
    return this.createProgram(show);
  },
  async updateShow(id: string, show: Partial<Program>): Promise<Program> {
    return this.updateProgram(id, show);
  },
  async deleteShow(id: string): Promise<boolean> {
    return this.deleteProgram(id);
  },

  // Participants
  async getParticipants(programId?: string): Promise<Participant[]> {
    const url = programId ? `/api/participants?programId=${programId}` : '/api/participants';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao carregar participantes');
    return res.json();
  },

  async createParticipant(participant: Partial<Participant>): Promise<Participant> {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant),
    });
    if (!res.ok) throw new Error('Falha ao cadastrar participante');
    return res.json();
  },

  async updateParticipant(id: string, participant: Partial<Participant>): Promise<Participant> {
    const res = await fetch(`/api/participants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant),
    });
    if (!res.ok) throw new Error('Falha ao atualizar participante');
    return res.json();
  },

  async deleteParticipant(id: string): Promise<boolean> {
    const res = await fetch(`/api/participants/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir participante');
    const data = await res.json();
    return data.success;
  },

  // Guests aliases for compatibility
  async getGuests(): Promise<Participant[]> {
    return this.getParticipants();
  },
  async createGuest(guest: Partial<Participant>): Promise<Participant> {
    return this.createParticipant(guest);
  },
  async updateGuest(id: string, guest: Partial<Participant>): Promise<Participant> {
    return this.updateParticipant(id, guest);
  },

  // Episodes
  async getEpisodes(programId?: string): Promise<Episode[]> {
    const url = programId ? `/api/episodes?programId=${programId}` : '/api/episodes';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao carregar episódios');
    return res.json();
  },

  async getEpisode(id: string): Promise<Episode> {
    const res = await fetch(`/api/episodes/${id}`);
    if (!res.ok) throw new Error('Episódio não encontrado');
    return res.json();
  },

  async createEpisode(episode: Partial<Episode>): Promise<Episode> {
    const res = await fetch('/api/episodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(episode),
    });
    if (!res.ok) throw new Error('Falha ao criar episódio');
    return res.json();
  },

  async updateEpisode(id: string, episode: Partial<Episode>): Promise<Episode> {
    const res = await fetch(`/api/episodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(episode),
    });
    if (!res.ok) throw new Error('Falha ao salvar episódio');
    return res.json();
  },

  async deleteEpisode(id: string): Promise<boolean> {
    const res = await fetch(`/api/episodes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir episódio');
    const data = await res.json();
    return data.success;
  },

  // Agenda
  async getAgenda(): Promise<AgendaEvent[]> {
    const res = await fetch('/api/agenda');
    if (!res.ok) throw new Error('Falha ao carregar agenda');
    return res.json();
  },

  async createAgendaEvent(event: Partial<AgendaEvent>): Promise<AgendaEvent> {
    const res = await fetch('/api/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Falha ao agendar gravação');
    return res.json();
  },

  async deleteAgendaEvent(id: string): Promise<boolean> {
    const res = await fetch(`/api/agenda/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao cancelar agendamento');
    const data = await res.json();
    return data.success;
  },

  // Library
  async getLibrary(): Promise<LibraryAsset[]> {
    const res = await fetch('/api/library');
    if (!res.ok) throw new Error('Falha ao carregar biblioteca');
    return res.json();
  },

  async createLibraryAsset(asset: Partial<LibraryAsset>): Promise<LibraryAsset> {
    const res = await fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset),
    });
    if (!res.ok) throw new Error('Falha ao salvar item na biblioteca');
    return res.json();
  },

  async deleteLibraryAsset(id: string): Promise<boolean> {
    const res = await fetch(`/api/library/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir item da biblioteca');
    const data = await res.json();
    return data.success;
  },

  // --- AI Generation Endpoints ---

  async aiInterpretIdea(params: {
    idea: string;
    programTitle?: string;
    programFormat?: string;
    durationMin?: number;
    existingParticipants?: Participant[];
  }): Promise<{
    title: string;
    suggestedFormat: string;
    estimatedDurationMin: number;
    participants: { name: string; type: string; role: string }[];
    segments: { title: string; type: string; estimatedDurationMin: number; objective: string }[];
  }> {
    const res = await fetch('/api/ai/interpret-idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha ao interpretar ideia com IA');
    return res.json();
  },

  async aiDiagnose(params: {
    idea: string;
    participants?: any[];
    guestName?: string;
    format?: string;
    durationMin?: number;
    objective?: string;
    programTitle?: string;
    additionalInfo?: string;
  }): Promise<EditorialDiagnosis> {
    const res = await fetch('/api/ai/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha no diagnóstico editorial da IA');
    return res.json();
  },

  async aiAssist(params: any): Promise<{ answer: string; suggestionApplied?: any }> {
    return {
      answer: 'Sugestão do Copiloto TakeMaster: Refine a pergunta de abertura para criar um contraste imediato com o desfecho da história.'
    };
  },

  async aiResearch(params: {
    participants?: any[];
    programTitle?: string;
    format?: string;
    idea: string;
    diagnosis?: EditorialDiagnosis;
    guestName?: string;
    company?: string;
  }): Promise<ResearchData> {
    const res = await fetch('/api/ai/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha ao gerar pesquisa');
    return res.json();
  },

  async aiOutline(params: {
    idea: string;
    programTitle?: string;
    format?: string;
    targetDurationMin: number;
    participants?: any[];
    diagnosis: EditorialDiagnosis;
    research?: ResearchData;
    cameras?: any[];
    guestName?: string;
  }): Promise<{ segments: Segment[]; questions: QuestionItem[] }> {
    const res = await fetch('/api/ai/outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha ao gerar pauta e quadros');
    return res.json();
  },

  async aiScript(params: { episode: Episode; program?: Program }): Promise<{ script: ScriptItem[] }> {
    const res = await fetch('/api/ai/script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha ao escrever roteiro');
    return res.json();
  },

  async generateScript(params: any): Promise<{ script: ScriptItem[] }> {
    return this.aiScript(params.episode ? params : { episode: params });
  },

  async aiRepiques(params: {
    questionText: string;
    targetParticipant?: string;
    context?: string;
    format?: string;
    guestName?: string;
  }): Promise<{ followUps: FollowUpItem[] }> {
    const res = await fetch('/api/ai/repiques', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha ao gerar repiques');
    return res.json();
  },

  async aiShorts(params: { episode: Episode }): Promise<{ shorts: PlannedShort[] }> {
    const res = await fetch('/api/ai/shorts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha ao planejar shorts');
    return res.json();
  },

  async aiEditorScript(params: { episode: Episode }): Promise<{ editorScript: string }> {
    const res = await fetch('/api/ai/editor-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha ao sintetizar roteiro de edição');
    return res.json();
  },
};
