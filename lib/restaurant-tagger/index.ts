import type { InferredTag } from "@/types";

export interface RestaurantTagInput {
  name?: string;
  type?: string;
  address?: string;
  businessTag?: string;
  alias?: string;
}

interface Evidence {
  source: "type" | "name" | "business_tag" | "alias" | "address" | "brand";
  text: string;
  weight: number;
}

interface Rule {
  tag: string;
  keywords: string[];
  confidence: number;
  sources?: Evidence["source"][];
  /** 负向关键词：命中 keywords 但同一文本里出现这些词时，视为不命中 */
  exclude?: string[];
}

export interface TagInference {
  categories: InferredTag[];
  tasteTags: InferredTag[];
}

const SOURCE_WEIGHT: Record<Evidence["source"], number> = {
  type: 1,
  name: 0.86,
  business_tag: 0.72,
  alias: 0.65,
  brand: 0.8,
  address: 0.25,
};

const CATEGORY_RULES: Rule[] = [
  rule("火锅", 0.96, ["火锅店", "火锅", "麻辣烫", "串串香"]),
  rule("烧烤", 0.94, ["烧烤", "烤串", "烤吧", "串店"]),
  rule("烤肉", 0.94, ["烤肉", "烧肉", "韩式烤肉"]),
  rule("烧烤", 0.82, ["啤酒吃", "吃GALA", "吃GAL", "GALA", "酒场", "啤酒屋"], ["name", "brand"]),
  rule("烤肉", 0.8, ["啤酒吃", "吃GALA", "吃GAL", "GALA", "酒场", "啤酒屋"], ["name", "brand"]),
  rule("日料", 0.94, ["日本料理", "日本菜", "日料", "日式", "和食", "寿司", "刺身", "居酒屋", "寿喜烧", "烧鸟", "鳗鱼", "天妇罗"]),
  rule("韩餐", 0.94, ["韩国料理", "韩国菜", "韩餐", "部队锅"]),
  rule("云贵川菜", 0.96, ["四川菜", "川菜", "川味", "冒菜", "麻辣香锅", "泡椒", "水煮鱼", "酸菜鱼", "烫菜", "干锅"]),
  rule("云贵川菜", 0.9, ["湖南菜", "湘菜", "剁椒鱼头", "贵州菜", "云贵川", "黔菜", "黔", "云南菜", "菌菇"]),
  rule("粤菜", 0.94, [
    "广东菜",
    "粤菜",
    "广式",
    "茶餐厅",
    "港式",
    "大牌档",
    "大排档",
    "茶楼",
    "烧腊",
    "煲仔",
    "顺德",
    "潮汕",
    "潮州",
    "海鲜",
  ]),
  rule("西餐", 0.94, [
    "西餐厅",
    "西餐",
    "牛排",
    "披萨",
    "pizza",
    "意大利",
    "意式",
    "法餐",
    "法式",
    "bistro",
    "brunch",
    "早午餐",
    "三明治",
    "墨西哥",
    "千层面",
    "pasta",
  ]),
  rule("东南亚", 0.94, [
    "东南亚菜",
    "泰国菜",
    "越南菜",
    "泰餐",
    "越南粉",
    "泰式",
    "冬阴功",
    "新加坡菜",
    "海南鸡饭",
    "叻沙",
    "咖央",
    "马来",
    "印尼",
  ]),
  rule("粉面", 0.92, [
    "面馆",
    "拉面",
    "牛肉面",
    "拌面",
    "汤面",
    "重庆小面",
    "米粉",
    "桂林米粉",
    "螺蛳粉",
    "酸辣粉",
    "河粉",
    "米线",
    "牛肉粉",
    "渔粉",
    "鱼粉",
    "热干面",
    "刀削面",
    "板面",
    "烩面",
    "粥",
  ]),
  rule("饺子", 0.92, ["饺子", "水饺", "锅贴", "馄饨", "抄手", "小笼", "生煎", "汤包"]),
  rule("炸鸡", 0.92, ["炸鸡", "鸡排", "香香鸡", "脆皮鸡"]),
  rule("咖喱", 0.92, ["咖喱", "印度菜"]),
  rule("轻食", 0.92, ["轻食", "沙拉", "健康餐"]),
  // 甜品/饮品类：不作为正餐品类选项，但仍需识别，用于永久排除（见 engine 硬过滤）
  rule("甜品", 0.92, [
    "甜品",
    "蛋糕",
    "面包",
    "烘焙",
    "饼家",
    "糕点",
    "冰淇淋",
    "冰激凌",
    "gelato",
    "雪糕",
    "舒芙蕾",
    "提拉米苏",
    "抹茶专门",
    "酸奶",
    "饮品",
    "奶茶",
    "茶饮",
    "咖啡",
    "coffee",
    "果汁",
    "柠檬茶",
    "手打柠檬",
    "椰子水",
    "麻薯",
    "茶姬",
    "蜜雪冰城",
    "喜茶",
    "乐乐茶",
    "1点点",
    "一点点",
    "coco",
    "瑞幸",
    "星巴克",
  ]),
  // 非正餐场所：食堂 / 后勤餐厅 / 食堂性质的餐饮大楼等，永久排除
  // （没人「出去吃饭」去食堂；餐饮大楼/美食城多为窗口聚合点，不是单店）
  // 只用明确的食堂/聚合点词，避免「上海交通大学」这类地址误伤正常餐厅
  // 不用裸「食堂」——「米仓食堂/深夜食堂」等多是正常餐厅名，避免误伤。
  // 只保留明确指向机关/校园后勤食堂与聚合点的词。
  rule("非正餐", 0.9, [
    "职工餐厅",
    "学生餐厅",
    "教工餐厅",
    "员工餐厅",
    "机关餐厅",
    "后勤服务",
    "餐饮大楼",
    "餐饮大厅",
    "美食广场",
    "美食城",
    "美食街",
    "便利店",
    "超市",
  ]),
  rule("快餐", 0.9, [
    "快餐",
    "汉堡",
    "肯德基",
    "麦当劳",
    "必胜客",
    "吉野家",
    "黄焖鸡",
    "鸭脖",
    "卤味",
    "蛋饼",
    "灌饼",
    "肉饼",
    "烧饼",
    "麻辣拌",
    "麻辣烫",
    "鸡柳",
    "馒头",
    "包子",
    "盖饭",
    "盖浇饭",
    "拌饭",
    "炒饭",
    "菜饭",
    "煲仔饭",
    "简餐",
    "便当",
    "轻食快餐",
  ]),
  rule("江浙菜", 0.94, ["浙江菜", "杭帮菜", "江浙菜", "本帮江浙菜", "本帮菜", "上海菜"]),
  rule("江浙菜", 0.82, ["西湖醋鱼", "杭州卤鸭", "外婆家", "新发现", "绿茶餐厅"]),
  // 中餐兜底：识别不出细分菜系但明显是正经中餐馆的，归到「云贵川菜」避免落入「其他」被排除
  rule("云贵川菜", 0.6, ["家常菜", "私房菜", "农家菜", "小炒", "湘鄂", "融合菜"]),
];

