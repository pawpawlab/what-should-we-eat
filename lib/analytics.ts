/**
 * 轻量埋点抽象。MVP 仅 console 输出，后续可替换为真实上报，
 * 不为埋点引入复杂第三方依赖。
 */
export type AnalyticsEvent =
  | "home_start"
  | "location_selected"
  | "home_location_selected"
  | "invite_opened"
  | "guest_joined_host_side"
  | "both_ready"
  | "preference_submitted"
  | "invite_shared"
  | "guest_joined"
  | "match_started"
  | "restaurant_shown"
  | "restaurant_rejected"
  | "restaurant_selected"
  | "zero_result";

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${event}`, props ?? {});
}
