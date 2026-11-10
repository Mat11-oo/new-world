import type { Scenario } from './workflowApi';

/** The three legacy scenarios are merged into the unified video generation scenario. */
export const VIDEO_GENERATION_SCENARIO_ID = 'video_generation';

const MERGED_SCENARIO_IDS = new Set(['short_film', 'ecommerce_ad', 'travel_promo', 'comic_drama']);
const HIDDEN_SCENARIO_IDS = new Set(['short_film', 'ecommerce_ad', 'travel_promo', 'comic_drama', 'product_poster']);

export function normalizeScenarioId(id?: string | null): string {
  if (!id) return '';
  return MERGED_SCENARIO_IDS.has(id) ? VIDEO_GENERATION_SCENARIO_ID : id;
}

export function visibleScenarios(scenarios: Scenario[]): Scenario[] {
  return scenarios.filter(scenario => !HIDDEN_SCENARIO_IDS.has(scenario.id));
}

export function scenarioDisplayName(id: string | undefined, fallback = '创作项目'): string {
  if (id === 'product_poster') return '文生图';
  if (id === VIDEO_GENERATION_SCENARIO_ID || (id && MERGED_SCENARIO_IDS.has(id))) {
    return '视频生成';
  }
  return fallback;
}
