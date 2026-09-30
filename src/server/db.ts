/**
 * DAL — PostgreSQL/Supabase.
 *
 * O que mudou em relacao ao db.ts baseado em data/db.json:
 *   - `fs`, `path` e `data/db.json` sairam do codigo de producao. Nao ha
 *     estado em memoria e nenhuma leitura de arquivo: cada metodo e uma
 *     operacao real no banco (filtro, join, insert/update/delete).
 *   - Os metodos viraram async. Nome, argumento e semantica continuam iguais,
 *     entao server.ts so precisou de `await`.
 *   - saveEpisode grava o agregado inteiro em UMA transacao (RPC
 *     public.save_episode). N chamadas via PostgREST seriam N transacoes
 *     separadas e uma falha no meio deixaria o episodio pela metade — o
 *     db.json antigo era um unico writeFileSync, ou tudo ou nada. Ver
 *     supabase/migrations/20260928020000_0002_phase2_persistence.sql secao 5.
 *   - O auto-seed do boot (`if (!fs.existsSync(DB_FILE)) save(seeds)`) saiu.
 *     Era comportamento de demo vazando para producao: a populacao inicial
 *     agora vem de `npm run db:seed`, que e idempotente e explicito.
 *     Ver src/server/seeds.ts.
 *
 * Identidade: a API continua expondo o id textual (prog-1, ep-1, seg-1) na
 * coluna legacy_id. Nenhum UUID novo aparece na frente do usuario e as URLs
 * /api/episodes/:id continuam valendo.
 */
import {
  AgendaEvent,
  CameraConfig,
  Episode,
  LibraryAsset,
  Participant,
  Program,
  QuestionItem,
  Segment,
} from '../types';
import { getSupabase } from './supabase';
import {
  agendaFromRow,
  agendaToRow,
  assetFromRow,
  assetToRow,
  cameraFromRow,
  cameraToRow,
  episodeParticipantFromRow,
  episodeParticipantToRow,
  episodeToRow,
  followUpFromRow,
  followUpToRow,
  libraryFromRow,
  libraryToRow,
  markerFromRow,
  markerToRow,
  participantFromRow,
  participantToRow,
  programFromRow,
  programToRow,
  questionFromRow,
  questionToRow,
  scriptFromRow,
  scriptToRow,
  segmentFromRow,
  segmentToRow,
  shortFromRow,
  shortToRow,
} from './mappers';

type Row = Record<string, any>;

function groupBy<T>(rows: T[], key: (row: T) => string | null | undefined): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (k === null || k === undefined) continue;
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  }
  return out;
}

/** Erro de banco com status HTTP proprio, para a rota nao ter que adivinhar. */
export class DbError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
  }
}

function fail(error: { code?: string; message: string }): never {
  switch (error.code) {
    case '23503': // foreign_key_violation
    case '22004': // invalid_parameter_value (payload incompleto)
    case '22023': // invalid_parameter_value (json)
      throw new DbError(error.message, 400, error.code);
    case '23505': // unique_violation
      throw new DbError(error.message, 409, error.code);
    default:
      throw new DbError(error.message, 500, error.code);
  }
}

/**
 * RISCO 2 da fase 1: `questions` e fonte unica. A UI viva escreve por
 * segments[].questions (EpisodeScriptWorkspace.tsx:94) e o seed escreve por
 * episode.questions — entao os dois caminhos de ENTRADA sao aceitos e
 * deduplicados por id. Na LEITURA as duas chaves sao devolvidas com o mesmo
 * conteudo (ver loadEpisodes), porque EpisodeScriptWorkspace le
 * activeSegment.questions e StudioModeModal le episode.questions com fallback.
 */
function episodeQuestionSource(e: Episode): QuestionItem[] {
  const byId = new Map<string, QuestionItem>();
  for (const q of e.questions ?? []) byId.set(q.id, q);
  for (const s of e.segments ?? e.outline ?? []) {
    for (const q of s.questions ?? []) if (!byId.has(q.id)) byId.set(q.id, q);
  }
  return [...byId.values()];
}

export class Database {
  constructor(private readonly accessToken?: string) {}

  private get sb() {
    return getSupabase(this.accessToken);
  }

  // ===========================================================================
  // programs / shows
  // ===========================================================================

