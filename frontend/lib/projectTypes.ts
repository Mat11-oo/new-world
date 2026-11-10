import type { VideoGenerationMode } from '@/config/models';

export interface ProjectParams {
  /** 场景包 id；留空时后端使用默认场景 */
  scenario?: string;
  idea: string;
  file_path?: string;
  style: string;
  video_ratio: string;
  video_resolution: string;
  llm_model: string;
  vlm_model: string;
  image_t2i_model: string;
  image_it2i_model: string;
  video_model: string;
  video_first_frame_model: string;
  video_start_end_model: string;
  video_reference_model: string;
  video_generation_mode: VideoGenerationMode;
  expand_idea?: boolean;
  enable_concurrency?: boolean;
  web_search?: boolean;
  episodes?: number;
}
