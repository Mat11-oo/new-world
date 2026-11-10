'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Loader2, Plus, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { deleteSession, fetchScenarios, fetchSessions, type Scenario } from '@/lib/workflowApi';
import { scenarioDisplayName } from '@/lib/scenarioView';
import {
  activityLabel,
  sessionActivity,
  sessionDate,
  sessionProgress,
  sessionTitle,
  stageProgressLabel,
  type SessionActivity,
} from '@/lib/sessionSummary';

const FILTERS: Array<{ id: 'all' | SessionActivity; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'running', label: '进行中' },
  { id: 'waiting', label: '待确认' },
  { id: 'completed', label: '已完成' },
  { id: 'pending', label: '未完成' },
];

export default function ProjectsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [filter, setFilter] = useState<'all' | SessionActivity>('all');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [sessionList, scenarioList] = await Promise.all([
        fetchSessions().catch(() => []),
        fetchScenarios().catch(() => null),
      ]);
      setSessions(Array.isArray(sessionList) ? sessionList : []);
      if (scenarioList?.scenarios) setScenarios(scenarioList.scenarios);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: sessions.length, running: 0, waiting: 0, completed: 0, pending: 0 };
    for (const session of sessions) {
      const activity = sessionActivity(session);
      map[activity] = (map[activity] || 0) + 1;
    }
    return map;
  }, [sessions]);

  const filtered = useMemo(() => {
    if (filter === 'all') return sessions;
    return sessions.filter(session => sessionActivity(session) === filter);
  }, [sessions, filter]);

  const scenarioById = (id?: string) => scenarios.find(item => item.id === id);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await deleteSession(deleteTarget.id);
      setSessions(current => current.filter(session => session.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err?.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="nw-page nw-projects">
      <div className="nw-container">
        <header className="nw-page-head nw-dash-head">
          <div>
            <nav className="nw-crumbs" aria-label="面包屑">
              <Link href="/workbench">工作台</Link>
              <span aria-hidden="true">/</span>
              <span>我的作品</span>
            </nav>
            <span className="nw-kicker">ARCHIVE</span>
            <h1>我的作品</h1>
            <p>所有项目都会自动保存，可以回到任意阶段继续编辑或重做。</p>
          </div>
          <Link href="/workbench#composer" className="nw-btn nw-btn-primary nw-dash-cta">
            <Plus className="h-4 w-4" aria-hidden="true" />
            新建创作
          </Link>
        </header>

        <div className="nw-filter-row" role="tablist" aria-label="按状态筛选">
          {FILTERS.map(item => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={clsx('nw-filter', filter === item.id && 'is-active')}
            >
              {item.label}
              <em>{counts[item.id] ?? 0}</em>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="nw-projects-empty">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在读取作品
          </div>
        ) : filtered.length === 0 ? (
          <div className="nw-projects-empty">
            <p>{sessions.length === 0 ? '还没有作品。' : '这个筛选条件下没有项目。'}</p>
            {sessions.length === 0 && (
              <Link href="/workbench#composer" className="nw-btn nw-btn-secondary">
                创建第一个项目
              </Link>
            )}
          </div>
        ) : (
          <div className="nw-project-table" role="table" aria-label="作品列表">
            <div className="nw-project-table-head" role="row">
              <span role="columnheader">项目</span>
              <span role="columnheader">场景</span>
              <span role="columnheader">状态</span>
              <span role="columnheader">进度</span>
              <span role="columnheader">更新时间</span>
              <span role="columnheader" aria-label="操作" />
            </div>
            {filtered.map(session => {
              const scenario = scenarioById(session.scenario);
              const activity = sessionActivity(session);
              const progress = sessionProgress(session);
              const label = stageProgressLabel(session, scenario);
              return (
                <div key={session.id} className="nw-project-row" role="row">
                  <div className="nw-project-cell-main" role="cell">
                    <Link href={`/workspace?session=${encodeURIComponent(session.id)}`} className="nw-project-link">
                      <span className="nw-project-name">{sessionTitle(session)}</span>
                      <span className="nw-project-sub">{label.text}</span>
                    </Link>
                  </div>
                  <div className="nw-project-cell" role="cell">
                    <span className="nw-tag">{scenarioDisplayName(session.scenario, scenario?.name)}</span>
                  </div>
                  <div className="nw-project-cell" role="cell">
                    <span className={clsx('nw-activity', `is-${activity}`)}>{activityLabel(activity)}</span>
                  </div>
                  <div className="nw-project-cell nw-project-progress" role="cell">
                    <span className="nw-project-bar"><span style={{ width: `${Math.max(2, progress.percent)}%` }} /></span>
                    <em>{progress.completed}/{progress.total}</em>
                  </div>
                  <div className="nw-project-cell nw-project-date" role="cell">{sessionDate(session) || '—'}</div>
                  <div className="nw-project-cell nw-project-actions" role="cell">
                    <Link
                      href={`/workspace?session=${encodeURIComponent(session.id)}`}
                      className="nw-icon-action"
                      aria-label="打开项目"
                      title="打开项目"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      className="nw-icon-action is-danger"
                      onClick={() => { setDeleteTarget(session); setError(''); }}
                      aria-label="删除项目"
                      title="删除项目"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="nw-scrim nw-scrim-center">
          <div className="nw-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="nw-modal-head">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <h3 id="delete-title">删除项目</h3>
            </div>
            <p className="nw-modal-copy">确认删除「{sessionTitle(deleteTarget)}」吗？此操作不可撤销。</p>
            {error && <p className="nw-modal-error">{error}</p>}
            <div className="nw-modal-actions">
              <button type="button" className="nw-btn nw-btn-secondary" onClick={() => setDeleteTarget(null)}>取消</button>
              <button type="button" className="nw-btn nw-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
