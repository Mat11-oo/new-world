'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Clapperboard,
  FolderOpen,
  Globe,
  Images,
  ImagePlus,
  ListOrdered,
  Loader2,
  MessageSquare,
  Plus,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { brand } from '@/config/brand';
import { fetchScenarios, fetchSessions, startProject, uploadMedia, type Scenario } from '@/lib/workflowApi';
import { fetchModelGroupsByType, fetchVideoModelGroupsByAbility } from '@/lib/modelRegistry';
import {
  STYLES,
  VIDEO_RATIOS,
  VIDEO_RESOLUTIONS,
  VIDEO_GENERATION_MODES,
  type ProviderGroup,
  type VideoGenerationMode,
} from '@/config/models';
import WorkbenchSettings from '@/components/WorkbenchSettings';
import { sessionActivity } from '@/lib/sessionSummary';
import { normalizeScenarioId, visibleScenarios } from '@/lib/scenarioView';

const SCENARIO_KEY = `${brand.storagePrefix}.scenario`;

function toolMediaUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('result/')) return `/code/${path}`;
  if (!path.startsWith('/code/')) return `/code/result/${path}`;
  return path;
}

const SCENES: Record<string, { src: string; label: string }> = {
  short_film: { src: '/ui/cover-space.jpg', label: '星海' },
  video_generation: { src: '/ui/cover-space.jpg', label: '视频' },
  ecommerce_ad: { src: '/ui/cover-cat.jpg', label: '治愈' },
  comic_drama: { src: '/ui/cover-ink.jpg', label: '水墨' },
  travel_promo: { src: '/ui/cover-mars.jpg', label: '火星' },
  product_poster: { src: '/ui/cover-detective.jpg', label: '悬疑' },
};

const FALLBACK_SCENE = { src: '/ui/cover-wuxia.jpg', label: '武侠' };

function sceneFor(scenarioId?: string) {
  return (scenarioId && SCENES[scenarioId]) || (scenarioId ? FALLBACK_SCENE : { src: '/ui/cover-space.jpg', label: '星海' });
}

function createHref(
  scenarioId: string,
  idea?: string,
  extra?: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();
  if (scenarioId) params.set('scenario', scenarioId);
  if (idea?.trim()) params.set('idea', idea.trim());
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `/workbench?${query}#composer` : '/workbench#composer';
}

const QUICK_TOOLS = [
  { href: '/workbench#composer', label: '新建创作', icon: Plus },
  { href: '/projects', label: '作品', icon: FolderOpen },
  { href: '/inspiration', label: '灵感库', icon: Images },
];