  public async getPrograms(): Promise<Program[]> {
    const { data, error } = await this.sb.from('programs').select('*').order('created_at', { ascending: true });
    if (error) fail(error);
    return this.hydratePrograms(data ?? []);
  }

  public async getProgram(id: string): Promise<Program | undefined> {
    const { data, error } = await this.sb.from('programs').select('*').eq('legacy_id', id).limit(1);
    if (error) fail(error);
    return (await this.hydratePrograms(data ?? []))[0];
  }

  public async saveProgram(program: Program): Promise<Program> {
    // cameras e defaultCameras sao o mesmo conjunto gravado em duas chaves
    // (App.tsx:181 grava defaultCameras; o seed grava cameras).
    const cameras = program.cameras ?? program.defaultCameras;
    const row = programToRow(program);
    if (cameras) row.cameras = cameras.map((c, i) => cameraToRow(c, i));

    const { error } = await this.sb.rpc('save_program', { p_payload: row });
    if (error) fail(error);

    const saved = await this.getProgram(row.legacy_id);
    if (!saved) throw new DbError('Falha ao ler o programa apos gravar.', 500);
    return saved;
  }

  public async deleteProgram(id: string): Promise<boolean> {
    // cameras, participants e episodes sao ON DELETE CASCADE (migration 0001).
    const { data, error } = await this.sb
      .from('programs')
      .delete({ count: 'exact' })
      .eq('legacy_id', id)
      .select('legacy_id');
    if (error) fail(error);
    return (data ?? []).length > 0;
  }

  // Alias de compatibilidade: o db.json gravava a chave `shows` e o contrato
  // HTTP mantem /api/shows. Mesma linha, mesma tabela.
  public getShows(): Promise<Program[]> {
    return this.getPrograms();
  }
  public getShow(id: string): Promise<Program | undefined> {
    return this.getProgram(id);
  }
  public saveShow(show: Program): Promise<Program> {
    return this.saveProgram(show);
  }
  public deleteShow(id: string): Promise<boolean> {
    return this.deleteProgram(id);
  }

  /** 3 queries para N programas: programs + cameras + participants. Sem N+1. */
  private async hydratePrograms(rows: Row[]): Promise<Program[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    const [{ data: cams, error: camErr }, { data: parts, error: partErr }] = await Promise.all([
      this.sb.from('cameras').select('*').in('program_id', ids).order('sort_order', { ascending: true }),
      this.sb.from('participants').select('*').in('program_id', ids).order('created_at', { ascending: true }),
    ]);
    if (camErr) fail(camErr);
    if (partErr) fail(partErr);

    // RISCO 1 da fase 1: Program.participants e projecao de
    // participants WHERE program_id — nao ha coluna duplicada.
    const legacyByUuid = new Map<string, string>(rows.map((r) => [r.id, r.legacy_id]));
    for (const p of parts ?? []) p.program_legacy_id = legacyByUuid.get(p.program_id);

    const camsByProgram = groupBy(cams ?? [], (r) => r.program_id);
    const partsByProgram = groupBy(parts ?? [], (r) => r.program_id);

    return rows.map((r) =>
      programFromRow(
        r,
        (camsByProgram.get(r.id) ?? []).map(cameraFromRow),
        (partsByProgram.get(r.id) ?? []).map(participantFromRow)
      )
    );
  }

  // ===========================================================================
  // participants / guests
  // ===========================================================================

  /** Filtro no banco, nunca em memoria. */
  public async getParticipants(programId?: string): Promise<Participant[]> {
    let q = this.sb.from('participants').select('*').order('created_at', { ascending: true });
    if (programId) {
      const uuid = await this.programUuid(programId);
      if (!uuid) return [];
      q = q.eq('program_id', uuid);
    }
    const { data, error } = await q;
    if (error) fail(error);
    return (await this.attachProgramLegacy(data ?? [])).map(participantFromRow);
  }

  public async getParticipant(id: string): Promise<Participant | undefined> {
    const { data, error } = await this.sb.from('participants').select('*').eq('legacy_id', id).limit(1);
    if (error) fail(error);
    if (!data || data.length === 0) return undefined;
    return participantFromRow((await this.attachProgramLegacy([data[0]]))[0]);
  }

