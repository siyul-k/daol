// ✅ 파일 경로: src/utils/time.js
import moment from "moment-timezone";

export function formatKST(utcString, format = "YYYY-MM-DD HH:mm:ss") {
  if (!utcString) return "";
  return moment(utcString).tz("Asia/Seoul").format(format);
}
