/**
 * Fronteira entre o contrato HTTP (camelCase, tipos de src/types/index.ts) e
 * o schema relacional (snake_case, CHECKs, NOT NULL).
 *
 * REGRA QUE ORIENTA TUDO AQUI: o contrato do frontend nao pode encolher nem
 * virar 500. O db.json aceitava qualquer objeto; o PostgreSQL tem NOT NULL e
 * CHECK. Cada funcao `toX` produz uma linha valida a partir de um payload
 * possivelmente incompleto ou com valor fora do conjunto - e cada `fromX`
 * devolve o objeto com TODOS os aliases que o frontend le hoje.
 *
 * Os valores de fallback nao sao invencao de conteudo: sao o minimo que o
 * schema exige para o insert nao explodir (RISCO 9 da fase 1). Estao
 * comentados um a um.
 */
import {
  AgendaEvent,
  CameraConfig,
  Episode,
  EpisodeParticipant,
  FollowUpItem,
  LibraryAsset,
  Participant,
  PlannedShort,
  Program,
  ProductionAsset,
  QuestionItem,
  RecordingMarker,
  ScriptItem,
  Segment,
  TechnicalChecklistItem,
} from '../types';

type Row = Record<string, any>;

/** Remove chaves com valor undefined/null para o upsert parcial nao tocar nelas. */
function defined<T extends Row>(row: T): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Inteiro >= 0 ou null (colunas com CHECK >= 0). Valores fora viram null, nao erro. */
function nonNegInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

/** Inteiro > 0 ou null (agenda_events.duration_min tem CHECK > 0). */
function posInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/**
 * Valor de coluna com CHECK IN (...) que nao veio no conjunto fechado.
 * O db.json guardava o que viesse; um valor fora do union viraria 500 no
 * insert. Aqui vira null, que todo CHECK do schema aceita.
 */
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/** Garante um id textual. Sem id, o ON CONFLICT (legacy_id) nunca casaria e a linha duplicaria. */
function legacyId(v: unknown, prefix: string, index: number): string {
  return typeof v === 'string' && v.trim() !== '' ? v : `${prefix}-${Date.now()}-${index}`;
}

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : v === undefined || v === null ? null : String(v);
}

function strArray(v: unknown): string[] | null {
  return Array.isArray(v) ? v.map((x) => String(x)) : null;
}

function jsonb(v: unknown): unknown {
  return v === undefined ? undefined : v;
}

// =============================================================================
// programs  <-  CameraConfig[]  ->  cameras
// =============================================================================

const CAMERA_TYPES = ['close', 'medium', 'wide', 'overhead', 'mobile'] as const;

export function cameraToRow(c: CameraConfig, index: number): Row {
  return defined({
    legacy_id: legacyId(c.id, 'cam', index),
    name: c.name || `CAM ${index + 1}`,
    role: str(c.role),
    label: str(c.label),
    position: str(c.position),
    framing: str(c.framing),
    purpose: str(c.purpose),
    shot_types: c.shotTypes ?? undefined,
    shot_type: str(c.shotType),
    notes: str(c.notes),
    target: str(c.target),
    type: oneOf(c.type, CAMERA_TYPES),
    focal_length: str(c.focalLength),
    lens_notes: str(c.lensNotes),
    active: c.active ?? true,
    sort_order: index,
  });
}

export function cameraFromRow(r: Row): CameraConfig {
  return {
    id: r.legacy_id,
    name: r.name,
    role: r.role ?? undefined,
    label: r.label ?? undefined,
    position: r.position ?? undefined,
    framing: r.framing ?? undefined,
    purpose: r.purpose ?? undefined,
    shotTypes: r.shot_types ?? undefined,
    shotType: r.shot_type ?? undefined,
    notes: r.notes ?? undefined,
    target: r.target ?? undefined,
    type: (r.type ?? undefined) as CameraConfig['type'],
    focalLength: r.focal_length ?? undefined,
    lensNotes: r.lens_notes ?? undefined,
    active: r.active,
  };
}

