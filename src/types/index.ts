export type EpisodeStatus =
  | 'draft'
  | 'diagnosis'
  | 'research'
  | 'outline'
  | 'scripting'
  | 'ready'
  | 'recording'
  | 'recorded'
  | 'editing'
  | 'published';

export type ProgramFormat =
  | 'Entrevista'
  | 'Entrevista dupla'
  | 'Podcast'
  | 'Solo'
  | 'Solo / Monólogo'
  | 'Mesa redonda'
  | 'Mesa redonda / Painel'
  | 'Painel'
  | 'Debate'
  | 'Programa de auditório'
  | 'Talk show'
  | 'Jornalístico / Investigativo'
  | 'Musical'
  | 'Game / Quiz'
  | 'Variedades'
  | 'Especial'
  | 'Personalizado';

// Compatibility alias
export type ShowFormat = ProgramFormat;

export interface CameraConfig {
  id: string;
  legacy_id?: string;
  name: string; // e.g. "CAM 1", "CAM 2", "CAM 4 (Banda)", "CAM 5 (Plateia)"
  role?: string; // e.g. "Apresentador", "Convidados", "Plano Geral", "Banda", "Plateia"
  position?: string; // e.g. "Centro 0°", "Lateral 45°", "Grua", "Plateia"
  framing?: string; // e.g. "Plano Geral Aberto", "Plano Médio", "Close Fechado"
  purpose?: string; // e.g. "Abertura e conexão direta", "Respostas e reações"
  shotTypes?: string[];
  shotType?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
  active?: boolean;
  label?: string; // backwards compatibility alias for role
  target?: string;
  type?: 'close' | 'medium' | 'wide' | 'overhead' | 'mobile';
  focalLength?: string;
  lensNotes?: string;
}

export type ParticipantType =
  | 'Apresentador'
  | 'Coapresentador'
  | 'Co-apresentador'
  | 'Convidado'
  | 'Convidado Principal'
  | 'Especialista'
  | 'Empresário'
  | 'Empresária'
  | 'Artista'
  | 'Cantor'
  | 'Atração Musical'
  | 'Banda'
  | 'Dupla'
  | 'Grupo'
  | 'Painelista'
  | 'Jurado'
  | 'Plateia'
  | 'Plateia / Povo'
  | 'Outro';

export interface Participant {
  id: string;
  legacy_id?: string;
  programId?: string;
  name: string;
  type?: ParticipantType;
  groupType?: 'band' | 'duo' | 'group' | 'crew' | 'choir';
  role?: string;
  companyOrGroup?: string;
  company?: string;
  bio?: string;
  members?: string[];
  contacts?: string;
  notes?: string;
  links?: string[];
  entityType?: 'individual' | 'group' | 'band';
  socialHandles?: Record<string, string>;
  previousEpisodes?: number;
  createdAt: string;
  updatedAt?: string;
}

// Backwards compatibility alias
export type Guest = Participant;

export interface EpisodeParticipant {
  participantId?: string;
  id?: string;
  legacy_id?: string;
  name: string;
  type?: ParticipantType;
  role?: string;
  order?: number;
  entrySegmentId?: string;
  exitSegmentId?: string;
  notes?: string;
  isFeatured?: boolean;
  estimatedTimeMin?: number;
  bio?: string;
}

export type SegmentType =
  | 'Abertura'
  | 'Entrevista'
  | 'Perguntas rápidas'
  | 'Perguntas da plateia'
  | 'Debate'
  | 'História'
  | 'Jogo'
  | 'Quiz'
  | 'Musical'
  | 'Performance'
  | 'Merchandising'
  | 'Intervalo'
  | 'Encerramento'
  | 'Outro';

export interface QuestionItem {
  id: string;
  legacy_id?: string;
  segmentId?: string;
  participantId?: string;
  targetParticipantName?: string;
  order?: number;
  speaker?: string;
  text: string;
  objective?: string;
  suggestedCamera?: string;
  recommendedCamera?: string;
  eyeDirection?: string;
  status?: string;
  followUps?: FollowUpItem[];
  // Compatibility alias
  blockId?: string;
}

