import { customAlphabet } from "nanoid";
import type { DiningRoom, LocationInfo, UserPreference } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { ApiRoomRepository } from "./api-repository";

/**
 * Room 仓储抽象。
 * MVP：LocalRoomRepository（localStorage + 跨标签实时同步）。
 * Phase 3：可实现 SupabaseRoomRepository 替换，接口保持不变。
 */
export interface RoomRepository {
  createRoom(input: {
    location: LocationInfo;
    radius: number;
    hostPreference?: UserPreference;
  }): Promise<DiningRoom>;

  getRoom(id: string): Promise<DiningRoom | null>;

  updateRoom(id: string, patch: Partial<DiningRoom>): Promise<DiningRoom | null>;

  /** 订阅房间变化，返回取消订阅函数 */
  subscribe(id: string, cb: (room: DiningRoom) => void): () => void;
}

const genId = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 5);
const genToken = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  16
);

const STORAGE_PREFIX = "jcz:room:";
const CHANNEL = "jcz-rooms";

/** localStorage 实现 —— 支持同浏览器多标签实时同步 */
export class LocalRoomRepository implements RoomRepository {
  private channel: BroadcastChannel | null = null;

  private getChannel(): BroadcastChannel | null {
    if (typeof window === "undefined") return null;
    if (!this.channel && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL);
    }
    return this.channel;
  }

  private key(id: string) {
    return STORAGE_PREFIX + id;
  }

  private read(id: string): DiningRoom | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(this.key(id));
    return raw ? (JSON.parse(raw) as DiningRoom) : null;
  }

  private write(room: DiningRoom) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key(room.id), JSON.stringify(room));
    // 通知本标签之外的订阅者
    this.getChannel()?.postMessage({ id: room.id });
  }

  async createRoom(input: {
    location: LocationInfo;
    radius: number;
    hostPreference?: UserPreference;
  }): Promise<DiningRoom> {
    const room: DiningRoom = {
      id: genId(),
      status: "waiting",
      location: input.location,
      radius: input.radius,
      hostPreference: input.hostPreference,
      guestJoined: false,
      recommendedRestaurantIds: [],
      rejectedRestaurantIds: [],
      hostToken: genToken(),
      guestToken: genToken(),
      createdAt: new Date().toISOString(),
    };
    this.write(room);
    return room;
  }

  async getRoom(id: string): Promise<DiningRoom | null> {
    return this.read(id);
  }

  async updateRoom(
    id: string,
    patch: Partial<DiningRoom>
  ): Promise<DiningRoom | null> {
    const cur = this.read(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    this.write(next);
    return next;
  }

  subscribe(id: string, cb: (room: DiningRoom) => void): () => void {
    if (typeof window === "undefined") return () => {};

    const onStorage = (e: StorageEvent) => {
      if (e.key === this.key(id) && e.newValue) {
        cb(JSON.parse(e.newValue) as DiningRoom);
      }
    };
    const onMessage = (e: MessageEvent) => {
      if (e.data?.id === id) {
        const room = this.read(id);
        if (room) cb(room);
      }
    };

    window.addEventListener("storage", onStorage);
    const ch = this.getChannel();
    ch?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("storage", onStorage);
      ch?.removeEventListener("message", onMessage);
    };
  }
}

let repo: RoomRepository | null = null;

/**
 * 获取当前 Room 仓储实例。
 * 配置了 Supabase → 通过服务端 API 做跨设备同步；否则回退本地 localStorage 实现。
 */
export function getRoomRepository(): RoomRepository {
  if (repo) return repo;
  repo = isSupabaseConfigured() ? new ApiRoomRepository() : new LocalRoomRepository();
  return repo;
}
