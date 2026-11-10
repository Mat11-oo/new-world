import type { Scenario } from './workflowApi';

/** 会话所属场景的阶段顺序：优先 stage_ids，旧数据回退到 status 映射的键 */
export function sessionStageIds(session: any): string[] {
  if (Array.isArray(session?.stage_ids) && session.stage_ids.length > 0) return session.stage_ids;
  return Object.keys(session?.status || {});
}

export function sessionTitle(session: any): string {
  return session?.title || session?.idea || session?.id || '未命名项目';
}

export function sessionDate(session: any): string {
  const raw = session?.date;
  if (!raw) return '';
  const ms = Number(raw) < 1e12 ? Number(raw) * 1000 : Number(raw);
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleDateString('zh-CN');
}

export function sessionCompletedCount(session: any): number {
  const map = session?.status || {};
  return Object.values(map).filter(value => ['completed', 'session_completed'].includes(String(value))).length;
}

export function isSessionDone(session: any): boolean {
  const ids = sessionStageIds(session);
  const map = session?.status || {};
  return ids.length > 0 && ids.every(id => ['completed', 'session_completed'].includes(map[id]));
}

export type SessionActivity = 'running' | 'waiting' | 'completed' | 'pending';

export function sessionActivity(session: any): SessionActivity {
  const values = Object.values(session?.status || {}).map(String);
  if (values.includes('running')) return 'running';
  if (values.includes('waiting')) return 'waiting';
  if (isSessionDone(session)) return 'completed';
  if (values.some(value => ['completed', 'session_completed'].includes(value))) return 'pending';
  return 'pending';
}

export function sessionProgress(session: any): { completed: number; total: number; percent: number } {
  const total = Math.max(1, sessionStageIds(session).length);
  const completed = sessionCompletedCount(session);
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

export function activityLabel(activity: SessionActivity): string {
  switch (activity) {
    case 'running': return '生成中';
    case 'waiting': return '待确认';
    case 'completed': return '已完成';
    default: return '未完成';
  }
}

export function stageProgressLabel(session: any, scenario?: Scenario): { text: string; activity: SessionActivity } {
  const activity = sessionActivity(session);
  const map = session?.status || {};
  const ids = sessionStageIds(session);
  const completed = ids.filter(id => ['completed', 'session_completed'].includes(map[id]));
  if (activity === 'completed') return { text: '已完成', activity };
  if (activity === 'running') return { text: `生成中 (${completed.length}/${ids.length})`, activity };
  if (activity === 'waiting') {
    const stageId = Object.keys(map).find(key => map[key] === 'waiting');
    const stageDef = scenario?.stages.find(item => item.id === stageId);
    return { text: `待确认：${stageDef?.short_name || stageDef?.name || stageId || ''}`, activity };
  }
  if (completed.length === 0) return { text: '未开始', activity };
  const lastStageId = completed[completed.length - 1];
  const stageDef = scenario?.stages.find(item => item.id === lastStageId);
  return { text: `已完成：${stageDef?.short_name || stageDef?.name || lastStageId} (${completed.length}/${ids.length})`, activity };
}
