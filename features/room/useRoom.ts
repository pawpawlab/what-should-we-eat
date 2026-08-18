"use client";

import { useEffect, useState } from "react";
import type { DiningRoom } from "@/types";
import { getRoomRepository } from "@/lib/room/repository";

/** 订阅某个房间，实时反映 guest 提交等变化 */
export function useRoom(id: string | undefined) {
  const [room, setRoom] = useState<DiningRoom | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const repo = getRoomRepository();
    let alive = true;

    repo.getRoom(id).then((r) => {
      if (alive) {
        setRoom(r);
        setLoading(false);
      }
    });

    const unsub = repo.subscribe(id, (r) => {
      if (alive) setRoom(r);
    });

    return () => {
      alive = false;
      unsub();
    };
  }, [id]);

  return { room, loading };
}
