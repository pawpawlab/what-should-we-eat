import type { RestaurantProvider } from "@/types";
import { AmapRestaurantProvider } from "./amap-provider";

export { AmapRestaurantProvider } from "./amap-provider";

/**
 * Server 端工厂：根据环境变量选择数据源。
 * 未配置高德 Key 时不返回数据源，接口会返回空结果。
 */
export function getServerRestaurantProvider(): RestaurantProvider | null {
  const key = process.env.AMAP_WEB_SERVICE_KEY;
  if (!key) return null;
  return new AmapRestaurantProvider(key);
}
