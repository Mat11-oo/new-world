'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, CheckCircle, Circle, Loader, Edit3, AlertCircle, Square, Zap, Settings2, ChevronDown, Home } from 'lucide-react';
import clsx from 'clsx';
import {
  VIDEO_RATIOS,
  VIDEO_RESOLUTIONS,
  VIDEO_GENERATION_MODES,
  type ProviderGroup,
  type VideoGenerationMode,
} from '@/config/models';
import { fetchModelGroupsByType, fetchVideoModelGroupsByAbility } from '@/lib/modelRegistry';
import type { StageDef } from '@/lib/workflowApi';

export type StageStatus = 'pending' | 'running' | 'waiting' | 'completed' | 'error' | 'stopped';

export interface ModelConfig {
  llm_model: string;
  vlm_model: string;
  image_t2i_model: string;
  image_it2i_model: string;
  video_model: string;
  video_first_frame_model: string;
  video_start_end_model: string;
  video_reference_model: string;
  video_generation_mode: VideoGenerationMode;
  video_ratio: string;
  video_resolution: string;
  enable_concurrency: boolean;
}

interface TopBarProps {
  /** null = 首页 */
  activeStage: string | null;
  /** 当前会话所属场景的阶段（按场景顺序） */
  stages: StageDef[];
  stageStatuses: Record<string, StageStatus>;
  onStageClick: (stageId: string) => void;
  onHomeClick: () => void;
  /** 是否处于工作流中（有 sessionId） */
  hasSession: boolean;
  /** 是否正在执行 */
  isRunning: boolean;
  /** 停止执行 */
  onStop: () => void;
  /** 代理模式（自动执行全流程） */
  autoMode: boolean;
  onAutoModeChange: (auto: boolean) => void;
  /** 当前模型配置 */
  modelConfig?: ModelConfig;
  /** 模型配置变更 */
  onModelConfigChange?: (config: ModelConfig) => void;
  /** 项目状态（如 running, waiting, completed, stopped, idle, error 等） */
  projectStatus?: string;
  /** 场景是否包含视频生成阶段（否则隐藏视频相关配置） */
  showVideoModels?: boolean;
  /** 项目灵感/标题，用于左侧项目名 */
  projectTitle?: string;
}

