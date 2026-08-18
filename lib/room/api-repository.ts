import type { DiningRoom, LocationInfo, UserPreference } from "@/types";
import type { RoomRepository } from "./repository";
import {
  getRoomAccessRole,
  getRoomAccessToken,
  rememberRoomAccess,
} from "./access";

async function parseRoomResponse(resp: Response): Promise<DiningRoom | null> {
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error("room_api_failed");
  const data = await resp.json();
  return data.room ?? null;
}

export class ApiRoomRepository implements RoomRepository {
  async createRoom(input: {
    location: LocationInfo;
    radius: number;
    hostPreference?: UserPreference;
  }): Promise<DiningRoom> {
    const resp = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const room = await parseRoomResponse(resp);
    if (!room) throw new Error("room_create_failed");
    rememberRoomAccess(room.id, "host", room.hostToken);
    rememberRoomAccess(room.id, "guest", room.guestToken);
    return room;
  }

  async getRoom(id: string): Promise<DiningRoom | null> {
    const token = getRoomAccessToken(id);
    const role = getRoomAccessRole(id);
    const resp = await fetch(`/api/rooms/${id}`, {
      headers: {
        ...(token ? { "x-room-token": token } : {}),
        ...(role ? { "x-room-role": role } : {}),
      },
    });
    const room = await parseRoomResponse(resp);
    if (room?.hostToken) rememberRoomAccess(room.id, "host", room.hostToken);
    if (room?.guestToken) rememberRoomAccess(room.id, "guest", room.guestToken);
    return room;
  }

  async updateRoom(
    id: string,
    patch: Partial<DiningRoom>
  ): Promise<DiningRoom | null> {
    const token = getRoomAccessToken(id);
    const role = getRoomAccessRole(id);
    const resp = await fetch(`/api/rooms/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-room-token": token } : {}),
        ...(role ? { "x-room-role": role } : {}),
      },
      body: JSON.stringify(patch),
    });
    return parseRoomResponse(resp);
  }

  subscribe(id: string, cb: (room: DiningRoom) => void): () => void {
    if (typeof window === "undefined") return () => {};

    let stopped = false;
    let lastSerialized = "";

    const tick = async () => {
      if (stopped) return;
      try {
        const room = await this.getRoom(id);
        if (room) {
          const serialized = JSON.stringify(room);
          if (serialized !== lastSerialized) {
            lastSerialized = serialized;
            cb(room);
          }
        }
      } catch {
        // 下一轮重试，避免网络短抖动让等待页卡死。
      }
    };

    tick();
    const timer = window.setInterval(tick, 1500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }
}
