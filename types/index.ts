/**
 * 全局数据模型
 * UI 只依赖这里定义的统一结构，绝不直接读取高德等第三方原始结构。
 */

/** 地理位置 */
export interface LocationInfo {
  lat: number;
  lng: number;
  /** 可读地址名，如「静安寺附近」 */
  name: string;
  /**
   * 坐标系。浏览器定位为 wgs84；高德搜索结果为 gcj02。
   * 请求高德 POI 前，wgs84 需转换为 gcj02。
   */
  coordSystem?: "wgs84" | "gcj02";
}

/** 用户偏好 —— 整个产品最核心的数据 */
export interface UserPreference {
  /** 想吃的品类 */
  preferCategories: string[];
  /** 坚决不想吃的品类（Hard Filter 依据） */
  avoidCategories: string[];

  /** 想要的口味标签，如「清爽」「热乎」 */
  tastePreferences: string[];
  /** 不想要的口味标签（Hard Filter 依据），如「辣」 */
  avoidTaste: string[];
  /** 其他软偏好，如「少油一点」「尽量不要连锁」 */
  preferenceTags: string[];

  /** 人均价格区间；不限时为 undefined */
  priceRange?: {
    min?: number;
    max?: number;
  };

  preferNearby: boolean;
  preferHighRating: boolean;
  requireOpenNow: boolean;
}

export type RoomStatus = "waiting" | "matching" | "result" | "completed";

/** 从餐厅文本证据推断出来的标签，带置信度 */
export interface InferredTag {
  tag: string;
  confidence: number;
  evidence: string[];
  sources: string[];
}

/** 一场饭局 */
export interface DiningRoom {
  id: string;

  status: RoomStatus;

  location: LocationInfo;

  /** 搜索半径，单位：米 */
  radius: number;

  /** Host 偏好；新流程里创建房间时可能还没填 */
  hostPreference?: UserPreference;
  guestPreference?: UserPreference;

  /** 朋友是否已通过邀请链接加入（尚未必填完偏好） */
  guestJoined?: boolean;

  /** 已经推荐展示过的餐厅（含被换掉的） */
  recommendedRestaurantIds: string[];
  /** 用户明确「换一个」拒绝的餐厅 */
  rejectedRestaurantIds: string[];

  /** 最终选定 */
  selectedRestaurantId?: string;

  /** 无登录身份校验 token */
  hostToken: string;
  guestToken: string;

  createdAt: string;
}

/** 统一餐厅结构（内部标准，与数据源无关） */
export interface Restaurant {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  /** 距离用户所选位置，单位：米 */
  distance?: number;
  /** 标准化品类，如 ["火锅", "川菜"] */
  categories: string[];
  /** 软标签，如 ["辣", "重口", "连锁"] */
  tags: string[];
  /** 带置信度的品类推断 */
  inferredCategories?: InferredTag[];
  /** 带置信度的口味/场景推断 */
  inferredTasteTags?: InferredTag[];
  rating?: number;
  /** 人均价格 */
  averagePrice?: number;
  businessHours?: string;
  isOpen?: boolean;
  photos?: string[];
  /** 数据来源，如 "mock" | "amap" */
  source: string;
  sourceId: string;
}

/** 餐厅数据源统一接口 */
export interface NearbySearchParams {
  lat: number;
  lng: number;
  /** 半径，单位：米 */
  radius: number;
  /** 限制返回条数 */
  limit?: number;
  /** 双方想吃的品类，用于补充定向搜索 */
  preferCategories?: string[];
  /** 传入坐标的坐标系，默认按 gcj02 处理 */
  coordSystem?: "wgs84" | "gcj02";
}

export interface RestaurantProvider {
  searchNearbyRestaurants(params: NearbySearchParams): Promise<Restaurant[]>;
}

/** 角色 */
export type Role = "host" | "guest";