  public async saveParticipant(participant: Participant): Promise<Participant> {
    const row = participantToRow(participant);
    if (participant.programId) {
      const uuid = await this.programUuid(participant.programId);
      if (!uuid) throw new DbError(`Programa não encontrado: ${participant.programId}`, 400);
      row.program_id = uuid;
    }
    const { error } = await this.sb.rpc('tm_row_upsert', { p_table: 'participants', p_rows: [row] });
    if (error) fail(error);
    const saved = await this.getParticipant(row.legacy_id);
    if (!saved) throw new DbError('Falha ao ler o participante apos gravar.', 500);
    return saved;
  }

  public async deleteParticipant(id: string): Promise<boolean> {
    const { data, error } = await this.sb
      .from('participants')
      .delete({ count: 'exact' })
      .eq('legacy_id', id)
      .select('legacy_id');
    if (error) fail(error);
    return (data ?? []).length > 0;
  }

  // Alias de compatibilidade: mesma linha, mesma tabela.
  public getGuests(): Promise<Participant[]> {
    return this.getParticipants();
  }
  public saveGuest(guest: Participant): Promise<Participant> {
    return this.saveParticipant(guest);
  }

  private async programUuid(legacyId: string): Promise<string | null> {
    const { data, error } = await this.sb.from('programs').select('id').eq('legacy_id', legacyId).limit(1);
    if (error) fail(error);
    return data && data.length > 0 ? data[0].id : null;
  }

  /** Preenche `_program_legacy_id` para a resposta expor o id textual, nao o uuid. */
  private async attachProgramLegacy(rows: Row[]): Promise<Row[]> {
    const ids = [...new Set(rows.map((r) => r.program_id).filter(Boolean))] as string[];
    if (ids.length === 0) return rows;
    const { data, error } = await this.sb.from('programs').select('id, legacy_id').in('id', ids);
    if (error) fail(error);
    const legacy = new Map<string, string>((data ?? []).map((p) => [p.id, p.legacy_id]));
    for (const r of rows) r.program_legacy_id = legacy.get(r.program_id);
    return rows;
  }

  // ===========================================================================
  // episodes
  // ===========================================================================

  /** Filtro no banco. `programId` e o id textual do contrato HTTP. */
  public async getEpisodes(programId?: string): Promise<Episode[]> {
    let q = this.sb.from('episodes').select('*').order('created_at', { ascending: false });
    if (programId) {
      const uuid = await this.programUuid(programId);
      if (!uuid) return [];
      q = q.eq('program_id', uuid);
    }
    const { data, error } = await q;
    if (error) fail(error);
    const rows = data ?? [];
    if (rows.length === 0) return [];
    const withLegacy = await this.attachProgramLegacy(rows);
    return this.loadEpisodes(withLegacy);
  }

  public async getEpisode(id: string): Promise<Episode | undefined> {
    const { data, error } = await this.sb.from('episodes').select('*').eq('legacy_id', id).limit(1);
    if (error) fail(error);
    if (!data || data.length === 0) return undefined;
    const [withLegacy] = await this.attachProgramLegacy([data[0]]);
    return (await this.loadEpisodes([withLegacy]))[0];
  }

  public async deleteEpisode(id: string): Promise<boolean> {
    // As 7 tabelas filhas sao ON DELETE CASCADE (migration 0001, secao 1.16).
    const { data, error } = await this.sb
      .from('episodes')
      .delete({ count: 'exact' })
      .eq('legacy_id', id)
      .select('legacy_id');
    if (error) fail(error);
    return (data ?? []).length > 0;
  }

