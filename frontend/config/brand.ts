/* ─── 品牌配置（可通过 NEXT_PUBLIC_APP_* 环境变量覆盖，构建时内联） ─── */
export interface BrandConfig {
    name: string;
    tagline: string;
    storagePrefix: string;
}

export const brand: BrandConfig = {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'New World',
    tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || 'AI 影像创作新世界',
    // 存储前缀保持不变，避免升级品牌名后丢失用户本地的场景 / 任务偏好
    storagePrefix: 'sfa',
};
