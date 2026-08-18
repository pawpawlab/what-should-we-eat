/**
 * 浏览器端只用公开 URL 判断是否启用云端房间。
 * 读写都走 Next.js API，service_role key 只留在服务端。
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function isSupabaseConfigured(): boolean {
  return !!url;
}
