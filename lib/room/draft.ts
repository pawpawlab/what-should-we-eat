import type { LocationInfo, UserPreference } from "@/types";

/**
 * 「饭局草稿」：Host 在创建房间前的流程状态（位置 / 半径 / 偏好）。
 * 存在 localStorage，页面间携带，创建房间后可清除。
 */
export interface RoomDraft {
  location?: LocationInfo;
  radius?: number;
  preference?: UserPreference;
}

const KEY = "jcz:draft";

export function getDraft(): RoomDraft {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as RoomDraft) : {};
}

export function patchDraft(patch: Partial<RoomDraft>): RoomDraft {
  const next = { ...getDraft(), ...patch };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function clearDraft() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

/**
 * 「当前进行中的房间」：Host 点击邀请后创建的房间 id，
 * 用于关闭邀请半层后再次点击时复用同一房间，而不是反复新建。
 */
const CURRENT_ROOM_KEY = "jcz:current-room";

export function getCurrentRoomId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CURRENT_ROOM_KEY);
}

export function setCurrentRoomId(id: string) {
  if (typeof window !== "undefined")
    window.localStorage.setItem(CURRENT_ROOM_KEY, id);
}

export function clearCurrentRoomId() {
  if (typeof window !== "undefined")
    window.localStorage.removeItem(CURRENT_ROOM_KEY);
}

/** 空偏好初始值 */
export function emptyPreference(): UserPreference {
  return {
    preferCategories: [],
    avoidCategories: [],
    tastePreferences: [],
    avoidTaste: [],
    preferenceTags: [],
    priceRange: undefined,
    preferNearby: false,
    preferHighRating: false,
    requireOpenNow: false,
  };
}