  /**
   * Remonta N episodios com 9 queries no total (raiz + 7 filhas + cameras),
   * independentemente de quantos episodios o pedido traz. Nao e N+1.
   */
  private async loadEpisodes(rows: Row[]): Promise<Episode[]> {
    if (rows.length === 0) return [];
    const episodeIds = rows.map((r) => r.id);
    const programIds = [...new Set(rows.map((r) => r.program_id).filter(Boolean))] as string[];

    const sel = <T extends string>(table: T, order: string) =>
      this.sb.from(table).select('*').in('episode_id', episodeIds).order(order, { ascending: true });

    const [epParts, segments, questions, followUps, script, shorts, assets, markers, camsRes, partsRes, programRes] =
      await Promise.all([
        this.sb.from('episode_participants').select('*').in('episode_id', episodeIds).order('order_pos', { ascending: true }),
        sel('segments', 'order_pos'),
        sel('questions', 'order_pos'),
        this.sb.from('question_follow_ups').select('*').order('order_pos', { ascending: true }),
        sel('script_items', 'order_pos'),
        sel('planned_shorts', 'created_at'),
        sel('production_assets', 'created_at'),
        sel('recording_markers', 'timestamp_sec'),
        this.sb.from('cameras').select('*').in('program_id', programIds).order('sort_order', { ascending: true }),
        this.sb.from('participants').select('id, legacy_id').in('program_id', programIds),
        this.sb.from('programs').select('id, legacy_id').in('id', programIds),
      ]);

    for (const r of [epParts, segments, questions, followUps, script, shorts, assets, markers, camsRes, partsRes, programRes]) {
      if (r.error) fail(r.error);
    }

    // Mapas uuid -> legacy_id. Sao 2 queries fixas, nao uma por episodio.
    const segLegacy = new Map<string, string>((segments.data ?? []).map((s) => [s.id, s.legacy_id]));
    const qLegacy = new Map<string, string>((questions.data ?? []).map((q) => [q.id, q.legacy_id]));
    const partLegacy = new Map<string, string>((partsRes.data ?? []).map((p) => [p.id, p.legacy_id]));
    const camLegacy = new Map<string, string>((camsRes.data ?? []).map((c) => [c.id, c.legacy_id]));

    const followUpsByQuestion = groupBy(
      (followUps.data ?? []).filter((f) => qLegacy.has(f.question_id)),
      (f) => f.question_id
    );

    const epPartsByEpisode = groupBy(epParts.data ?? [], (r) => r.episode_id);
    const segmentsByEpisode = groupBy(segments.data ?? [], (r) => r.episode_id);
    const questionsByEpisode = groupBy(questions.data ?? [], (r) => r.episode_id);
    const scriptByEpisode = groupBy(script.data ?? [], (r) => r.episode_id);
    const shortsByEpisode = groupBy(shorts.data ?? [], (r) => r.episode_id);
    const assetsByEpisode = groupBy(assets.data ?? [], (r) => r.episode_id);
    const markersByEpisode = groupBy(markers.data ?? [], (r) => r.episode_id);
    const camsByProgram = groupBy(camsRes.data ?? [], (r) => r.program_id);

    return rows.map((row) => {
      const epId = row.id;

      // Questions: a tabela e a fonte unica. Episode.questions[] e a lista
      // inteira; Segment.questions[] e a mesma lista agrupada por quadro.
      // As duas chaves sao devolvidas porque o frontend le as duas.
      const episodeQuestions = (questionsByEpisode.get(epId) ?? []).map((q) => {
        q._segment_legacy_id = q.segment_id ? segLegacy.get(q.segment_id) : undefined;
        q._participant_legacy_id = q.participant_id ? partLegacy.get(q.participant_id) : undefined;
        return questionFromRow(q, (followUpsByQuestion.get(q.id) ?? []).map(followUpFromRow));
      });
      const questionsBySegment = groupBy(episodeQuestions, (q) => q.segmentId ?? null);

      const episodeSegments: Segment[] = (segmentsByEpisode.get(epId) ?? []).map((s) => {
        s._suggested_camera_legacy_id = s.suggested_camera_id ? camLegacy.get(s.suggested_camera_id) : undefined;
        return segmentFromRow(s);
      });
      for (const s of episodeSegments) s.questions = questionsBySegment.get(s.id) ?? [];

      const episodeParticipants = (epPartsByEpisode.get(epId) ?? []).map((p) => {
        p._participant_legacy_id = p.participant_id ? partLegacy.get(p.participant_id) : undefined;
        p._entry_segment_legacy_id = p.entry_segment_id ? segLegacy.get(p.entry_segment_id) : undefined;
        p._exit_segment_legacy_id = p.exit_segment_id ? segLegacy.get(p.exit_segment_id) : undefined;
        return episodeParticipantFromRow(p);
      });

      const episodeShorts = (shortsByEpisode.get(epId) ?? []).map((s) => {
        s._segment_legacy_id = s.segment_id ? segLegacy.get(s.segment_id) : undefined;
        return shortFromRow(s);
      });
      const episodeAssets = (assetsByEpisode.get(epId) ?? []).map((a) => {
        a._segment_legacy_id = a.segment_id ? segLegacy.get(a.segment_id) : undefined;
        return assetFromRow(a);
      });
      const episodeScript = (scriptByEpisode.get(epId) ?? []).map((s) => {
        s._segment_legacy_id = s.segment_id ? segLegacy.get(s.segment_id) : undefined;
        s._question_legacy_id = s.question_id ? qLegacy.get(s.question_id) : undefined;
        return scriptFromRow(s);
      });

      // Episode.cameras e a projecao das cameras do programa (migration 0001,
      // secao 1.2): nao ha coluna de cameras por episodio.
      const cameras = (camsByProgram.get(row.program_id) ?? []).map(cameraFromRow);

      return {
        id: row.legacy_id,
        programId: row.program_legacy_id,
        showId: row.program_legacy_id,
        episodeNumber: row.episode_number ?? undefined,
        title: row.title,
        idea: row.idea ?? undefined,
        topic: row.topic ?? undefined,
        synopsis: row.synopsis ?? undefined,
        format: row.format,
        targetDurationMin: row.target_duration_min ?? undefined,
        targetDurationMinutes: row.target_duration_minutes ?? undefined,
        presenterName: row.presenter_name ?? undefined,
        host: row.host ?? undefined,
        tone: row.tone ?? undefined,
        objective: row.objective ?? undefined,
        additionalInfo: row.additional_info ?? undefined,
        status: row.status,
        participants: episodeParticipants,
        segments: episodeSegments,
        outline: episodeSegments, // alias lido por OutlineTab, EpisodeHeader e ExportModal
        diagnosis: row.diagnosis ?? undefined,
        research: row.research ?? undefined,
        questions: episodeQuestions,
        script: episodeScript,
        cameras,
        assets: episodeAssets,
        materials: episodeAssets, // alias lido por EpisodeProductionWorkspace
        shorts: episodeShorts,
        plannedShorts: episodeShorts, // alias lido por EpisodeProductionWorkspace e ExportModal
        recordingMarkers: (markersByEpisode.get(epId) ?? []).map(markerFromRow),
        technicalChecklist: row.technical_checklist ?? undefined,
        checklist: row.checklist ?? undefined, // coluna da migration 0002
        editorialNotesForPost: row.editorial_notes_for_post ?? undefined,
        editorScriptSynthesis: row.editor_script_synthesis ?? undefined,
        recordingTimeElapsed: row.recording_time_elapsed ?? undefined,
        scheduledDate: row.scheduled_date ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Alias derivado: nao ha coluna, mas EpisodeScriptWorkspace e
        // DiagnosisTab leem. Vem dos creditos que nao tem linha em participants.
        guestName: episodeParticipants
          .filter((p) => p.role !== 'Apresentador' && p.role !== 'Apresentador Titular')
          .map((p) => p.name)
          .join(', ') || undefined,
      } as Episode;
    });
  }

