/**
 * 产品选项配置（品类 / 口味 / 价格 / 半径）
 * 集中管理，页面与算法都从这里读取，不在组件里 hard code。
 */

/** 品类 */
export const FOOD_CATEGORIES = [
  "火锅",
  "烧烤",
  "日料",
  "韩餐",
  "云贵川菜",
  "粤菜",
  "江浙菜",
  "西餐",
  "东南亚",
  "粉面",
  "饺子",
  "烤肉",
  "炸鸡",
  "咖喱",
  "轻食",
  "快餐",
] as const;

/** 想吃什么 —— 品类 */
export const PREFER_CATEGORIES = [...FOOD_CATEGORIES, "都可以"] as const;

/** 不想吃什么 —— 品类 */
export const AVOID_CATEGORIES = FOOD_CATEGORIES;

/** 口味 / 吃饭状态标签 */
export const TASTE_TAGS = [
  "辣",
  "清淡",
  "重口",
  "热乎",
  "清爽",
  "大肉",
  "碳水",
  "汤汤水水",
] as const;

/** 偏好标签（软偏好，不作为绝对底线） */
export const PREFERENCE_TAGS = [
  "少油一点",
  "少辣一点",
  "尽量不要连锁",
  "离近一些",
] as const;

/** 人均价格滑块配置 */
export const PRICE_RANGE = {
  min: 0,
  max: 300,
  step: 10,
} as const;

/** 搜索半径选项，单位：米 */
export interface RadiusOption {
  value: number;
  label: string;
  hint?: string;
}

export const RADIUS_OPTIONS: RadiusOption[] = [
  { value: 500, label: "500m", hint: "步行几分钟" },
  { value: 1000, label: "1km", hint: "大约步行 10–15 分钟" },
  { value: 2000, label: "2km", hint: "大约步行 20–30 分钟范围" },
  { value: 3000, label: "3km", hint: "骑车或打车几分钟" },
  { value: 5000, label: "5km", hint: "打车范围" },
];

export const DEFAULT_RADIUS = 2000;