export function programToRow(p: Program): Row {
  return defined({
    legacy_id: legacyId(p.id, 'prog', 0),
    name: str(p.name),
    title: str(p.title),
    // NOT NULL sem CHECK: string vazia, para o contrato HTTP nao virar 500.
    description: p.description ?? '',
    host: str(p.host),
    default_presenter_name: str(p.defaultPresenterName),
    format: p.format ?? '',
    default_duration_min: nonNegInt(p.defaultDurationMin),
    default_episode_duration_minutes: nonNegInt(p.defaultEpisodeDurationMinutes),
    editorial_style: str(p.editorialStyle),
    target_audience: str(p.targetAudience),
    tone: str(p.tone),
    scenario: str(p.scenario),
    standard_structure: p.standardStructure ?? undefined,
    default_opening: str(p.defaultOpening),
    default_closing: str(p.defaultClosing),
    default_segments: jsonb(p.defaultSegments ?? []),
    standard_segments: jsonb(p.standardSegments ?? []),
  });
}

export function programFromRow(r: Row, cameras: CameraConfig[], participants: Participant[]): Program {
  return {
    id: r.legacy_id,
    name: r.name ?? undefined,
    title: r.title ?? undefined,
    description: r.description,
    host: r.host ?? undefined,
    defaultPresenterName: r.default_presenter_name ?? undefined,
    format: r.format as Program['format'],
    defaultDurationMin: r.default_duration_min ?? undefined,
    defaultEpisodeDurationMinutes: r.default_episode_duration_minutes ?? undefined,
    editorialStyle: r.editorial_style ?? undefined,
    targetAudience: r.target_audience ?? undefined,
    tone: r.tone ?? undefined,
    scenario: r.scenario ?? undefined,
    cameras,
    // Alias que App.tsx:181 grava e ShowsView/StudioSetupView leem.
    defaultCameras: cameras,
    standardStructure: r.standard_structure ?? undefined,
    defaultOpening: r.default_opening ?? undefined,
    defaultClosing: r.default_closing ?? undefined,
    defaultSegments: r.default_segments ?? undefined,
    standardSegments: r.standard_segments ?? undefined,
    // RISCO 1 da fase 1: Program.participants nao tem coluna. Projecao de
    // participants WHERE program_id - nenhum dado se perde, o contrato
    // continua igual ao do db.json.
    participants,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// =============================================================================
// participants
// =============================================================================

const GROUP_TYPES = ['band', 'duo', 'group', 'crew', 'choir'] as const;
const ENTITY_TYPES = ['individual', 'group', 'band'] as const;

export function participantToRow(p: Participant): Row {
  return defined({
    legacy_id: legacyId(p.id, 'part', 0),
    program_id: undefined, // resolvido por FK na borda (ver db.ts), nao pelo cliente
    name: p.name ?? '',
    type: str(p.type),
    group_type: oneOf(p.groupType, GROUP_TYPES),
    role: str(p.role),
    company_or_group: str(p.companyOrGroup),
    company: str(p.company),
    bio: str(p.bio),
    members: p.members ?? undefined,
    contacts: str(p.contacts),
    notes: str(p.notes),
    links: p.links ?? undefined,
    entity_type: oneOf(p.entityType, ENTITY_TYPES),
    social_handles: jsonb(p.socialHandles ?? {}),
    previous_episodes: nonNegInt(p.previousEpisodes),
  });
}

export function participantFromRow(r: Row): Participant {
  return {
    id: r.legacy_id,
    programId: r.program_legacy_id ?? r._program_legacy_id ?? undefined,
    name: r.name,
    type: (r.type ?? undefined) as Participant['type'],
    groupType: (r.group_type ?? undefined) as Participant['groupType'],
    role: r.role ?? undefined,
    companyOrGroup: r.company_or_group ?? undefined,
    company: r.company ?? undefined,
    bio: r.bio ?? undefined,
    members: r.members ?? undefined,
    contacts: r.contacts ?? undefined,
    notes: r.notes ?? undefined,
    links: r.links ?? undefined,
    entityType: (r.entity_type ?? undefined) as Participant['entityType'],
    socialHandles: r.social_handles ?? undefined,
    previousEpisodes: r.previous_episodes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  };
}

// =============================================================================
// episodes e o agregado
// =============================================================================

const EPISODE_STATUSES = [
  'draft', 'diagnosis', 'research', 'outline', 'scripting',
  'ready', 'recording', 'recorded', 'editing', 'published',
] as const;

export function episodeToRow(e: Episode): Row {
  return defined({
    legacy_id: legacyId(e.id, 'ep', 0),
    episode_number: nonNegInt(e.episodeNumber),
    title: e.title ?? '',
    idea: str(e.idea),
    topic: str(e.topic),
    synopsis: str(e.synopsis),
    format: e.format ?? '',
    target_duration_min: nonNegInt(e.targetDurationMin),
    target_duration_minutes: nonNegInt(e.targetDurationMinutes),
    presenter_name: str(e.presenterName),
    host: str(e.host),
    tone: str(e.tone),
    objective: str(e.objective),
    additional_info: str(e.additionalInfo),
    // CHECK fechado: valor fora cai em 'draft' em vez de 500.
    status: oneOf(e.status, EPISODE_STATUSES) ?? 'draft',
    diagnosis: jsonb(e.diagnosis),
    research: jsonb(e.research),
    technical_checklist: jsonb(e.technicalChecklist),
    // Coluna da migration 0002 (lacuna de persistencia do studio checklist).
    checklist: jsonb(e.checklist),
    editorial_notes_for_post: str(e.editorialNotesForPost),
    editor_script_synthesis: str(e.editorScriptSynthesis),
    recording_time_elapsed: nonNegInt(e.recordingTimeElapsed),
    scheduled_date: /^\d{4}-\d{2}-\d{2}$/.test(String(e.scheduledDate || '')) ? e.scheduledDate : undefined,
  });
}

export function episodeParticipantToRow(p: EpisodeParticipant, index: number): Row {
  return defined({
    legacy_id: legacyId(p.id, 'epart', index),
    participant_legacy_id: str(p.participantId),
    name: p.name ?? '',
    type: str(p.type),
    role: str(p.role),
    order_pos: nonNegInt(p.order) ?? index,
    entry_segment_legacy_id: str(p.entrySegmentId),
    exit_segment_legacy_id: str(p.exitSegmentId),
    notes: str(p.notes),
    is_featured: p.isFeatured ?? false,
    estimated_time_min: nonNegInt(p.estimatedTimeMin),
    bio: str(p.bio),
  });
}

const SEGMENT_TYPES = [
  'Abertura', 'Entrevista', 'Perguntas rápidas', 'Perguntas da plateia', 'Debate',
  'História', 'Jogo', 'Quiz', 'Musical', 'Performance', 'Merchandising',
  'Intervalo', 'Encerramento', 'Outro',
] as const;

export function segmentToRow(s: Segment, index: number): Row {
  return defined({
    legacy_id: legacyId(s.id, 'seg', index),
    order_pos: nonNegInt(s.order) ?? index,
    block_number: nonNegInt(s.blockNumber),
    title: s.title ?? `Quadro ${index + 1}`,
    // Sem CHECK no schema (RA caminho generativo) - mapeado assim mesmo.
    type: str(s.type),
    estimated_duration_min: nonNegInt(s.estimatedDurationMin),
    estimated_duration_minutes: nonNegInt(s.estimatedDurationMinutes),
    description: str(s.description),
    key_themes: s.keyThemes ?? undefined,
    suggested_camera_legacy_id: str(s.suggestedCameraId),
    primary_camera: str(s.primaryCamera),
    transition_text: str(s.transitionText),
    b_roll_notes: str(s.bRollNotes),
    notes: str(s.notes),
  });
}

export function questionToRow(q: QuestionItem, index: number): Row {
  return defined({
    legacy_id: legacyId(q.id, 'q', index),
    segment_legacy_id: str(q.segmentId),
    participant_legacy_id: str(q.participantId),
    target_participant_name: str(q.targetParticipantName),
    order_pos: nonNegInt(q.order) ?? index,
    speaker: str(q.speaker),
    text: q.text ?? '',
    objective: str(q.objective),
    suggested_camera: str(q.suggestedCamera),
    recommended_camera: str(q.recommendedCamera),
    eye_direction: str(q.eyeDirection),
    status: str(q.status),
    block_id: str(q.blockId),
  });
}

export function followUpToRow(f: FollowUpItem, questionLegacyId: string, index: number): Row {
  return defined({
    legacy_id: legacyId(f.id, 'fu', index),
    question_legacy_id: questionLegacyId,
    order_pos: index,
    trigger_condition: str(f.triggerCondition),
    condition: str(f.condition),
    action_or_question: str(f.actionOrQuestion),
    action: str(f.action),
    camera_cue: str(f.cameraCue),
    target_participant: str(f.targetParticipant),
    tag: str(f.tag),
  });
}

const SCRIPT_TYPES = [
  'cold_open', 'opening', 'vinheta', 'transition', 'question', 'reaction',
  'musical_performance', 'game_action', 'closing', 'b_roll_insert',
] as const;

export function scriptToRow(s: ScriptItem, index: number): Row {
  return defined({
    legacy_id: legacyId(s.id, 'sc', index),
    segment_legacy_id: str(s.segmentId),
    question_legacy_id: str(s.questionRefId),
    order_pos: nonNegInt(s.order) ?? index,
    timestamp: str(s.timestamp),
    type: oneOf(s.type, SCRIPT_TYPES) ?? (s.type ? String(s.type) : undefined),
    camera: str(s.camera),
    camera_instruction: str(s.cameraInstruction),
    alternative_camera: str(s.alternativeCamera),
    speaker: s.speaker ?? '',
    target_person: str(s.targetPerson),
    eye_direction: str(s.eyeDirection),
    shot_type: str(s.shotType),
    content: str(s.content),
    teleprompter_text: str(s.teleprompterText),
    directional_markers: s.directionalMarkers ?? undefined,
    is_teleprompter: s.isTeleprompter ?? false,
    estimated_duration_seconds: nonNegInt(s.estimatedDurationSeconds),
    notes: str(s.notes),
    transition: str(s.transition),
    block_id: str(s.blockId),
  });
}

const SHORT_STATUSES = ['Planejado', 'Capturado', 'Excelente', 'Não aconteceu'] as const;

export function shortToRow(s: PlannedShort, index: number): Row {
  return defined({
    legacy_id: legacyId(s.id, 'sh', index),
    segment_legacy_id: str(s.segmentId),
    title: s.title ?? '',
    hook: str(s.hook),
    suggested_hook: str(s.suggestedHook),
    narrative_arc: str(s.narrativeArc),
    generating_question: str(s.generatingQuestion),
    target_participant: str(s.targetParticipant),
    estimated_duration: str(s.estimatedDuration),
    expected_duration_seconds: nonNegInt(s.expectedDurationSeconds),
    camera_focus: str(s.cameraFocus),
    b_roll_notes: str(s.bRollNotes),
    target_platform: s.targetPlatform ?? undefined,
    status: oneOf(s.status, SHORT_STATUSES),
    notes: str(s.notes),
  });
}

const ASSET_STATUSES = ['pendente', 'em_busca', 'obtido', 'aprovado'] as const;

export function assetToRow(a: ProductionAsset, index: number): Row {
  return defined({
    legacy_id: legacyId(a.id, 'ast', index),
    segment_legacy_id: str(a.segmentId),
    type: a.type ?? 'material',
    title: a.title ?? '',
    description: str(a.description),
    content: str(a.content),
    display_time: str(a.displayTime),
    moment: str(a.moment),
    status: oneOf(a.status, ASSET_STATUSES),
    file_url: str(a.fileUrl),
    notes: str(a.notes),
    block_id: str(a.blockId),
  });
}

const MARKER_TYPES = ['momento_forte', 'corte', 'nota', 'estender', 'erro'] as const;

export function markerToRow(m: RecordingMarker, index: number): Row {
  return defined({
    legacy_id: legacyId(m.id, 'mk', index),
    timestamp_sec: nonNegInt(m.timestampSec) ?? 0,
    formatted_time: m.formattedTime ?? '',
    type: oneOf(m.type, MARKER_TYPES) ?? 'nota',
    // RISCO 4 da fase 1: sem FK para segmentos, por decisao. Mantido.
    block_title: m.blockTitle ?? '',
    reference_text: m.referenceText ?? '',
    comment: str(m.comment),
  });
}

// =============================================================================
// episodes: leitura
// =============================================================================

export function segmentFromRow(r: Row): Segment {
  return {
    id: r.legacy_id,
    order: r.order_pos,
    blockNumber: r.block_number ?? undefined,
    title: r.title,
    type: (r.type ?? undefined) as Segment['type'],
    estimatedDurationMin: r.estimated_duration_min ?? undefined,
    estimatedDurationMinutes: r.estimated_duration_minutes ?? undefined,
    // RISCO 2: derivado de questions, nunca gravado (ver db.ts).
    participantIds: undefined,
    objective: r.description ?? undefined,
    description: r.description ?? undefined,
    keyThemes: r.key_themes ?? undefined,
    suggestedCameraId: r._suggested_camera_legacy_id ?? undefined,
    primaryCamera: r.primary_camera ?? undefined,
    transitionText: r.transition_text ?? undefined,
    bRollNotes: r.b_roll_notes ?? undefined,
    notes: r.notes ?? undefined,
  };
}

export function questionFromRow(r: Row, followUps: FollowUpItem[]): QuestionItem {
  return {
    id: r.legacy_id,
    segmentId: r._segment_legacy_id ?? undefined,
    participantId: r._participant_legacy_id ?? undefined,
    targetParticipantName: r.target_participant_name ?? undefined,
    order: r.order_pos,
    speaker: r.speaker ?? undefined,
    text: r.text,
    objective: r.objective ?? undefined,
    suggestedCamera: r.suggested_camera ?? undefined,
    recommendedCamera: r.recommended_camera ?? undefined,
    eyeDirection: r.eye_direction ?? undefined,
    status: r.status ?? undefined,
    followUps,
    blockId: r.block_id ?? undefined,
  };
}

export function followUpFromRow(r: Row): FollowUpItem {
  return {
    id: r.legacy_id,
    triggerCondition: r.trigger_condition ?? undefined,
    condition: r.condition ?? undefined,
    actionOrQuestion: r.action_or_question ?? undefined,
    action: r.action ?? undefined,
    cameraCue: r.camera_cue ?? undefined,
    targetParticipant: r.target_participant ?? undefined,
    tag: r.tag as FollowUpItem['tag'],
  };
}

export function scriptFromRow(r: Row): ScriptItem {
  return {
    id: r.legacy_id,
    order: r.order_pos,
    segmentId: r._segment_legacy_id ?? undefined,
    timestamp: r.timestamp ?? undefined,
    type: (r.type ?? undefined) as ScriptItem['type'],
    camera: r.camera ?? undefined,
    cameraInstruction: r.camera_instruction ?? undefined,
    alternativeCamera: r.alternative_camera ?? undefined,
    speaker: r.speaker,
    targetPerson: r.target_person ?? undefined,
    eyeDirection: r.eye_direction ?? undefined,
    shotType: r.shot_type ?? undefined,
    content: r.content ?? undefined,
    teleprompterText: r.teleprompter_text ?? undefined,
    directionalMarkers: r.directional_markers ?? undefined,
    isTeleprompter: r.is_teleprompter,
    questionRefId: r._question_legacy_id ?? undefined,
    estimatedDurationSeconds: r.estimated_duration_seconds ?? undefined,
    notes: r.notes ?? undefined,
    transition: r.transition ?? undefined,
    blockId: r.block_id ?? undefined,
  };
}

export function shortFromRow(r: Row): PlannedShort {
  return {
    id: r.legacy_id,
    segmentId: r._segment_legacy_id ?? undefined,
    title: r.title,
    hook: r.hook ?? undefined,
    suggestedHook: r.suggested_hook ?? undefined,
    narrativeArc: r.narrative_arc ?? undefined,
    generatingQuestion: r.generating_question ?? undefined,
    targetParticipant: r.target_participant ?? undefined,
    estimatedDuration: r.estimated_duration ?? undefined,
    expectedDurationSeconds: r.expected_duration_seconds ?? undefined,
    cameraFocus: r.camera_focus ?? undefined,
    bRollNotes: r.b_roll_notes ?? undefined,
    targetPlatform: r.target_platform ?? undefined,
    status: (r.status ?? undefined) as PlannedShort['status'],
    notes: r.notes ?? undefined,
  };
}

export function assetFromRow(r: Row): ProductionAsset {
  return {
    id: r.legacy_id,
    segmentId: r._segment_legacy_id ?? undefined,
    type: r.type,
    title: r.title,
    description: r.description ?? undefined,
    content: r.content ?? undefined,
    displayTime: r.display_time ?? undefined,
    moment: r.moment ?? undefined,
    status: (r.status ?? undefined) as ProductionAsset['status'],
    fileUrl: r.file_url ?? undefined,
    notes: r.notes ?? undefined,
    blockId: r.block_id ?? undefined,
  };
}

export function markerFromRow(r: Row): RecordingMarker {
  return {
    id: r.legacy_id,
    timestampSec: r.timestamp_sec,
    formattedTime: r.formatted_time,
    type: r.type,
    blockTitle: r.block_title,
    referenceText: r.reference_text,
    comment: r.comment ?? undefined,
  };
}

export function episodeParticipantFromRow(r: Row): EpisodeParticipant {
  return {
    participantId: r._participant_legacy_id ?? undefined,
    id: r.legacy_id,
    name: r.name,
    type: (r.type ?? undefined) as EpisodeParticipant['type'],
    role: r.role ?? undefined,
    order: r.order_pos,
    entrySegmentId: r._entry_segment_legacy_id ?? undefined,
    exitSegmentId: r._exit_segment_legacy_id ?? undefined,
    notes: r.notes ?? undefined,
    isFeatured: r.is_featured,
    estimatedTimeMin: r.estimated_time_min ?? undefined,
    bio: r.bio ?? undefined,
  };
}

// =============================================================================
// agenda_events
//
// DECISAO DO USUARIO (a fase 1 tinha escolhido scheduled_date como canonico):
// `date` e o campo canonico do tipo AgendaEvent e o que o seed usa. A UI grava
// `scheduledDate` (AgendaView.tsx:46) e o DashboardView ordena por
// `scheduledDate` (DashboardView.tsx:48) - por isso um evento criado pela UI
// nao aparecia no dashboard. Resolvido AQUI, na borda, sem tocar em
// src/components: a coluna e a mesma, e a resposta carrega as DUAS chaves com
// o mesmo valor. Os dois caminhos de leitura do frontend passam a funcionar.
// =============================================================================

const AGENDA_TYPES = ['recording', 'rehearsal', 'meeting', 'deadline'] as const;
const AGENDA_STATUSES = ['confirmado', 'pendente', 'concluido', 'cancelado'] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME = /^\d{2}:\d{2}(:\d{2})?$/;

export function agendaToRow(e: AgendaEvent): Row {
  return defined({
    legacy_id: legacyId(e.id, 'ag', 0),
    title: str(e.title),
    episode_legacy_id: str(e.episodeId),
    program_title: str(e.programTitle),
    episode_title: str(e.episodeTitle),
    // Aceita o par date/scheduledDate dos dois lados; um unico destino.
    scheduled_date: ISO_DATE.test(String(e.date || ''))
      ? e.date
      : ISO_DATE.test(String(e.scheduledDate || ''))
        ? e.scheduledDate
        : undefined,
    scheduled_time: ISO_TIME.test(String(e.time || ''))
      ? e.time!.slice(0, 5)
      : ISO_TIME.test(String(e.scheduledTime || ''))
        ? String(e.scheduledTime).slice(0, 5)
        : undefined,
    duration_min: posInt(e.durationMin),
    location: str(e.location),
    // NOT NULL + CHECK fechado. 'meeting' e o default neutro: um evento sem
    // tipo nao tem semantica inventada, apenas nao quebra o contrato HTTP.
    type: oneOf(e.type, AGENDA_TYPES) ?? 'meeting',
    status: oneOf(e.status, AGENDA_STATUSES),
    notes: str(e.notes),
    participants_summary: str(e.participantsSummary),
  });
}

export function agendaFromRow(r: Row): AgendaEvent {
  const date = r.scheduled_date ?? null;
  return {
    id: r.legacy_id,
    title: r.title ?? undefined,
    episodeId: r._episode_legacy_id ?? undefined,
    programTitle: r.program_title ?? undefined,
    episodeTitle: r.episode_title ?? undefined,
    // Alias duplo - ver bloco acima. Mesmo valor, duas chaves.
    date: date ?? undefined,
    scheduledDate: date ?? undefined,
    time: r.scheduled_time ? String(r.scheduled_time).slice(0, 5) : undefined,
    scheduledTime: r.scheduled_time ? String(r.scheduled_time).slice(0, 5) : undefined,
    durationMin: r.duration_min ?? undefined,
    location: r.location ?? undefined,
    type: r.type,
    status: (r.status ?? undefined) as AgendaEvent['status'],
    notes: r.notes ?? undefined,
    participantsSummary: r.participants_summary ?? undefined,
  };
}

// =============================================================================
// library_assets
// =============================================================================

const LIBRARY_CATEGORIES = ['vinheta', 'trilha', 'gc_template', 'b_roll', 'cenario', 'roteiro_modelo'] as const;
const LIBRARY_TYPES = ['lower_third', 'video_bumper', 'audio_cue', 'overlay_graphic', 'template'] as const;

export function libraryToRow(a: LibraryAsset): Row {
  return defined({
    legacy_id: legacyId(a.id, 'lib', 0),
    program_legacy_id: str(a.programId),
    title: a.title ?? '',
    category: oneOf(a.category, LIBRARY_CATEGORIES),
    type: oneOf(a.type, LIBRARY_TYPES),
    description: str(a.description),
    content: str(a.content),
    url: str(a.url),
    tags: a.tags ?? [],
  });
}

export function libraryFromRow(r: Row): LibraryAsset {
  return {
    id: r.legacy_id,
    programId: r._program_legacy_id ?? undefined,
    title: r.title,
    category: (r.category ?? undefined) as LibraryAsset['category'],
    type: (r.type ?? undefined) as LibraryAsset['type'],
    description: r.description ?? undefined,
    content: r.content ?? undefined,
    url: r.url ?? undefined,
    tags: r.tags ?? [],
    createdAt: r.created_at,
  };
}

/** technicalChecklist -> JSONB. Sem transformacao: e objeto livre por decisao da fase 1. */
export function checklistToJsonb(list: TechnicalChecklistItem[] | undefined): unknown {
  return list ?? undefined;
}