  // ===========================================================================
  // saveEpisode — agregado completo em UMA transacao (RPC public.save_episode)
  // ===========================================================================
  public async saveEpisode(episode: Episode): Promise<Episode> {
    // showId e alias de programId. Paridade com o db.json:
    //   programId: episode.programId || episode.showId || 'prog-1'
    const programLegacyId = episode.programId || episode.showId || 'prog-1';
    if (!(await this.programUuid(programLegacyId))) {
      throw new DbError(`Programa não encontrado: ${programLegacyId}`, 400);
    }

    const segments = episode.segments ?? episode.outline ?? [];
    const epParticipants = episode.participants ?? [];
    const questions = episodeQuestionSource(episode);
    const assets = episode.assets ?? episode.materials ?? [];
    const shorts = episode.shorts ?? episode.plannedShorts ?? [];

    // id textual estavel por linha: as referencias cruzadas (segmentId,
    // questionRefId, entrySegmentId, participantIds) usam o mesmo id que
    // volta no legacy_id gravado.
    const segmentRows = segments.map((s, i) => segmentToRow(s, i));
    const participantRows = epParticipants.map((p, i) => episodeParticipantToRow(p, i));
    const questionRows = questions.map((q, i) => questionToRow(q, i));

    // RISCO 8 da fase 1: segment_participants exige que o participante exista
    // em `participants` antes do join. Um creditado do episodio que ainda nao
    // tem linha recebe um stub com o nome que o proprio EpisodeParticipant ja
    // carrega. Nenhum nome e inventado: so entram ids que vieram de
    // Episode.participants[], que tem `name` NOT NULL.
    const referenced = new Set<string>();
    for (const p of epParticipants) if (p.participantId) referenced.add(p.participantId);
    for (const s of segments) for (const pid of s.participantIds ?? []) referenced.add(pid);

    const { data: existingParts, error: partsErr } = referenced.size
      ? await this.sb.from('participants').select('legacy_id').in('legacy_id', [...referenced])
      : { data: [], error: null };
    if (partsErr) fail(partsErr);
    const known = new Set<string>((existingParts ?? []).map((p) => p.legacy_id));

    const ensureParticipants = epParticipants
      .filter((p) => p.participantId && !known.has(p.participantId))
      .map((p) => ({
        legacy_id: p.participantId!,
        name: p.name || p.participantId!,
        members: [],
        links: [],
        social_handles: {},
      }));

    // Join de elenco: so entra quem resolve para uma linha real em
    // `participants` (já cadastrado ou creditado no episodio). Orfao de
    // participantIds e contabilizado e descartado em vez de estourar a FK.
    const segmentParticipants: Row[] = [];
    let orphanParticipantRefs = 0;
    for (let si = 0; si < segments.length; si++) {
      const segmentLegacy = segmentRows[si].legacy_id;
      const ids = segments[si].participantIds ?? [];
      ids.forEach((pid, pi) => {
        if (known.has(pid) || epParticipants.some((p) => p.participantId === pid)) {
          segmentParticipants.push({
            segment_legacy_id: segmentLegacy,
            participant_legacy_id: pid,
            order_pos: pi,
          });
        } else {
          orphanParticipantRefs++;
        }
      });
    }
    if (orphanParticipantRefs > 0) {
      console.warn(
        `[db] ${orphanParticipantRefs} referencia(s) em segments[].participantIds sem participante correspondente foram descartadas.`
      );
    }

    // Repiques achatados: question_follow_ups nao tem episode_id, so
    // question_id. A pergunta e resolvida por legacy_id dentro da RPC.
    const followUpRows = questions.flatMap((q, qi) =>
      (q.followUps ?? []).map((f, fi) => followUpToRow(f, questionRows[qi].legacy_id, fi))
    );

    const { error } = await this.sb.rpc('save_episode', {
      p_payload: {
        episode: {
          ...episodeToRow(episode),
          program_legacy_id: programLegacyId,
        },
        segments: segmentRows,
        ensure_participants: ensureParticipants,
        episode_participants: participantRows,
        segment_participants: segmentParticipants,
        questions: questionRows,
        follow_ups: followUpRows,
        script: episode.script?.map((s, i) => scriptToRow(s, i)) ?? [],
        shorts: shorts.map((s, i) => shortToRow(s, i)),
        assets: assets.map((a, i) => assetToRow(a, i)),
        markers: episode.recordingMarkers?.map((m, i) => markerToRow(m, i)) ?? [],
      },
    });
    if (error) fail(error);

    const saved = await this.getEpisode(episodeToRow(episode).legacy_id);
    if (!saved) throw new DbError('Falha ao ler o episodio apos gravar.', 500);
    return saved;
  }

