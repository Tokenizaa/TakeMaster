const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase server configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
}

async function request(path: string, init: RequestInit = {}) {
  assertConfig();
  const headers = new Headers(init.headers);
  headers.set('apikey', SUPABASE_SERVICE_ROLE_KEY);
  headers.set('Authorization', `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function rpc(name: string, body: unknown) {
  assertConfig();
  const headers = new Headers({ apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase RPC ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const enc = encodeURIComponent;

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function idFilter(column: string, value: string) {
  return isUuid(value) ? `${column}=eq.${enc(value)}` : `legacy_id=eq.${enc(value)}`;
}

function toLegacy(row: any) {
  return { ...row, id: row.legacy_id || row.id };
}

function cameraFromDb(row: any) {
  return {
    ...toLegacy(row),
    shotTypes: row.shot_types || [],
    shotType: row.shot_type,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function programFromDb(row: any, cameras: any[] = []) {
  return {
    ...toLegacy(row),
    _dbId: row.id,
    title: row.title || row.name,
    defaultDurationMin: row.default_duration_min ?? row.default_episode_duration_minutes,
    defaultPresenterName: row.default_presenter_name,
    standardStructure: row.standard_structure || [],
    defaultSegments: row.default_segments || [],
    standardSegments: row.standard_segments || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cameras: cameras.map(cameraFromDb),
  };
}

function participantFromDb(row: any) {
  return {
    ...toLegacy(row),
    _dbId: row.id,
    programId: row.program_id,
    groupType: row.group_type,
    companyOrGroup: row.company_or_group,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function segmentFromDb(row: any) {
  return {
    ...toLegacy(row),
    _dbId: row.id,
    order: row.order_pos,
    blockNumber: row.block_number,
    estimatedDurationMin: row.estimated_duration_min ?? row.estimated_duration_minutes,
    suggestedCamera: row.primary_camera,
    transitionText: row.transition_text,
    bRollNotes: row.b_roll_notes,
    plannedStartSec: row.planned_start_sec,
    actualStartSec: row.actual_start_sec,
    actualDurationMin: row.actual_duration_min,
    participantIds: [],
  };
}

function questionFromDb(row: any, followUps: any[]) {
  return {
    ...toLegacy(row),
    _dbId: row.id,
    segmentId: row.segment_id,
    order: row.order_pos,
    targetParticipantName: row.target_participant_name,
    suggestedCamera: row.suggested_camera || row.recommended_camera,
    eyeDirection: row.eye_direction,
    followUps: followUps.filter(f => f.question_id === row.id).map(f => ({
      ...toLegacy(f),
      triggerCondition: f.trigger_condition || f.condition,
      actionOrQuestion: f.action_or_question || f.action,
    })),
  };
}

function scriptFromDb(row: any) {
  return {
    ...toLegacy(row),
    segmentId: row.segment_id,
    questionRefId: row.question_id,
    timestamp: row.timestamp,
    camera: row.camera,
    alternativeCamera: row.alternative_camera,
    directionalMarkers: row.directional_markers || [],
    isTeleprompter: row.is_teleprompter,
  };
}

function shortFromDb(row: any) {
  return {
    ...toLegacy(row),
    segmentId: row.segment_id,
    suggestedHook: row.suggested_hook,
    narrativeArc: row.narrative_arc,
    targetPlatform: row.target_platform || [],
  };
}

function assetFromDb(row: any) {
  return { ...toLegacy(row), segmentId: row.segment_id, fileUrl: row.file_url, blockId: row.block_id, displayTime: row.display_time };
}

function markerFromDb(row: any) {
  return { ...toLegacy(row), timestampSec: row.timestamp_sec, formattedTime: row.formatted_time, blockTitle: row.block_title, referenceText: row.reference_text };
}

export class SupabaseDatabase {
  async getPrograms() {
    const rows = await request('/programs?select=*&order=created_at.asc');
    const cameras = await request('/cameras?select=*&order=sort_order.asc');
    return rows.map((p: any) => programFromDb(p, cameras.filter((c: any) => c.program_id === p.id)));
  }

  async getProgram(id: string) {
    const filter = idFilter('id', id);
    const rows = await request(`/programs?select=*&${filter}&limit=1`);
    if (!rows[0]) return undefined;
    const cameras = await request(`/cameras?select=*&program_id=eq.${enc(rows[0].id)}&order=sort_order.asc`);
    return programFromDb(rows[0], cameras);
  }

  async saveProgram(program: any) {
    const payload = {
      ...program,
      legacy_id: program.legacy_id || program.id,
      title: program.title || program.name,
      name: program.name || program.title,
      created_at: program.created_at || program.createdAt,
      updated_at: new Date().toISOString(),
    };
    await rpc('save_program', payload);
    return (await this.getProgram(payload.legacy_id)) || program;
  }

  async deleteProgram(id: string) {
    const p = await this.getProgram(id);
    if (!p) return false;
    await request(`/programs?id=eq.${enc(p._dbId || p.id)}`, { method: 'DELETE' });
    return true;
  }

  async getParticipants(programId?: string) {
    let filter = '';
    if (programId) {
      const p = await this.getProgram(programId);
      if (!p) return [];
      const raw = await request(`/participants?select=*&program_id=eq.${enc((p as any)._dbId || (p as any).id)}&order=created_at.asc`);
      return raw.map(participantFromDb).map((x:any) => ({...x, programId: programId || x.programId}));
    }
    const raw = await request('/participants?select=*&order=created_at.asc');
    return raw.map(participantFromDb);
  }

  async getParticipant(id: string) {
    const rows = await request(`/participants?select=*&${idFilter('id', id)}&limit=1`);
    return rows[0] ? participantFromDb(rows[0]) : undefined;
  }

  async saveParticipant(participant: any) {
    const p = await this.getProgram(participant.programId);
    if (!p) throw new Error('Programa não encontrado');
    const payload = {
      ...participant,
      legacy_id: participant.legacy_id || participant.id,
      program_id: (p as any)._dbId || (p as any).id,
      id: undefined,
      created_at: participant.created_at || participant.createdAt,
      updated_at: new Date().toISOString(),
    };
    delete payload.id;
    await request('/participants?on_conflict=legacy_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(payload) });
    return this.getParticipant(payload.legacy_id);
  }

  async deleteParticipant(id: string) {
    const p = await this.getParticipant(id);
    if (!p) return false;
    const rows = await request(`/participants?select=id&${idFilter('id', id)}&limit=1`);
    if (!rows[0]) return false;
    await request(`/participants?id=eq.${enc(rows[0].id)}`, { method: 'DELETE' });
    return true;
  }

  async getEpisodes(programId?: string) {
    let url = '/episodes?select=*&order=episode_number.asc,created_at.asc';
    if (programId) {
      const p = await this.getProgram(programId);
      if (!p) return [];
      url = `/episodes?select=*&program_id=eq.${enc((p as any)._dbId || (p as any).id)}&order=episode_number.asc,created_at.asc`;
    }
    const rows = await request(url);
    return Promise.all(rows.map((e: any) => this.getEpisode(e.legacy_id || e.id)));
  }

  async getEpisode(id: string) {
    const rows = await request(`/episodes?select=*&${idFilter('id', id)}&limit=1`);
    if (!rows[0]) return undefined;
    const e = rows[0];
    const [segments, questions, followUps, script, shorts, assets, markers, epParticipants, cameras, programRows, participantRows, segmentParticipantRows] = await Promise.all([
      request(`/segments?select=*&episode_id=eq.${enc(e.id)}&order=order_pos.asc`),
      request(`/questions?select=*&episode_id=eq.${enc(e.id)}&order=order_pos.asc`),
      request('/question_follow_ups?select=*'),
      request(`/script_items?select=*&episode_id=eq.${enc(e.id)}&order=order_pos.asc`),
      request(`/planned_shorts?select=*&episode_id=eq.${enc(e.id)}&order=created_at.asc`),
      request(`/production_assets?select=*&episode_id=eq.${enc(e.id)}&order=created_at.asc`),
      request(`/recording_markers?select=*&episode_id=eq.${enc(e.id)}&order=timestamp_sec.asc`),
      request(`/episode_participants?select=*&episode_id=eq.${enc(e.id)}&order=order_pos.asc`),
      request(`/cameras?select=*&program_id=eq.${enc(e.program_id)}&order=sort_order.asc`),
      request(`/programs?select=id,legacy_id&${idFilter('id', e.program_id)}&limit=1`),
      request('/participants?select=id,legacy_id&order=created_at.asc'),
      request(`/segment_participants?select=segment_id,participant_id,order_pos`)
    ]);
    const filteredFollowUps = followUps.filter((f: any) => questions.some((q: any) => q.id === f.question_id));
    const participantLegacyById = new Map<string, string>(participantRows.map((p: any) => [String(p.id), String(p.legacy_id || p.id)]));
    const segmentParticipantMap = new Map<string, string[]>();
    for (const sp of segmentParticipantRows) {
      const legacy = participantLegacyById.get(sp.participant_id);
      if (!legacy || typeof legacy !== 'string') continue;
      const list = segmentParticipantMap.get(sp.segment_id) || [];
      list.push(legacy);
      segmentParticipantMap.set(sp.segment_id, list);
    }
    const segmentOut = segments.map((s: any) => ({ ...segmentFromDb(s), participantIds: segmentParticipantMap.get(s.id) || [] }));
    const qOut = questions.map((q: any) => ({ ...questionFromDb(q, filteredFollowUps), participantId: q.participant_id ? participantLegacyById.get(q.participant_id) : undefined }));
    const partOut = epParticipants.map((p: any) => ({ ...toLegacy(p), participantId: participantLegacyById.get(p.participant_id) || p.participant_id, estimatedTimeMin: p.estimated_time_min, isFeatured: p.is_featured, order: p.order_pos }));
    const out = {
      ...toLegacy(e),
      _dbId: e.id,
      programId: programRows[0]?.legacy_id || e.program_id,
      showId: programRows[0]?.legacy_id || e.program_id,
      episodeNumber: e.episode_number,
      targetDurationMin: e.target_duration_min ?? e.target_duration_minutes,
      targetDurationMinutes: e.target_duration_minutes ?? e.target_duration_min,
      presenterName: e.presenter_name,
      additionalInfo: e.additional_info,
      technicalChecklist: e.technical_checklist,
      editorialNotesForPost: e.editorial_notes_for_post,
      editorScriptSynthesis: e.editor_script_synthesis,
      recordingTimeElapsed: e.recording_time_elapsed,
      scheduledDate: e.scheduled_date,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      participants: partOut,
      segments: segmentOut,
      questions: qOut,
      script: script.map(scriptFromDb),
      shorts: shorts.map(shortFromDb),
      assets: assets.map(assetFromDb),
      recordingMarkers: markers.map(markerFromDb),
      cameras: cameras.map(cameraFromDb),
    };
    return out;
  }

  async saveEpisode(episode: any) {
    const payload = JSON.parse(JSON.stringify(episode));
    payload.legacy_id = payload.legacy_id || payload.id;
    const program = await this.getProgram(payload.programId || payload.showId || payload.program_legacy_id);
    if (!program) throw new Error('Programa não encontrado');
    payload.program_legacy_id = (program as any).legacy_id || (program as any).id;
    const participants = (payload.participants || []).map((p:any) => ({
      legacy_id: p.legacy_id || p.participantId || p.id,
      program_id: (program as any)._dbId,
      name:p.name, type:p.type, role:p.role,
      company_or_group:p.companyOrGroup, bio:p.bio, notes:p.notes
    }));
    const episodeParticipants = (payload.participants || []).map((p:any, i:number) => ({
      legacy_id: p.legacy_id || p.id || `${payload.legacy_id}-participant-${i+1}`,
      participant_legacy_id: p.participantId || p.legacy_id || p.id,
      name:p.name, type:p.type, role:p.role, order_pos:p.order || i+1,
      notes:p.notes, is_featured:p.isFeatured, estimated_time_min:p.estimatedTimeMin, bio:p.bio
    }));
    const result = await rpc('save_episode', {
      episode: payload,
      segments: payload.segments || [],
      ensure_participants: participants,
      episode_participants: episodeParticipants,
      segment_participants: [],
      questions: payload.questions || [],
      follow_ups: (payload.questions || []).flatMap((q: any) => (q.followUps || []).map((f: any) => ({ ...f, question_legacy_id: q.id }))),
      script: payload.script || [],
      shorts: payload.shorts || [],
      assets: payload.assets || [],
      markers: payload.recordingMarkers || []
    });
    return this.getEpisode(result.legacy_id);
  }

  async deleteEpisode(id: string) {
    const rows = await request(`/episodes?select=id&${idFilter('id', id)}&limit=1`);
    if (!rows[0]) return false;
    await request(`/episodes?id=eq.${enc(rows[0].id)}`, { method: 'DELETE' });
    return true;
  }

  async getAgendaEvents() {
    const rows = await request('/agenda_events?select=*&order=scheduled_date.asc,scheduled_time.asc');
    const programs = await request('/programs?select=id,legacy_id');
    const programLegacyById = new Map(programs.map((p:any) => [p.id, p.legacy_id || p.id]));
    return rows.map((r: any) => ({ ...toLegacy(r), episodeId: r.episode_id, programId: programLegacyById.get(r.program_id) || r.program_id, programTitle: r.program_title, episodeTitle: r.episode_title, date: r.scheduled_date, time: r.scheduled_time?.slice(0,5), durationMin: r.duration_min, participantsSummary: r.participants_summary }));
  }

  async saveAgendaEvent(event: any) {
    const ep = event.episodeId ? await this.getEpisode(event.episodeId) : undefined;
    const program = event.programId ? await this.getProgram(event.programId) : undefined;
    const row = { legacy_id: event.legacy_id || event.id, title: event.title || event.episodeTitle, episode_id: ep ? (await request(`/episodes?select=id&legacy_id=eq.${enc(event.episodeId)}&limit=1`))[0]?.id : null, program_id: program ? (program as any)._dbId : null, program_title: event.programTitle, episode_title: event.episodeTitle, scheduled_date: event.date, scheduled_time: event.time, duration_min: event.durationMin, location: event.location, type: event.type, status: event.status, notes: event.notes, participants_summary: event.participantsSummary };
    await request('/agenda_events?on_conflict=legacy_id', { method:'POST', headers:{Prefer:'resolution=merge-duplicates'}, body:JSON.stringify(row) });
    return event;
  }

  async deleteAgendaEvent(id: string) {
    const rows = await request(`/agenda_events?select=id&${idFilter('id', id)}&limit=1`);
    if (!rows[0]) return false;
    await request(`/agenda_events?id=eq.${enc(rows[0].id)}`, {method:'DELETE'});
    return true;
  }

  async getLibraryAssets() {
    const rows = await request('/library_assets?select=*&order=created_at.asc');
    return rows.map((r:any)=>({ ...toLegacy(r), programId:r.program_id, createdAt:r.created_at, updatedAt:r.updated_at, tags:r.tags||[] }));
  }

  async saveLibraryAsset(asset:any) {
    const row={legacy_id:asset.legacy_id||asset.id,program_id:asset.programId||null,title:asset.title,category:asset.category,type:asset.type,description:asset.description,content:asset.content,url:asset.url,tags:asset.tags||[]};
    await request('/library_assets?on_conflict=legacy_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify(row)});
    const rows=await request(`/library_assets?select=*&legacy_id=eq.${enc(row.legacy_id)}&limit=1`);
    return rows[0]?{...toLegacy(rows[0]),programId:rows[0].program_id,tags:rows[0].tags||[]}:asset;
  }
}