export interface FollowUpItem {
  id: string;
  legacy_id?: string;
  triggerCondition?: string;
  condition?: string;
  actionOrQuestion?: string;
  action?: string;
  cameraCue?: string;
  targetParticipant?: string;
  tag?: 'DINHEIRO' | 'FAMÍLIA' | 'MEDO' | 'CONFLITO' | 'APROFUNDAR' | 'NÃO INTERROMPER' | 'PLATEIA' | 'OUTRO';
}

export interface Segment {
  id: string;
  legacy_id?: string;
  order?: number;
  title: string;
  type?: SegmentType;
  estimatedDurationMin?: number;
  estimatedDurationMinutes?: number;
  participantIds?: string[];
  objective?: string;
  description?: string;
  keyThemes?: string[];
  suggestedCameraId?: string;
  primaryCamera?: string;
  transitionText?: string;
  bRollNotes?: string;
  notes?: string;
  questions?: QuestionItem[];
  // Aliases for compatibility
  blockNumber?: number;
}

// Backward compatibility alias for OutlineBlock
export type OutlineBlock = Segment;

export interface EditorialDiagnosis {
  centralTheme: string;
  potentialStory?: string;
  primaryConflict?: string;
  primaryTransformation?: string;
  whyWatch?: string;
  whatToDiscover?: string;
  researchPoints?: string[];
  highImpactMoments?: string[];
  approved?: boolean;
  editorialTone?: string;
  expectedTransformation?: string;
  conflictCore?: string;
  targetReaction?: string;
  riskAreas?: string[];
}

export interface ResearchSource {
  id: string;
  title: string;
  url?: string;
  detail: string;
  status: 'CONFIRMADO' | 'NÃO CONFIRMADO' | 'PERGUNTAR AO CONVIDADO';
  category: 'guest' | 'trajectory' | 'company' | 'dates_numbers' | 'interviews' | 'contradictions' | 'stories';
}

export interface ResearchData {
  aboutGuest?: string;
  trajectory?: string;
  company?: string;
  keyDatesAndNumbers?: string;
  previousInterviews?: string;
  recurringThemes?: string;
  contradictionsAndClarifications?: string;
  compellingStories?: string;
  sources?: ResearchSource[];
  facts?: ResearchSource[];
  dossierSummary?: string;
}

export interface ScriptItem {
  id: string;
  legacy_id?: string;
  order?: number;
  segmentId?: string;
  timestamp?: string;
  type?: 'cold_open' | 'opening' | 'vinheta' | 'transition' | 'question' | 'reaction' | 'musical_performance' | 'game_action' | 'closing' | 'b_roll_insert';
  camera?: string;
  cameraInstruction?: string;
  alternativeCamera?: string;
  speaker: string;
  targetPerson?: string;
  eyeDirection?: string;
  shotType?: string;
  content?: string;
  teleprompterText?: string;
  directionalMarkers?: string[];
  isTeleprompter?: boolean;
  questionRefId?: string;
  estimatedDurationSeconds?: number;
  notes?: string;
  transition?: string;
  // Compatibility alias
  blockId?: string;
}

export interface PlannedShort {
  id: string;
  legacy_id?: string;
  segmentId?: string;
  title: string;
  hook?: string;
  suggestedHook?: string;
  narrativeArc?: string;
  generatingQuestion?: string;
  targetParticipant?: string;
  estimatedDuration?: string;
  expectedDurationSeconds?: number;
  cameraFocus?: string;
  bRollNotes?: string;
  targetPlatform?: string[];
  status?: 'Planejado' | 'Capturado' | 'Excelente' | 'Não aconteceu';
  notes?: string;
}

export interface ProductionAsset {
  id: string;
  legacy_id?: string;
  segmentId?: string;
  type: string;
  title: string;
  description?: string;
  content?: string;
  displayTime?: string;
  moment?: string;
  status?: 'pendente' | 'em_busca' | 'obtido' | 'aprovado';
  fileUrl?: string;
  notes?: string;
  // Compatibility alias
  blockId?: string;
}

export type ProductionMaterial = ProductionAsset;

export interface RecordingMarker {
  id: string;
  legacy_id?: string;
  timestampSec: number;
  formattedTime: string;
  type: 'momento_forte' | 'corte' | 'nota' | 'estender' | 'erro';
  blockTitle: string;
  referenceText: string;
  comment?: string;
}