const TASTE_RULES: Rule[] = [
  rule("辣", 0.95, ["麻辣", "香辣", "酸辣", "水煮", "剁椒", "泡椒", "辣子", "麻辣香锅"]),
  rule("辣", 0.86, ["四川菜", "川菜", "川味", "湖南菜", "湘菜", "冒菜", "麻辣烫"]),
  rule("重口", 0.9, ["麻辣", "香辣", "酸辣", "干锅", "冒菜", "麻辣香锅", "烧烤", "烤肉", "酒场"]),
  rule("重口", 0.72, ["红烧", "卤", "本帮"]),
  rule("清淡", 0.86, ["轻食", "沙拉", "素食", "粥", "蒸菜", "白灼", "浙江菜", "杭帮菜"]),
  rule("清爽", 0.86, ["日料", "日本料理", "寿司", "轻食", "沙拉", "粤菜", "越南菜"]),
  rule("热乎", 0.86, ["火锅", "麻辣烫", "汤面", "拉面", "牛肉面", "米线", "馄饨", "粥"]),
  rule("热乎", 0.78, ["汤", "砂锅", "煲"]),
  rule("大肉", 0.86, ["烤肉", "烧烤", "牛肉", "羊肉", "猪排", "炸鸡", "汉堡", "红烧肉", "小排", "GALA"]),
  rule("碳水", 0.88, ["拉面", "牛肉面", "拌面", "汤面", "米粉", "米线", "河粉", "炒饭", "盖饭", "包子", "饺子", "馄饨", "小笼", "生煎", "粥"]),
  rule("汤汤水水", 0.88, ["汤面", "米线", "馄饨", "粥", "汤", "麻辣烫", "火锅", "砂锅"]),
  rule("油腻", 0.76, ["油炸", "炸鸡", "鸡排", "烧烤", "烤肉", "干锅", "红烧肉", "酒场"]),
  rule("连锁", 0.72, ["肯德基", "麦当劳", "必胜客", "星巴克", "瑞幸", "海底捞", "和府捞面", "新发现", "外婆家", "绿茶餐厅", "Wagas"]),
];