  // ===========================================================================
  // agenda_events
  //
  // Decisao do dono da fase 2: `date` e o campo canonico (tipo AgendaEvent e
  // seed). A UI grava `scheduledDate` e o DashboardView ordena por
  // `scheduledDate`, o que escondia do dashboard o evento criado pela UI.
  // Resolvido na borda do backend: uma unica coluna (scheduled_date) e a
  // resposta carrega `date` E `scheduledDate` com o mesmo valor, para os dois
  // caminhos de leitura do frontend funcionarem. Nenhum arquivo de
  // src/components/ foi alterado. Ver mappers.ts agendaFromRow.
  // ===========================================================================
  public async getAgendaEvents(): Promise<AgendaEvent[]> {
    const { data, error } = await this.sb
      .from('agenda_events')
      .select('*')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });
    if (error) fail(error);
    const rows = data ?? [];
    if (rows.length === 0) return [];
    const episodeIds = [...new Set(rows.map((r) => r.episode_id).filter(Boolean))] as string[];
    if (episodeIds.length === 0) return rows.map(agendaFromRow);
    const { data: eps, error: epErr } = await this.sb.from('episodes').select('id, legacy_id').in('id', episodeIds);
    if (epErr) fail(epErr);
    const legacy = new Map<string, string>((eps ?? []).map((e) => [e.id, e.legacy_id]));
    for (const r of rows) r._episode_legacy_id = legacy.get(r.episode_id);
    return rows.map(agendaFromRow);
  }

  public async saveAgendaEvent(event: AgendaEvent): Promise<AgendaEvent> {
    const row = agendaToRow(event);
    if (event.episodeId) {
      const { data, error } = await this.sb.from('episodes').select('id').eq('legacy_id', event.episodeId).limit(1);
      if (error) fail(error);
      // episode_id e ON DELETE SET NULL e nullable: um agendamento com
      // episodio inexistente nao pode derrubar o save.
      row.episode_id = data && data.length > 0 ? data[0].id : null;
    }
    const { error } = await this.sb.rpc('tm_row_upsert', { p_table: 'agenda_events', p_rows: [row] });
    if (error) fail(error);
    const saved = (await this.getAgendaEvents()).find((e) => e.id === row.legacy_id);
    if (!saved) throw new DbError('Falha ao ler o agendamento apos gravar.', 500);
    return saved;
  }

  public async deleteAgendaEvent(id: string): Promise<boolean> {
    const { data, error } = await this.sb
      .from('agenda_events')
      .delete({ count: 'exact' })
      .eq('legacy_id', id)
      .select('legacy_id');
    if (error) fail(error);
    return (data ?? []).length > 0;
  }

  // ===========================================================================
  // library_assets
  // ===========================================================================
  public async getLibraryAssets(): Promise<LibraryAsset[]> {
    const { data, error } = await this.sb.from('library_assets').select('*').order('created_at', { ascending: true });
    if (error) fail(error);
    const rows = data ?? [];
    if (rows.length === 0) return [];
    const programIds = [...new Set(rows.map((r) => r.program_id).filter(Boolean))] as string[];
    if (programIds.length === 0) return rows.map(libraryFromRow);
    const { data: progs, error: progErr } = await this.sb.from('programs').select('id, legacy_id').in('id', programIds);
    if (progErr) fail(progErr);
    const legacy = new Map<string, string>((progs ?? []).map((p) => [p.id, p.legacy_id]));
    for (const r of rows) r._program_legacy_id = legacy.get(r.program_id);
    return rows.map(libraryFromRow);
  }

  public async saveLibraryAsset(asset: LibraryAsset): Promise<LibraryAsset> {
    const row = libraryToRow(asset);
    if (asset.programId) {
      // program_id e ON DELETE SET NULL e nullable.
      row.program_id = await this.programUuid(asset.programId);
    }
    const { error } = await this.sb.rpc('tm_row_upsert', { p_table: 'library_assets', p_rows: [row] });
    if (error) fail(error);
    const saved = (await this.getLibraryAssets()).find((a) => a.id === row.legacy_id);
    if (!saved) throw new DbError('Falha ao ler o item da biblioteca apos gravar.', 500);
    return saved;
  }

  /**
   * RISCO 6 da fase 1, corrigido: src/services/api.ts:207 chama
   * DELETE /api/library/:id e server.ts nao tinha a rota — a chamada caia no
   * fallback do Vite, nao num 404. Endpoint aditivo, contrato preservado.
   */
  public async deleteLibraryAsset(id: string): Promise<boolean> {
    const { data, error } = await this.sb
      .from('library_assets')
      .delete({ count: 'exact' })
      .eq('legacy_id', id)
      .select('legacy_id');
    if (error) fail(error);
    return (data ?? []).length > 0;
  }
}

/**
 * Instancia unica. Nao ha estado em memoria: cada metodo le e escreve no
 * PostgreSQL. O construtor nao faz I/O — quem garante que a configuracao
 * existe e o proprio acesso (getSupabase()), e o healthcheck reporta o resto.
 */
export const db = new Database();
