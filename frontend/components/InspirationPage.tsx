'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ImageIcon, Film, Loader2, Plus } from 'lucide-react';
import clsx from 'clsx';
import { fetchScenarios, type Scenario, type ScenarioExample } from '@/lib/workflowApi';
import { visibleScenarios } from '@/lib/scenarioView';

type InspirationItem = ScenarioExample & {
  scenarioId: string;
  scenarioName: string;
  category: string;
};

function createHref(scenarioId: string, idea: string) {
  const params = new URLSearchParams({ scenario: scenarioId, idea });
  return `/workbench?${params.toString()}#composer`;
}

export default function InspirationPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedId, setSelectedId] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchScenarios()
      .then(result => {
        if (cancelled) return;
        setScenarios(visibleScenarios(result.scenarios || []));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedScenario = scenarios.find(scenario => scenario.id === selectedId);

  const items = useMemo<InspirationItem[]>(() => {
    const pool = selectedId === 'all' ? scenarios : scenarios.filter(scenario => scenario.id === selectedId);
    return pool.flatMap(scenario => (scenario.ui?.examples || []).map(example => ({
      ...example,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      category: scenario.category,
    })));
  }, [scenarios, selectedId]);

  const totalExamples = useMemo(
    () => scenarios.reduce((sum, scenario) => sum + (scenario.ui?.examples?.length || 0), 0),
    [scenarios],
  );

  return (
    <div className="nw-page nw-inspiration-page">
      <div className="nw-container">
        <header className="nw-page-head nw-dash-head">
          <div>
            <nav className="nw-crumbs" aria-label="面包屑">
              <Link href="/workbench">工作台</Link>
              <span aria-hidden="true">/</span>
              <span>灵感库</span>
            </nav>
            <span className="nw-kicker">INSPIRATION</span>
            <h1>灵感库</h1>
            <p>按场景浏览示例，选择一个作为起点，再改成你自己的故事。</p>
          </div>
          <Link href="/workbench#composer" className="nw-btn nw-btn-primary nw-dash-cta">
            <Plus className="h-4 w-4" aria-hidden="true" />
            新建创作
          </Link>
        </header>

        <div className="nw-filter-row" role="tablist" aria-label="按场景筛选灵感">
          <button
            type="button"
            role="tab"
            aria-selected={selectedId === 'all'}
            onClick={() => setSelectedId('all')}
            className={clsx('nw-filter', selectedId === 'all' && 'is-active')}
          >
            全部
            <em>{totalExamples}</em>
          </button>
          {scenarios.map(scenario => (
            <button
              key={scenario.id}
              type="button"
              role="tab"
              aria-selected={selectedId === scenario.id}
              onClick={() => setSelectedId(scenario.id)}
              className={clsx('nw-filter', selectedId === scenario.id && 'is-active')}
            >
              {scenario.name}
              <em>{scenario.ui?.examples?.length || 0}</em>
            </button>
          ))}
        </div>

        {selectedScenario && (
          <div className="nw-inspiration-note">
            <span className="nw-tag">
              {selectedScenario.category === 'image'
                ? <ImageIcon className="h-3 w-3" aria-hidden="true" />
                : <Film className="h-3 w-3" aria-hidden="true" />}
              {selectedScenario.category === 'image' ? '图片' : '视频'}
            </span>
            <p>{selectedScenario.description || selectedScenario.tagline}</p>
          </div>
        )}

        {loading ? (
          <div className="nw-projects-empty">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在读取灵感
          </div>
        ) : items.length === 0 ? (
          <div className="nw-projects-empty">
            <p>这个场景还没有灵感示例。</p>
            <Link href="/workbench#composer" className="nw-btn nw-btn-secondary">直接开始创作</Link>
          </div>
        ) : (
          <div className="nw-gallery-grid nw-inspiration-grid">
            {items.map((example, index) => (
              <Link
                key={`${example.scenarioId}-${index}`}
                href={createHref(example.scenarioId, example.idea)}
                className={clsx('nw-insp-card', !example.image && 'is-typographic', `tone-${index % 4}`)}
              >
                {example.image ? (
                  <span
                    className="nw-insp-media"
                    style={{ backgroundImage: `url(${example.image})` }}
                    aria-hidden="true"
                  />
                ) : (
                  <span className="nw-insp-wash" aria-hidden="true" />
                )}
                <span className="nw-insp-index">{String(index + 1).padStart(2, '0')}</span>
                {!example.image && (
                  <span className="nw-insp-glyph" aria-hidden="true">{example.title.slice(0, 1)}</span>
                )}
                <span className="nw-insp-body">
                  {selectedId === 'all' && <span className="nw-insp-scenario">{example.scenarioName}</span>}
                  <span className="nw-insp-title">{example.title}</span>
                  <span className="nw-insp-desc">{example.description || example.idea}</span>
                  <span className="nw-insp-cta">
                    以此开始
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
