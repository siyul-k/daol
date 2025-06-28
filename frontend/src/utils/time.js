export function formatKST(utcString) {
  if (!utcString) return "";
  const date = new Date(utcString);
  const kstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000); // UTC+9 보정
  return kstTime.toLocaleString("ko-KR");
}