/* ─── 带 Provider 分组的 <select> ─── */
function ProviderSelect({
  value,
  providers,
  onChange,
}: {
  value: string;
  providers: ProviderGroup[];
  onChange: (val: string) => void;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="nw-model-select">
      {providers.map(pg => (
        <optgroup key={pg.provider} label={pg.label}>
          {pg.models.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/* ─── 模型选择下拉面板 ─── */
function ModelSelector({
  config,
  onChange,
  showVideoModels = true,
}: {
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
  showVideoModels?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [llmProviders, setLlmProviders] = useState<ProviderGroup[]>([]);
  const [vlmProviders, setVlmProviders] = useState<ProviderGroup[]>([]);
  const [t2iProviders, setT2iProviders] = useState<ProviderGroup[]>([]);
  const [i2iProviders, setI2iProviders] = useState<ProviderGroup[]>([]);
  const [firstFrameVideoProviders, setFirstFrameVideoProviders] = useState<ProviderGroup[]>([]);
  const [startEndVideoProviders, setStartEndVideoProviders] = useState<ProviderGroup[]>([]);
  const [referenceVideoProviders, setReferenceVideoProviders] = useState<ProviderGroup[]>([]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    fetchModelGroupsByType('llm')
      .then(groups => { if (!cancelled) setLlmProviders(groups); })
      .catch(() => {});
    fetchModelGroupsByType('vlm')
      .then(groups => { if (!cancelled) setVlmProviders(groups); })
      .catch(() => {});
    fetchModelGroupsByType('t2i')
      .then(groups => { if (!cancelled) setT2iProviders(groups); })
      .catch(() => {});
    fetchModelGroupsByType('i2i')
      .then(groups => { if (!cancelled) setI2iProviders(groups); })
      .catch(() => {});
    fetchVideoModelGroupsByAbility('first_frame_i2v')
      .then(groups => { if (!cancelled) setFirstFrameVideoProviders(groups); })
      .catch(() => {});
    fetchVideoModelGroupsByAbility('start_end_frame_i2v')
      .then(groups => { if (!cancelled) setStartEndVideoProviders(groups); })
      .catch(() => {});
    fetchVideoModelGroupsByAbility('reference_to_video')
      .then(groups => { if (!cancelled) setReferenceVideoProviders(groups); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const update = (key: keyof ModelConfig, val: string | boolean) => {
    onChange({ ...config, [key]: val });
  };

  const activeVideoModel =
    config.video_generation_mode === 'start_end_frame'
      ? config.video_start_end_model
      : config.video_generation_mode === 'reference'
        ? config.video_reference_model
        : config.video_first_frame_model;
  const activeVideoProviders =
    config.video_generation_mode === 'start_end_frame'
      ? startEndVideoProviders
      : config.video_generation_mode === 'reference'
        ? referenceVideoProviders
        : firstFrameVideoProviders;
  const activeVideoLabel = VIDEO_GENERATION_MODES.find(item => item.id === config.video_generation_mode)?.label || '首帧生视频';

  const updateVideoMode = (mode: VideoGenerationMode) => {
    const nextModel =
      mode === 'start_end_frame'
        ? config.video_start_end_model
        : mode === 'reference'
          ? config.video_reference_model
          : config.video_first_frame_model;
    onChange({ ...config, video_generation_mode: mode, video_model: nextModel });
  };

  const updateActiveVideoModel = (model: string) => {
    if (config.video_generation_mode === 'start_end_frame') {
      onChange({ ...config, video_start_end_model: model, video_model: model });
    } else if (config.video_generation_mode === 'reference') {
      onChange({ ...config, video_reference_model: model, video_model: model });
    } else {
      onChange({ ...config, video_first_frame_model: model, video_model: model });
    }
  };

  return (
    <div className="nw-model-wrap" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={clsx('nw-project-action', open && 'is-active')}
        title="生成配置"
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>生成配置</span>
        <ChevronDown className={clsx('h-3 w-3 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className="nw-model-menu" role="dialog" aria-label="生成配置">
          <div className="nw-model-head">
            <span className="nw-kicker">MODELS</span>
            <strong>生成配置</strong>
          </div>

          <label className="nw-model-field">
            <span>LLM 模型</span>
            <ProviderSelect value={config.llm_model} providers={llmProviders} onChange={v => update('llm_model', v)} />
          </label>
          <label className="nw-model-field">
            <span>VLM 评估模型</span>
            <ProviderSelect value={config.vlm_model} providers={vlmProviders} onChange={v => update('vlm_model', v)} />
          </label>
          <div className="nw-model-grid">
            <label className="nw-model-field">
              <span>文生图</span>
              <ProviderSelect value={config.image_t2i_model} providers={t2iProviders} onChange={v => update('image_t2i_model', v)} />
            </label>
            <label className="nw-model-field">
              <span>图生图</span>
              <ProviderSelect value={config.image_it2i_model} providers={i2iProviders} onChange={v => update('image_it2i_model', v)} />
            </label>
          </div>

          {showVideoModels && (
            <>
              <div className="nw-model-divider" />
              <label className="nw-model-field">
                <span>视频生成方式</span>
                <select
                  value={config.video_generation_mode}
                  onChange={e => updateVideoMode(e.target.value as VideoGenerationMode)}
                  className="nw-model-select"
                >
                  {VIDEO_GENERATION_MODES.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="nw-model-field">
                <span>{activeVideoLabel}模型</span>
                <ProviderSelect value={activeVideoModel} providers={activeVideoProviders} onChange={updateActiveVideoModel} />
              </label>
            </>
          )}

          <label className="nw-model-field">
            <span>{showVideoModels ? '视频比例' : '画面比例'}</span>
            <div className="nw-model-ratios">
              {VIDEO_RATIOS.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => update('video_ratio', r.id)}
                  className={clsx('nw-model-ratio', config.video_ratio === r.id && 'is-active')}
                  title={r.label}
                >
                  <span
                    className="nw-model-ratio-shape"
                    style={{
                      width: r.ratio === '16:9' ? '16px' : r.ratio === '9:16' ? '9px' : r.ratio === '1:1' ? '12px' : r.ratio === '4:3' ? '14px' : r.ratio === '3:4' ? '10px' : '18px',
                      height: r.ratio === '16:9' ? '9px' : r.ratio === '9:16' ? '16px' : r.ratio === '1:1' ? '12px' : r.ratio === '4:3' ? '10px' : r.ratio === '3:4' ? '14px' : '7px',
                    }}
                  />
                  <em>{r.label}</em>
                </button>
              ))}
            </div>
          </label>
          <label className="nw-model-field">
            <span>{showVideoModels ? '视频分辨率' : '分辨率'}</span>
            <select
              value={config.video_resolution}
              onChange={e => update('video_resolution', e.target.value)}
              className="nw-model-select"
            >
              {VIDEO_RESOLUTIONS.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="nw-model-check">
            <input
              type="checkbox"
              checked={!!config.enable_concurrency}
              onChange={e => update('enable_concurrency', e.target.checked)}
            />
            <span>并发生成</span>
          </label>
        </div>
      )}
    </div>
  );
}

function statusLabel(status?: string) {
  switch (status) {
    case 'running': return '执行中';
    case 'waiting': return '等待确认';
    case 'completed': return '已完成';
    case 'pending': return '空闲';
    case 'stopped': return '已停止';
    case 'error': return '出错';
    default: return status || '';
  }
}

export default function TopBar({
  activeStage,
  stages,
  stageStatuses,
  onStageClick,
  onHomeClick,
  hasSession,
  isRunning,
  onStop,
  autoMode,
  onAutoModeChange,
  modelConfig,
  onModelConfigChange,
  projectStatus,
  showVideoModels = true,
  projectTitle,
}: TopBarProps) {
  if (!hasSession) return null;

  return (
    <header className="nw-projectbar">
      <div className="nw-projectbar-left">
        <button type="button" className="nw-project-home" onClick={onHomeClick} title="返回首页" aria-label="返回首页">
          <Home className="h-4 w-4" />
        </button>
        <div className="nw-project-identity">
          <span className="nw-project-title" title={projectTitle || '未命名项目'}>
            {projectTitle || '未命名项目'}
          </span>
          <span className="nw-project-subtitle">创作流程 · {stages.length} 个阶段</span>
        </div>
        {projectStatus && (
          <span className={clsx('nw-project-status', `status-${projectStatus}`)} title="项目状态">
            {projectStatus === 'running' && <Loader className="h-3 w-3 animate-spin" />}
            {projectStatus === 'waiting' && <Edit3 className="h-3 w-3" />}
            {projectStatus === 'error' && <AlertCircle className="h-3 w-3" />}
            {projectStatus === 'completed' && <CheckCircle className="h-3 w-3" />}
            {statusLabel(projectStatus)}
          </span>
        )}
      </div>

      <nav className="nw-project-stages" aria-label="创作阶段">
        {stages.map((stage, idx) => {
          const status = stageStatuses[stage.id] || 'pending';
          const isActive = activeStage === stage.id;
          return (
            <React.Fragment key={stage.id}>
              {idx > 0 && (
                <span
                  className={clsx('nw-project-line', stageStatuses[stages[idx - 1].id] === 'completed' && 'is-done')}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                onClick={() => onStageClick(stage.id)}
                title={stage.description ? `${stage.name}：${stage.description}` : stage.name}
                aria-current={isActive ? 'step' : undefined}
                className={clsx(
                  'nw-project-step',
                  isActive && 'is-active',
                  status === 'completed' && 'is-done',
                  status === 'waiting' && 'is-waiting',
                  status === 'error' && 'is-error'
                )}
              >
                <span className="nw-project-step-index">
                  {status === 'completed' ? <Check className="h-3 w-3" /> : status === 'running' ? <Loader className="h-3 w-3 animate-spin" /> : (
                    <Circle className={clsx('h-2.5 w-2.5', isActive ? 'fill-current' : '')} />
                  )}
                </span>
                <span className="nw-project-step-label">{stage.short_name || stage.name || stage.id}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="nw-projectbar-actions">
        {modelConfig && onModelConfigChange && (
          <ModelSelector config={modelConfig} onChange={onModelConfigChange} showVideoModels={showVideoModels} />
        )}

        <button
          type="button"
          onClick={() => onAutoModeChange(!autoMode)}
          className={clsx('nw-project-action', autoMode && 'is-auto')}
          title={autoMode ? '代理模式：自动执行全流程' : '手动模式：每阶段需确认'}
        >
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{autoMode ? '自动' : '手动'}</span>
        </button>

        {isRunning && (
          <button type="button" onClick={onStop} className="nw-project-action is-stop" title="停止执行">
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>停止</span>
          </button>
        )}
      </div>
    </header>
  );
}