const WORKBENCH_TOOLS = [
  { id: 'llm' as const, label: 'LLM 对话', description: '文字生成 / 问答 / 搜索', icon: MessageSquare, image: '/ui/cover-detective.jpg' },
  { id: 't2i' as const, label: '文生图', description: '图片生成 / 商品海报', icon: Sparkles, image: '/ui/cover-cat.jpg' },
  { id: 'i2i' as const, label: '图生图', description: '图片风格转换', icon: Zap, image: '/ui/cover-ink.jpg' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioId, setScenarioId] = useState('');
  const [idea, setIdea] = useState('');
  const [material, setMaterial] = useState<{ name: string; path: string } | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTool, setActiveTool] = useState<'llm' | 't2i' | 'i2i' | null>(null);
  const [toolModel, setToolModel] = useState('');
  const [toolPoster, setToolPoster] = useState(false);
  const [toolWebSearch, setToolWebSearch] = useState(false);
  const [toolImage, setToolImage] = useState<{ name: string; path: string } | null>(null);
  const [toolUploading, setToolUploading] = useState(false);
  const [toolLoading, setToolLoading] = useState(false);
  const [toolResult, setToolResult] = useState<{ tool: 'llm' | 't2i' | 'i2i'; text?: string; images?: string[] } | null>(null);
  const [toolError, setToolError] = useState('');
  const [videoDuration, setVideoDuration] = useState(5);
  const [configLoading, setConfigLoading] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [configError, setConfigError] = useState('');
  const [submitting, setSubmitting] = useState<'auto' | 'manual' | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedRatio, setSelectedRatio] = useState('16:9');
  const [selectedResolution, setSelectedResolution] = useState('720P');
  const [selectedLLM, setSelectedLLM] = useState('');
  const [selectedVLM, setSelectedVLM] = useState('');
  const [selectedT2I, setSelectedT2I] = useState('');
  const [selectedI2I, setSelectedI2I] = useState('');
  const [selectedVideoMode, setSelectedVideoMode] = useState<VideoGenerationMode>('first_frame');
  const [selectedFirstFrameVideo, setSelectedFirstFrameVideo] = useState('');
  const [selectedStartEndVideo, setSelectedStartEndVideo] = useState('');
  const [selectedReferenceVideo, setSelectedReferenceVideo] = useState('');
  const [enableConcurrency, setEnableConcurrency] = useState(true);
  const [webSearch, setWebSearch] = useState(false);
  const [llmProviders, setLlmProviders] = useState<ProviderGroup[]>([]);
  const [vlmProviders, setVlmProviders] = useState<ProviderGroup[]>([]);
  const [t2iProviders, setT2iProviders] = useState<ProviderGroup[]>([]);
  const [i2iProviders, setI2iProviders] = useState<ProviderGroup[]>([]);
  const [firstFrameVideoProviders, setFirstFrameVideoProviders] = useState<ProviderGroup[]>([]);
  const [startEndVideoProviders, setStartEndVideoProviders] = useState<ProviderGroup[]>([]);
  const [referenceVideoProviders, setReferenceVideoProviders] = useState<ProviderGroup[]>([]);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const toolImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchSessions().catch(() => []),
      fetchScenarios().catch(() => null),
    ]).then(([sessionList, scenarioList]) => {
      if (cancelled) return;
      setSessions(Array.isArray(sessionList) ? sessionList : []);
      if (scenarioList?.scenarios?.length) {
        const visible = visibleScenarios(scenarioList.scenarios);
        setScenarios(visible);
        let stored = '';
        try {
          stored = window.localStorage.getItem(SCENARIO_KEY) || '';
        } catch {
          stored = '';
        }
        const queryScenario = normalizeScenarioId(new URLSearchParams(window.location.search).get('scenario'));
        const storedScenario = normalizeScenarioId(stored);
        const defaultScenario = normalizeScenarioId(scenarioList.default);
        const initial = visible.find(item => item.id === queryScenario)
          || visible.find(item => item.id === storedScenario)
          || visible.find(item => item.id === defaultScenario)
          || visible[0];
        if (initial) setScenarioId(initial.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setConfigLoading(true);
      setConfigError('');
      try {
        const resp = await fetch('/api/config');
        if (!resp.ok) throw new Error('读取默认模型配置失败');
        const data = await resp.json();
        const models = data.config?.models || {};
        const generation = data.config?.generation || {};
        const firstFrameModel = models.video_first_frame || models.video;
        const startEndModel = models.video_start_end || 'wan2.7-i2v';
        const referenceModel = models.video_reference || 'wan2.7-r2v';
        const videoMode = (generation.video_generation_mode || 'first_frame') as VideoGenerationMode;
        if (!models.llm || !models.vlm || !models.image_t2i || !models.image_it2i) {
          throw new Error('backend/config.yaml 缺少主流程默认模型');
        }
        if (cancelled) return;
        setSelectedStyle(generation.style || 'realistic');
        setSelectedLLM(models.llm);
        setSelectedVLM(models.vlm);
        setSelectedT2I(models.image_t2i);
        setSelectedI2I(models.image_it2i);
        setSelectedVideoMode(videoMode);
        setSelectedFirstFrameVideo(firstFrameModel);
        setSelectedStartEndVideo(startEndModel);
        setSelectedReferenceVideo(referenceModel);
        setSelectedRatio(generation.video_ratio || '16:9');
        setSelectedResolution(generation.video_resolution || '720P');
      } catch (error: any) {
        if (!cancelled) setConfigError(error?.message || '读取默认模型配置失败');
      } finally {
        if (!cancelled) {
          setConfigLoading(false);
          setConfigReady(true);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchModelGroupsByType('llm').then(groups => { if (!cancelled) setLlmProviders(groups); }).catch(() => {});
    fetchModelGroupsByType('vlm').then(groups => { if (!cancelled) setVlmProviders(groups); }).catch(() => {});
    fetchModelGroupsByType('t2i').then(groups => { if (!cancelled) setT2iProviders(groups); }).catch(() => {});
    fetchModelGroupsByType('i2i').then(groups => { if (!cancelled) setI2iProviders(groups); }).catch(() => {});
    fetchVideoModelGroupsByAbility('first_frame_i2v').then(groups => { if (!cancelled) setFirstFrameVideoProviders(groups); }).catch(() => {});
    fetchVideoModelGroupsByAbility('start_end_frame_i2v').then(groups => { if (!cancelled) setStartEndVideoProviders(groups); }).catch(() => {});
    fetchVideoModelGroupsByAbility('reference_to_video').then(groups => { if (!cancelled) setReferenceVideoProviders(groups); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const queryIdea = query.get('idea');
    if (queryIdea) setIdea(queryIdea);
    const queryMaterial = query.get('material');
    if (queryMaterial) {
      setMaterial({ name: query.get('material_name') || '已上传素材', path: queryMaterial });
    }
    if (query.get('panel') === 'settings') setShowSettings(true);
    if (query.get('tools') === '1' || query.get('mode') === 'tools') {
      const tool = query.get('tool');
      setActiveTool(tool === 't2i' || tool === 'i2i' ? tool : 'llm');
    }
  }, []);

  const toolGroups = activeTool === 'llm'
    ? llmProviders
    : activeTool === 't2i'
      ? t2iProviders
      : activeTool === 'i2i'
        ? i2iProviders
        : [];
  const toolModels = toolGroups.flatMap(group => group.models);
  const activeToolLabel = activeTool === 'llm' ? 'LLM 对话' : activeTool === 't2i' ? '文生图' : activeTool === 'i2i' ? '图生图' : '';
  const canToolSubmit = Boolean(
    activeTool && idea.trim() && toolModel && !toolLoading && !toolUploading
    && (activeTool !== 'i2i' || toolImage)
  );

  useEffect(() => {
    if (!activeTool) return;
    const fallback = activeTool === 'llm' ? selectedLLM : activeTool === 't2i' ? selectedT2I : selectedI2I;
    setToolModel(current => (
      toolModels.some(model => model.id === current)
        ? current
        : (toolModels.find(model => model.default)?.id || fallback || toolModels[0]?.id || '')
    ));
    // The provider groups and defaults only change when the tool or config changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, llmProviders, t2iProviders, i2iProviders, selectedLLM, selectedT2I, selectedI2I]);

  const activeScenario = scenarios.find(scenario => scenario.id === scenarioId);
  const activeScene = sceneFor(scenarioId);
  const scenarioIndex = Math.max(0, scenarios.findIndex(scenario => scenario.id === scenarioId));
  const activeToolIndex = Math.max(0, WORKBENCH_TOOLS.findIndex(tool => tool.id === activeTool));

  const stats = useMemo(() => {
    let running = 0;
    let waiting = 0;
    let completed = 0;
    for (const session of sessions) {
      const activity = sessionActivity(session);
      if (activity === 'running') running += 1;
      else if (activity === 'waiting') waiting += 1;
      else if (activity === 'completed') completed += 1;
    }
    return { running, waiting, completed, total: sessions.length };
  }, [sessions]);

  const requiresVideo = activeScenario?.requires_video_model ?? true;
  const activeVideoModel = selectedVideoMode === 'start_end_frame'
    ? selectedStartEndVideo
    : selectedVideoMode === 'reference'
      ? selectedReferenceVideo
      : selectedFirstFrameVideo;
  const activeVideoProviders = selectedVideoMode === 'start_end_frame'
    ? startEndVideoProviders
    : selectedVideoMode === 'reference'
      ? referenceVideoProviders
      : firstFrameVideoProviders;
  const selectedVideoModeLabel = VIDEO_GENERATION_MODES.find(item => item.id === selectedVideoMode)?.label || '首帧生视频';
  const modelConfigReady = Boolean(
    selectedLLM && selectedVLM && selectedT2I && selectedI2I && selectedRatio && selectedResolution
    && (!requiresVideo || activeVideoModel)
  );
  const canStart = Boolean(
    scenarioId && (idea.trim() || material) && modelConfigReady && !configLoading && !submitting
  );
  const styleOptions = useMemo(() => {
    const base = [...STYLES];
    for (const item of activeScenario?.styles || []) {
      if (item?.id && !base.some(option => option.id === item.id)) {
        base.push({ id: item.id, label: item.label || item.id });
      }
    }
    return base;
  }, [activeScenario?.styles]);

  useEffect(() => {
    if (!configReady || !activeScenario) return;
    const defaults = activeScenario.defaults || {};
    if (defaults.style) setSelectedStyle(defaults.style);
    if (defaults.video_ratio) setSelectedRatio(defaults.video_ratio);
    if (defaults.video_resolution) setSelectedResolution(defaults.video_resolution);
    if (defaults.video_generation_mode) setSelectedVideoMode(defaults.video_generation_mode as VideoGenerationMode);
    setVideoDuration(defaults.video_duration && defaults.video_duration > 0 ? Math.min(15, Math.max(5, defaults.video_duration)) : 5);
    // Apply scenario defaults only when the scenario (or initial config) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScenario?.id, configReady]);

  const closeSettings = useCallback(() => setShowSettings(false), []);

  const handleSettingsVideoModeChange = (mode: VideoGenerationMode) => {
    setSelectedVideoMode(mode);
  };

  const handleActiveVideoModelChange = (value: string) => {
    if (selectedVideoMode === 'start_end_frame') setSelectedStartEndVideo(value);
    else if (selectedVideoMode === 'reference') setSelectedReferenceVideo(value);
    else setSelectedFirstFrameVideo(value);
  };

  useEffect(() => {
    if (!toolResult) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setToolResult(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toolResult]);


  const selectScenario = (scenario: Scenario) => {
    setScenarioId(scenario.id);
    setActiveTool(null);
    setToolResult(null);
    try {
      window.localStorage.setItem(SCENARIO_KEY, scenario.id);
    } catch {
      /* ignore */
    }
  };

  const activateTool = (tool: 'llm' | 't2i' | 'i2i') => {
    setActiveTool(tool);
    setToolError('');
    setToolResult(null);
    setToolPoster(false);
    setToolWebSearch(false);
    setToolImage(null);
  };

  const handleToolImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToolError('请选择图片文件');
      if (toolImageInputRef.current) toolImageInputRef.current.value = '';
      return;
    }
    setToolUploading(true);
    setToolError('');
    try {
      const result = await uploadMedia(file);
      setToolImage({ name: file.name, path: result.file_path });
    } catch (error: any) {
      setToolError(error?.message || '图片上传失败');
    } finally {
      setToolUploading(false);
      if (toolImageInputRef.current) toolImageInputRef.current.value = '';
    }
  };

  const handleToolSubmit = async () => {
    if (!activeTool || !canToolSubmit) return;
    setToolLoading(true);
    setToolError('');
    setToolResult(null);
    try {
      let endpoint = '';
      const body: Record<string, unknown> = { model: toolModel, prompt: idea.trim() };
      if (activeTool === 'llm') {
        endpoint = '/api/sandbox/llm';
        if (toolWebSearch) body.web_search = true;
      } else if (activeTool === 't2i') {
        endpoint = '/api/sandbox/t2i';
        if (toolPoster) {
          body.prompt = `生成一张电商商品海报：${idea.trim()}。竖版 3:4，主体清晰，高级简洁，带有主标题与卖点文案排版。`;
          body.ratio = '3:4';
          body.style = 'realistic';
        }
      } else {
        endpoint = '/api/sandbox/i2i';
        body.image = toolImage?.path;
        body.ratio = '16:9';
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.detail || '生成失败');
      }
      if (activeTool === 'llm') {
        setToolResult({ tool: 'llm', text: String(data.result || '') });
      } else {
        setToolResult({
          tool: activeTool,
          images: Array.isArray(data.result) ? data.result : [],
        });
      }
    } catch (error: any) {
      setToolError(error?.message || '生成失败');
    } finally {
      setToolLoading(false);
    }
  };

  const handleStart = async (mode: 'auto' | 'manual') => {
    if (!canStart) return;
    setSubmitting(mode);
    setSubmitError('');
    try {
      const result = await startProject({
        scenario: scenarioId,
        idea,
        file_path: material?.path,
        style: selectedStyle,
        video_ratio: selectedRatio,
        video_resolution: selectedResolution,
        llm_model: selectedLLM,
        vlm_model: selectedVLM,
        image_t2i_model: selectedT2I,
        image_it2i_model: selectedI2I,
        video_generation_mode: selectedVideoMode,
        video_first_frame_model: selectedFirstFrameVideo,
        video_start_end_model: selectedStartEndVideo,
        video_reference_model: selectedReferenceVideo,
        video_model: activeVideoModel,
        enable_concurrency: enableConcurrency,
        web_search: webSearch,
        video_duration: videoDuration,
      });
      router.push(`/workspace?session=${encodeURIComponent(result.session_id)}&autostart=${mode}`);
    } catch (error: any) {
      setSubmitError(error?.message || '创建项目失败');
      setSubmitting(null);
    }
  };

  const handleMaterialUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedExtensions = ['.doc', '.docx', '.txt', '.md', '.pdf'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      alert(`仅支持 ${allowedExtensions.join(', ')} 格式的文件`);
      if (materialInputRef.current) materialInputRef.current.value = '';
      return;
    }
    setUploadingMaterial(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/upload_file', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('文件上传失败');
      const data = await response.json();
      if (!data.file_path) throw new Error('未返回文件路径');
      setMaterial({ name: file.name, path: data.file_path });
    } catch {
      alert('上传素材失败，请重试');
    } finally {
      setUploadingMaterial(false);
      if (materialInputRef.current) materialInputRef.current.value = '';
    }
  };

  return (
    <div className="nw-workbench-page">
          <section className="nw-wb-hero" aria-labelledby="workbench-title">
            <div className="nw-wb-hero-media" aria-hidden="true">
              <div
                className={clsx('nw-wb-hero-cover', !activeTool && !scenarioId && 'is-active')}
                style={{ backgroundImage: `url(${activeScene.src})` }}
              />
              {scenarios.map((scenario, index) => (
                <div
                  key={scenario.id}
                  className={clsx('nw-wb-hero-cover', `motion-${index % 5}`, !activeTool && scenario.id === scenarioId && 'is-active')}
                  style={{ backgroundImage: `url(${sceneFor(scenario.id).src})` }}
                />
              ))}
              {WORKBENCH_TOOLS.map((tool, index) => (
                <div
                  key={`tool-cover-${tool.id}`}
                  className={clsx('nw-wb-hero-cover', `motion-${(index + 2) % 5}`, activeTool === tool.id && 'is-active')}
                  style={{ backgroundImage: `url(${tool.image})` }}
                />
              ))}
            </div>
            <div className="nw-wb-hero-veil" aria-hidden="true" />
            <div className="nw-wb-hero-grain" aria-hidden="true" />
            <span className="nw-wb-hero-scan" aria-hidden="true" />

            <div className="nw-wb-hero-inner">
              <div className="nw-wb-hero-top">
                <span className="nw-wb-kicker">AI FILM STUDIO — WORKBENCH</span>
                <span className="nw-wb-scene">
                  {activeTool
                    ? `TOOL ${String(activeToolIndex + 1).padStart(2, '0')} / ${activeToolLabel}`
                    : `SCENE ${String(scenarioIndex + 1).padStart(2, '0')} / ${activeScene.label}`}
                </span>
              </div>

              <div className="nw-wb-hero-copy">
                <span className="nw-wb-title-eyebrow">MAKE IT REAL</span>
                <h1 id="workbench-title">把想象，<em>变成新世界</em></h1>
                <p>选择场景，写下想法，生成完整视频。</p>
              </div>

              {(
                <div className="nw-wb-tabs" role="tablist" aria-label="选择创作场景与工具">
                  {scenarios.map(scenario => (
                    <button
                      key={scenario.id}
                      type="button"
                      role="tab"
                      aria-selected={!activeTool && scenario.id === scenarioId}
                      onClick={() => selectScenario(scenario)}
                      className={clsx('nw-wb-tab', !activeTool && scenario.id === scenarioId && 'is-active')}
                    >
                      <Clapperboard className="h-3 w-3" />
                      {scenario.name}
                    </button>
                  ))}
                  <span className="nw-wb-tab-divider" aria-hidden="true" />
                  {WORKBENCH_TOOLS.map(tool => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => activateTool(tool.id)}
                        className={clsx('nw-wb-tab nw-wb-tool-tab', activeTool === tool.id && 'is-active')}
                        title={`使用${tool.label}`}
                      >
                        <Icon className="h-3 w-3" />
                        {tool.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <form
                id="composer"
                className="nw-wb-composer"
                onSubmit={event => {
                  event.preventDefault();
                  if (activeTool) void handleToolSubmit();
                  else handleStart('auto');
                }}
              >
                <textarea
                  value={idea}
                  onChange={event => setIdea(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      if (activeTool) void handleToolSubmit();
                      else handleStart('auto');
                    }
                  }}
                  placeholder={activeTool === 'llm'
                    ? '输入你想问的问题…'
                    : activeTool === 't2i'
                      ? (toolPoster ? '描述商品、卖点与海报画面…' : '描述你想生成的图片…')
                      : activeTool === 'i2i'
                        ? '描述希望如何转换这张图片…'
                        : (activeScenario?.ui?.placeholder || '描述你的想法，输入一段故事、一个画面或一句灵感……')}
                  className="nw-wb-textarea"
                  aria-label={activeTool ? activeToolLabel : '创作想法'}
                />
                <div className="nw-wb-composer-bar">
                  <div className="nw-wb-composer-chips">
                    {activeTool ? (
                      <>
                        <label className="nw-wb-tool-model">
                          <select value={toolModel} onChange={event => setToolModel(event.target.value)} aria-label="选择模型">
                            {toolGroups.map(group => (
                              <optgroup key={group.provider} label={group.label}>
                                {group.models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
                              </optgroup>
                            ))}
                          </select>
                        </label>
                        {activeTool === 'llm' && (
                          <button
                            type="button"
                            onClick={() => setToolWebSearch(value => !value)}
                            className={clsx('nw-wb-chip', toolWebSearch && 'is-open')}
                          >
                            <Globe className="h-3.5 w-3.5" />
                            联网搜索
                          </button>
                        )}
                        {activeTool === 't2i' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setToolPoster(false)}
                              className={clsx('nw-wb-chip', !toolPoster && 'is-open')}
                            >
                              普通图片
                            </button>
                            <button
                              type="button"
                              onClick={() => setToolPoster(true)}
                              className={clsx('nw-wb-chip', toolPoster && 'is-open')}
                            >
                              商品海报
                            </button>
                          </>
                        )}
                        {activeTool === 'i2i' && (
                          <>
                            <input
                              ref={toolImageInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleToolImageUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => toolImageInputRef.current?.click()}
                              disabled={toolUploading}
                              className="nw-wb-chip"
                            >
                              {toolUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                              {toolUploading ? '上传中…' : toolImage ? '更换图片' : '上传图片'}
                            </button>
                            {toolImage && (
                              <span className="nw-wb-chip is-static nw-wb-material-chip" title={toolImage.name}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="nw-wb-material-name">{toolImage.name}</span>
                                <button type="button" className="nw-wb-material-remove" onClick={() => setToolImage(null)} aria-label="移除图片">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                    <input
                      ref={materialInputRef}
                      type="file"
                      onChange={handleMaterialUpload}
                      accept=".doc,.docx,.txt,.md,.pdf"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => materialInputRef.current?.click()}
                      disabled={uploadingMaterial}
                      className="nw-wb-chip"
                      title="上传 Word / TXT / MD / PDF 参考素材"
                    >
                      {uploadingMaterial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                      {uploadingMaterial ? '上传中…' : '素材'}
                    </button>
                    {material && (
                      <span className="nw-wb-chip is-static nw-wb-material-chip" title={material.name}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="nw-wb-material-name">{material.name}</span>
                        <button
                          type="button"
                          className="nw-wb-material-remove"
                          onClick={() => setMaterial(null)}
                          aria-label="移除素材"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSettings(true)}
                      className="nw-wb-chip"
                      title="打开生成设置（模型与画面）"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      生成设置
                    </button>
                    {requiresVideo && (
                      <button
                        type="button"
                        onClick={() => setShowSettings(true)}
                        className="nw-wb-chip"
                        title="设置单段视频时长"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        时长 {videoDuration}s
                      </button>
                    )}
                      </>
                    )}
                  </div>
                  <div className="nw-wb-composer-actions">
                    {activeTool ? (
                      <button
                        type="button"
                        className="nw-wb-send-cta"
                        onClick={() => void handleToolSubmit()}
                        disabled={!canToolSubmit}
                        title={canToolSubmit ? `生成${activeToolLabel}结果` : '请输入内容并完成必要设置'}
                      >
                        {toolLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {activeTool === 'llm' ? '发送' : activeTool === 't2i' ? '生成图片' : '转换图片'}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="nw-wb-secondary-cta"
                          onClick={() => handleStart('manual')}
                          disabled={!canStart}
                          title={canStart ? '每个阶段完成后暂停，由你确认' : '先补充想法或素材，并等待模型配置就绪'}
                        >
                          {submitting === 'manual' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          逐步创作
                        </button>
                        <button
                          type="submit"
                          className="nw-wb-send-cta"
                          disabled={!canStart}
                          title={canStart ? '一键生成并自动确认阶段' : '先补充想法或素材，并等待模型配置就绪'}
                        >
                          {submitting === 'auto' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          一键生成
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </form>
              <p className="nw-wb-composer-hint">
                {activeTool
                  ? `${activeToolLabel} · 生成结果会显示在当前页面`
                  : '⌘ / Ctrl + Enter 一键生成 · 设置、素材与时长会应用到本次创作'}
              </p>
              {activeTool ? (
                toolError && <p className="nw-wb-composer-error">{toolError}</p>
              ) : (
                <>
                  {submitError && <p className="nw-wb-composer-error">{submitError}</p>}
                  {!submitError && !configLoading && (!modelConfigReady || configError) && (
                    <p className="nw-wb-composer-error">模型配置未就绪，请打开生成设置检查后重试。</p>
                  )}
                </>
              )}

              <div className="nw-wb-tools">
                {QUICK_TOOLS.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <Link key={tool.href} href={tool.href} className="nw-wb-tool">
                      <span className="nw-wb-tool-icon"><Icon className="h-4 w-4" /></span>
                      <span>{tool.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="nw-wb-hero-foot">
                <span><i className="nw-wb-dot is-running" />进行中 {stats.running}</span>
                <span><i className="nw-wb-dot is-waiting" />待确认 {stats.waiting}</span>
                <span><i className="nw-wb-dot is-completed" />已完成 {stats.completed}</span>
                <span className="nw-wb-hero-foot-right">作品 {stats.total}</span>
              </div>
            </div>
          </section>

          <section className="nw-wb-section nw-wb-scene-section" aria-labelledby="scenes-title">
            <header className="nw-wb-section-head">
              <div>
                <span className="nw-wb-kicker">SCENARIOS</span>
                <h2 id="scenes-title">创作场景</h2>
              </div>
              <Link href="/inspiration" className="nw-wb-text-link">
                灵感库
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </header>

            <div className="nw-wb-rail nw-wb-scene-rail">
              {scenarios.map(scenario => {
                const scene = sceneFor(scenario.id);
                return (
                  <Link
                    key={scenario.id}
                    href={createHref(scenario.id)}
                    onClick={event => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      selectScenario(scenario);
                      document.getElementById('composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="nw-wb-scene-card"
                  >
                    <span
                      className="nw-wb-card-media"
                      style={{ backgroundImage: `url(${scene.src})` }}
                      aria-hidden="true"
                    />
                    <span className="nw-wb-card-shade" aria-hidden="true" />
                    <span className="nw-wb-scene-top">
                      <span>{scenario.stages.length} 阶段</span>
                    </span>
                    <span className="nw-wb-scene-body">
                      <strong>{scenario.name}</strong>
                      <em>{scenario.tagline || scenario.description}</em>
                      <span className="nw-wb-scene-cta">
                        开始创作
                      </span>
                    </span>
                  </Link>
                );
              })}
              {WORKBENCH_TOOLS.map(tool => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      activateTool(tool.id);
                      document.getElementById('composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={clsx('nw-wb-scene-card nw-wb-tool-card', activeTool === tool.id && 'is-active')}
                  >
                    <span
                      className="nw-wb-card-media"
                      style={{ backgroundImage: `url(${tool.image})` }}
                      aria-hidden="true"
                    />
                    <span className="nw-wb-card-shade" aria-hidden="true" />
                    <span className="nw-wb-tool-card-glow" aria-hidden="true" />
                    <span className="nw-wb-scene-top">
                      <span>AI</span>
                    </span>
                    <span className="nw-wb-scene-body">
                      <strong>{tool.label}</strong>
                      <em>{tool.description}</em>
                      <span className="nw-wb-scene-cta">
                        打开工具
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>


      {toolResult && (
        <>
          <div className="nw-tool-result-backdrop" onClick={() => setToolResult(null)} aria-hidden="true" />
          <aside className="nw-tool-result-panel" role="dialog" aria-modal="true" aria-label={`${activeToolLabel}结果`}>
            <header className="nw-tool-result-head">
              <div>
                <span className="nw-wb-kicker">RESULT · {toolResult.tool.toUpperCase()}</span>
                <h2>{activeToolLabel}结果</h2>
              </div>
              <button type="button" className="sfa-icon-button sfa-icon-button-quiet" onClick={() => setToolResult(null)} aria-label="关闭结果">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="nw-tool-result-body">
              {toolResult.text && <pre className="nw-tool-result-text">{toolResult.text}</pre>}
              {toolResult.images && toolResult.images.length > 0 && (
                <div className="nw-tool-result-images">
                  {toolResult.images.map((path, index) => (
                    <a key={`${path}-${index}`} href={toolMediaUrl(path)} target="_blank" rel="noopener noreferrer">
                      <img src={toolMediaUrl(path)} alt={`${activeToolLabel}结果 ${index + 1}`} />
                    </a>
                  ))}
                </div>
              )}
              {!toolResult.text && (!toolResult.images || toolResult.images.length === 0) && (
                <p className="nw-tool-result-empty">没有返回结果，请调整提示词后重试。</p>
              )}
            </div>
          </aside>
        </>
      )}

      <WorkbenchSettings
        open={showSettings}
        onClose={closeSettings}
        style={selectedStyle}
        onStyleChange={setSelectedStyle}
        styleOptions={styleOptions}
        ratio={selectedRatio}
        onRatioChange={setSelectedRatio}
        resolution={selectedResolution}
        onResolutionChange={setSelectedResolution}
        videoDuration={videoDuration}
        onVideoDurationChange={setVideoDuration}
        llm={selectedLLM}
        onLlmChange={setSelectedLLM}
        vlm={selectedVLM}
        onVlmChange={setSelectedVLM}
        t2i={selectedT2I}
        onT2iChange={setSelectedT2I}
        i2i={selectedI2I}
        onI2iChange={setSelectedI2I}
        videoMode={selectedVideoMode}
        onVideoModeChange={handleSettingsVideoModeChange}
        activeVideoModel={activeVideoModel}
        activeVideoProviders={activeVideoProviders}
        onActiveVideoModelChange={handleActiveVideoModelChange}
        videoModeLabel={selectedVideoModeLabel}
        requiresVideo={requiresVideo}
        concurrency={enableConcurrency}
        onConcurrencyChange={setEnableConcurrency}
        webSearch={webSearch}
        onWebSearchChange={setWebSearch}
        llmProviders={llmProviders}
        vlmProviders={vlmProviders}
        t2iProviders={t2iProviders}
        i2iProviders={i2iProviders}
        configLoading={configLoading}
        configError={configError}
      />
    </div>
  );
}
