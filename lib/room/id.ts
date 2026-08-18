import { customAlphabet } from "nanoid";

/** 房间短 id（用于分享链接 /r/ABCDE），去掉易混字符 */
export const genRoomId = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 5);

/** 无登录身份 token */
export const genToken = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  16
);
