'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import {
  STYLES,
  VIDEO_RATIOS,
  VIDEO_RESOLUTIONS,
  VIDEO_GENERATION_MODES,
  type ProviderGroup,
  type VideoGenerationMode,
} from '@/config/models';

interface WorkbenchSettingsProps {
  open: boolean;
  onClose: () => void;
  style: string;
  onStyleChange: (value: string) => void;
  styleOptions: { id: string; label: string }[];
  ratio: string;
  onRatioChange: (value: string) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  videoDuration: number;
  onVideoDurationChange: (value: number) => void;
  llm: string;
  onLlmChange: (value: string) => void;
  vlm: string;
  onVlmChange: (value: string) => void;
  t2i: string;
  onT2iChange: (value: string) => void;
  i2i: string;
  onI2iChange: (value: string) => void;
  videoMode: VideoGenerationMode;
  onVideoModeChange: (value: VideoGenerationMode) => void;
  activeVideoModel: string;
  activeVideoProviders: ProviderGroup[];
  onActiveVideoModelChange: (value: string) => void;
  videoModeLabel: string;
  requiresVideo: boolean;
  concurrency: boolean;
  onConcurrencyChange: (value: boolean) => void;
  webSearch: boolean;
  onWebSearchChange: (value: boolean) => void;
  llmProviders: ProviderGroup[];
  vlmProviders: ProviderGroup[];
  t2iProviders: ProviderGroup[];
  i2iProviders: ProviderGroup[];
  configLoading: boolean;
  configError: string;
}

export default function WorkbenchSettings({
  open,
  onClose,
  style,
  onStyleChange,
  styleOptions,
  ratio,
  onRatioChange,
  resolution,
  onResolutionChange,
  videoDuration,
  onVideoDurationChange,
  llm,
  onLlmChange,
  vlm,
  onVlmChange,
  t2i,
  onT2iChange,
  i2i,
  onI2iChange,
  videoMode,
  onVideoModeChange,
  activeVideoModel,
  activeVideoProviders,
  onActiveVideoModelChange,
  videoModeLabel,
  requiresVideo,
  concurrency,
  onConcurrencyChange,
  webSearch,
  onWebSearchChange,
  llmProviders,
  vlmProviders,
  t2iProviders,
  i2iProviders,
  configLoading,
  configError,
}: WorkbenchSettingsProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="nw-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="nw-drawer nw-wb-settings" role="dialog" aria-modal="true" aria-labelledby="wb-settings-title">
        <header className="nw-drawer-head">
          <div>
            <span className="nw-kicker">SETTINGS</span>
            <h2 id="wb-settings-title">生成设置</h2>
          </div>
          <button type="button" className="sfa-icon-button sfa-icon-button-quiet" onClick={onClose} aria-label="关闭">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="nw-drawer-body">
          {(configLoading || configError) && (
            <p className={clsx('nw-wb-settings-note', configError && 'is-error')}>
              {configError || '正在读取默认模型配置…'}
            </p>
          )}

          <section className="nw-drawer-section">
            <h3>画面</h3>
            <label className="nw-field">
              <span>风格</span>
              <select value={style} onChange={event => onStyleChange(event.target.value)}>
                {styleOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <div className="nw-field">
              <span>{requiresVideo ? '视频长宽比' : '画面比例'}</span>
              <div className="nw-ratio-grid">
                {VIDEO_RATIOS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onRatioChange(item.id)}
                    className={clsx('nw-ratio', ratio === item.id && 'is-active')}
                  >
                    <span
                      className="nw-ratio-shape"
                      style={{
                        width: item.ratio === '16:9' ? '30px' : item.ratio === '9:16' ? '17px' : item.ratio === '1:1' ? '23px' : item.ratio === '4:3' ? '26px' : item.ratio === '3:4' ? '19px' : '34px',
                        height: item.ratio === '16:9' ? '17px' : item.ratio === '9:16' ? '30px' : item.ratio === '1:1' ? '23px' : item.ratio === '4:3' ? '20px' : item.ratio === '3:4' ? '26px' : '14px',
                      }}
                    />
                    <em>{item.label}</em>
                  </button>
                ))}
              </div>
            </div>
            <label className="nw-field">
              <span>{requiresVideo ? '视频分辨率' : '分辨率'}</span>
              <select value={resolution} onChange={event => onResolutionChange(event.target.value)}>
                {VIDEO_RESOLUTIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            {requiresVideo && (
              <label className="nw-field">
                <span>单段视频时长</span>
                <select value={String(videoDuration)} onChange={event => onVideoDurationChange(Number(event.target.value))}>
                  <option value="5">5 秒 / 段</option>
                  <option value="10">10 秒 / 段</option>
                  <option value="15">15 秒 / 段</option>
                </select>
              </label>
            )}
          </section>

          <section className="nw-drawer-section">
            <h3>模型</h3>
            <div className="nw-field-grid">
              <label className="nw-field">
                <span>LLM 模型</span>
                <select value={llm} onChange={event => onLlmChange(event.target.value)}>
                  {llmProviders.map(group => (
                    <optgroup key={group.provider} label={group.label}>
                      {group.models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="nw-field">
                <span>VLM 评估模型</span>
                <select value={vlm} onChange={event => onVlmChange(event.target.value)}>
                  {vlmProviders.map(group => (
                    <optgroup key={group.provider} label={group.label}>
                      {group.models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="nw-field">
                <span>文生图</span>
                <select value={t2i} onChange={event => onT2iChange(event.target.value)}>
                  {t2iProviders.map(group => (
                    <optgroup key={group.provider} label={group.label}>
                      {group.models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="nw-field">
                <span>图生图</span>
                <select value={i2i} onChange={event => onI2iChange(event.target.value)}>
                  {i2iProviders.map(group => (
                    <optgroup key={group.provider} label={group.label}>
                      {group.models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>

            {requiresVideo && (
              <div className="nw-field-grid">
                <label className="nw-field">
                  <span>视频生成方式</span>
                  <select value={videoMode} onChange={event => onVideoModeChange(event.target.value as VideoGenerationMode)}>
                    {VIDEO_GENERATION_MODES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </label>
                <label className="nw-field">
                  <span>{videoModeLabel}模型</span>
                  <select value={activeVideoModel} onChange={event => onActiveVideoModelChange(event.target.value)}>
                    {activeVideoProviders.map(group => (
                      <optgroup key={group.provider} label={group.label}>
                        {group.models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>

          <section className="nw-drawer-section">
            <h3>高级</h3>
            <label className="nw-switch-row">
              <span>
                并发生成
                <em>多个镜头同时生成，速度更快</em>
              </span>
              <input
                type="checkbox"
                checked={concurrency}
                onChange={event => onConcurrencyChange(event.target.checked)}
              />
            </label>
            <label className="nw-switch-row">
              <span>
                联网搜索
                <em>让模型在写剧本前检索资料</em>
              </span>
              <input
                type="checkbox"
                checked={webSearch}
                onChange={event => onWebSearchChange(event.target.checked)}
              />
            </label>
          </section>
        </div>

        <footer className="nw-drawer-foot">
          <button type="button" className="nw-btn nw-btn-primary" onClick={onClose}>完成</button>
        </footer>
      </aside>
    </>
  );
}
