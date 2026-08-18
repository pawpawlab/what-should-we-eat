-- ============================================================
-- 「就吃这个」Supabase 数据库 Schema
-- 在 Supabase SQL Editor 中执行。
-- ============================================================

create table if not exists public.rooms (
  id                          text primary key,
  status                      text not null default 'waiting',
  location                    jsonb not null,
  radius                      integer not null default 2000,
  host_preference             jsonb,
  guest_preference            jsonb,
  guest_joined                boolean not null default false,
  recommended_restaurant_ids  jsonb not null default '[]'::jsonb,
  rejected_restaurant_ids     jsonb not null default '[]'::jsonb,
  selected_restaurant_id      text,
  host_token                  text not null,
  guest_token                 text not null,
  created_at                  timestamptz not null default now()
);

-- 已有表升级：新增「朋友已加入」标记，并放开 host_preference 非空约束
alter table public.rooms add column if not exists guest_joined boolean not null default false;
alter table public.rooms alter column host_preference drop not null;

-- 开启行级安全。公网版本不开放匿名读写，所有房间读写都走 Next.js API，
-- 服务端使用 SUPABASE_SERVICE_ROLE_KEY 访问。
alter table public.rooms enable row level security;

drop policy if exists "rooms_anon_select" on public.rooms;
drop policy if exists "rooms_anon_insert" on public.rooms;
drop policy if exists "rooms_anon_update" on public.rooms;
