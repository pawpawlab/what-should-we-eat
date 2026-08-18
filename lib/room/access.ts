import type { Role } from "@/types";

function accessKey(id: string, role: Role) {
  return `jcz:room-access:${id}:${role}`;
}

export function rememberRoomAccess(id: string, role: Role, token: string) {
  if (typeof window === "undefined" || !token) return;
  window.localStorage.setItem(accessKey(id, role), token);
}

export function getRoomAccessToken(id: string, role?: Role): string | null {
  if (typeof window === "undefined") return null;
  if (role) return window.localStorage.getItem(accessKey(id, role));
  return (
    window.localStorage.getItem(accessKey(id, "host")) ??
    window.localStorage.getItem(accessKey(id, "guest"))
  );
}

export function getRoomAccessRole(id: string): Role | undefined {
  if (typeof window === "undefined") return undefined;
  if (window.localStorage.getItem(accessKey(id, "host"))) return "host";
  if (window.localStorage.getItem(accessKey(id, "guest"))) return "guest";
  return undefined;
}
