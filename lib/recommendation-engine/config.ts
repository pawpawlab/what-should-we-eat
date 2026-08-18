/**
 * 推荐算法配置。
 * 所有权重集中在此，方便调参，绝不 hard code 在 UI / 组件中。
 */
export const RECOMMEND_CONFIG = {
  /** 最终得分权重（保护满意度最低一方） */
  finalWeights: {
    pairMatch: 0.65,
    quality: 0.2,
    distance: 0.15,
  },

  /** 双方匹配：优先保护较低的一方 */
  pair: {
    minWeight: 0.6,
    avgWeight: 0.4,
  },

  /** 单用户软偏好打分（基于 100 分制） */
  userScore: {
    base: 50,
    hitPreferCategory: 40, // 命中「想吃」品类
    hitPreferTaste: 18, // 命中「想吃」口味
    extraHitBonus: 5, // 命中多个品类/口味额外加分
    anythingOk: 22, // 选了「都可以」
    noPreferenceNeutral: 18, // 完全没选想吃
    // 选了具体「想吃」品类但这家店完全没命中 → 明显降分，
    // 保证「对方想吃的店」永远排在「谁都不想吃的店」前面
    missPreferCategory: 28,
    // 软负偏好（命中对应 tag 扣分）
    penalty: {
      辣: 18, // 少辣一点
      油腻: 20, // 少油一点
      连锁: 12, // 尽量不要连锁
    } as Record<string, number>,
    nearbyBonus: 12, // 离近一些
    highRatingBonus: 15, // 勾选「评分高一点」且评分高
  },

  /** 评分归一化区间 */
  rating: {
    floor: 3.5,
    ceil: 5,
  },

  /** Hard Filter 价格缓冲：实际人均可比上限高出的比例 */
  priceBufferRatio: 0.15,

  /** 推断标签置信度阈值 */
  confidence: {
    hardCategory: 0.65,
    hardTaste: 0.75,
    softTaste: 0.35,
    reason: 0.45,
  },

  /** 候选池提示 */
  candidate: {
    /** 剩余候选低于该值时提示「快挑完了」 */
    lowRemainingThreshold: 3,
  },
} as const;

/** 旧版口味/偏好文案 → 新餐厅 tag 的兼容映射 */
export const TASTE_TAG_ALIAS: Record<string, string> = {
  不要太辣: "辣",
  不要太油: "油腻",
  不要连锁: "连锁",
  少辣一点: "辣",
  少油一点: "油腻",
  尽量不要连锁: "连锁",
};