const BRAND_HINTS: [RegExp, Partial<Record<"categories" | "tastes", Rule[]>>][] = [
  [/新发现/, {
    categories: [rule("江浙菜", 0.82, ["新发现"], ["brand"])],
    tastes: [rule("清淡", 0.52, ["新发现"], ["brand"]), rule("清爽", 0.44, ["新发现"], ["brand"])],
  }],
  [/外婆家|绿茶餐厅/, {
    categories: [rule("江浙菜", 0.82, ["外婆家", "绿茶餐厅"], ["brand"])],
    tastes: [rule("清淡", 0.48, ["外婆家", "绿茶餐厅"], ["brand"])],
  }],
  [/海底捞/, {
    categories: [rule("火锅", 0.95, ["海底捞"], ["brand"])],
    tastes: [rule("热乎", 0.84, ["海底捞"], ["brand"]), rule("重口", 0.62, ["海底捞"], ["brand"])],
  }],
  [/Wagas|沃歌斯/i, {
    categories: [rule("轻食", 0.9, ["Wagas", "沃歌斯"], ["brand"])],
    tastes: [rule("清爽", 0.84, ["Wagas", "沃歌斯"], ["brand"]), rule("清淡", 0.68, ["Wagas", "沃歌斯"], ["brand"])],
  }],
];

export function inferRestaurantTags(input: RestaurantTagInput): TagInference {
  const evidence = extractEvidence(input);
  const brandRules = findBrandRules(input.name ?? "");

  return {
    categories: inferTags(evidence, [...CATEGORY_RULES, ...brandRules.categories]),
    tasteTags: inferTags(evidence, [...TASTE_RULES, ...brandRules.tastes]),
  };
}

export function flattenConfidentTags(
  tags: InferredTag[],
  threshold = 0.4
): string[] {
  return tags
    .filter((x) => x.confidence >= threshold)
    .sort((a, b) => b.confidence - a.confidence)
    .map((x) => x.tag);
}

export function confidenceFor(tags: InferredTag[] | undefined, tag: string): number {
  return tags?.find((x) => x.tag === tag)?.confidence ?? 0;
}

function extractEvidence(input: RestaurantTagInput): Evidence[] {
  const evidence: Evidence[] = [];
  addEvidence(evidence, "type", input.type);
  addEvidence(evidence, "name", input.name);
  addEvidence(evidence, "business_tag", input.businessTag);
  addEvidence(evidence, "alias", input.alias);
  addEvidence(evidence, "address", input.address);
  addEvidence(evidence, "brand", input.name);
  return evidence;
}

function addEvidence(
  list: Evidence[],
  source: Evidence["source"],
  text: string | undefined
) {
  if (!text) return;
  const normalized = text.trim();
  if (!normalized) return;
  list.push({ source, text: normalized, weight: SOURCE_WEIGHT[source] });
}

function inferTags(evidence: Evidence[], rules: Rule[]): InferredTag[] {
  const byTag = new Map<string, InferredTag>();

  for (const item of evidence) {
    for (const rule of rules) {
      if (rule.sources && !rule.sources.includes(item.source)) continue;
      const hit = rule.keywords.find((kw) => includesKeyword(item.text, kw));
      if (!hit) continue;
      // 负向关键词：同一文本命中排除词则跳过（如「深夜食堂」不算食堂）
      if (rule.exclude?.some((ex) => includesKeyword(item.text, ex))) continue;

      const confidence = clamp(rule.confidence * item.weight);
      const cur = byTag.get(rule.tag);
      const note = `${item.source}: ${hit}`;

      if (!cur) {
        byTag.set(rule.tag, {
          tag: rule.tag,
          confidence,
          evidence: [note],
          sources: [item.source],
        });
      } else {
        cur.confidence = combineConfidence(cur.confidence, confidence);
        if (!cur.evidence.includes(note)) cur.evidence.push(note);
        if (!cur.sources.includes(item.source)) cur.sources.push(item.source);
      }
    }
  }

  return [...byTag.values()].sort((a, b) => b.confidence - a.confidence);
}

function findBrandRules(name: string): { categories: Rule[]; tastes: Rule[] } {
  const categories: Rule[] = [];
  const tastes: Rule[] = [];
  for (const [pattern, rules] of BRAND_HINTS) {
    if (!pattern.test(name)) continue;
    categories.push(...(rules.categories ?? []));
    tastes.push(...(rules.tastes ?? []));
  }
  return { categories, tastes };
}

function includesKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function combineConfidence(a: number, b: number): number {
  return clamp(1 - (1 - a) * (1 - b));
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}

function rule(
  tag: string,
  confidence: number,
  keywords: string[],
  sources?: Evidence["source"][],
  exclude?: string[]
): Rule {
  return { tag, confidence, keywords, sources, exclude };
}