export interface TechnicalChecklistItem {
  id: string;
  label?: string;
  task?: string;
  category?: 'audio' | 'video' | 'content' | 'guest';
  done?: boolean;
  completed?: boolean;
  assignedTo?: string;
}

export type ChecklistItem = TechnicalChecklistItem;

export interface TechnicalChecklist {
  cam1Recording?: boolean;
  cam2Recording?: boolean;
  cam3Recording?: boolean;
  micHost?: boolean;
  micGuest?: boolean;
  audioMonitored?: boolean;
  lighting?: boolean;
  memoryCardsStorage?: boolean;
  batteries?: boolean;
  syncClap?: boolean;
  waterReady?: boolean;
  silentPhones?: boolean;
  customItems?: TechnicalChecklistItem[];
  [key: string]: any;
}

export interface ProgramDefaultSegment {
  id: string;
  title: string;
  description: string;
  defaultDurationMinutes: number;
}

export interface Program {
  id: string;
  legacy_id?: string;
  name?: string;
  title?: string;
  description: string;
  host?: string;
  defaultPresenterName?: string;
  format: ProgramFormat;
  defaultDurationMin?: number;
  defaultEpisodeDurationMinutes?: number;
  editorialStyle?: string;
  targetAudience?: string;
  tone?: string;
  scenario?: string;
  cameras?: CameraConfig[];
  defaultCameras?: CameraConfig[];
  standardStructure?: string[];
  defaultOpening?: string;
  defaultClosing?: string;
  defaultSegments?: ProgramDefaultSegment[];
  participants?: Participant[];
  standardSegments?: Segment[];
  createdAt: string;
  updatedAt: string;
}

// Backwards compatibility alias
export type Show = Program;

export interface Episode {
  id: string;
  legacy_id?: string;
  programId: string;
  episodeNumber?: number;
  title: string;
  idea?: string;
  topic?: string;
  synopsis?: string;
  format: ProgramFormat;
  targetDurationMin?: number;
  targetDurationMinutes?: number;
  presenterName?: string;
  host?: string;
  tone?: string;
  objective?: string;
  additionalInfo?: string;
  status: EpisodeStatus;
  participants: EpisodeParticipant[];
  segments?: Segment[];
  outline?: Segment[];
  diagnosis?: EditorialDiagnosis;
  research?: ResearchData;
  questions?: QuestionItem[];
  script?: ScriptItem[];
  cameras?: CameraConfig[];
  assets?: ProductionAsset[];
  materials?: ProductionAsset[];
  shorts?: PlannedShort[];
  plannedShorts?: PlannedShort[];
  recordingMarkers?: RecordingMarker[];
  technicalChecklist?: TechnicalChecklist;
  checklist?: ChecklistItem[];
  editorialNotesForPost?: string;
  editorScriptSynthesis?: string;
  recordingTimeElapsed?: number;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
  // Backwards compatibility helpers
  showId?: string;
  guestName?: string;
  guestId?: string;
}

export interface AgendaEvent {
  id: string;
  legacy_id?: string;
  title?: string;
  episodeId?: string;
  programTitle?: string;
  episodeTitle?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  durationMin?: number;
  location?: string;
  type: 'recording' | 'rehearsal' | 'meeting' | 'deadline';
  status?: 'confirmado' | 'pendente' | 'concluido' | 'cancelado';
  notes?: string;
  participantsSummary?: string;
}

export interface LibraryAsset {
  id: string;
  legacy_id?: string;
  programId?: string;
  title: string;
  category?: 'vinheta' | 'trilha' | 'gc_template' | 'b_roll' | 'cenario' | 'roteiro_modelo';
  type?: 'lower_third' | 'video_bumper' | 'audio_cue' | 'overlay_graphic' | 'template';
  description?: string;
  content?: string;
  url?: string;
  tags: string[];
  createdAt?: string;
}

export interface DatabaseState {
  programs: Program[];
  participants: Participant[];
  episodes: Episode[];
  agendaEvents?: AgendaEvent[];
  libraryAssets?: LibraryAsset[];
  // Backwards compatibility
  shows?: Program[];
  guests?: Participant[];
}
