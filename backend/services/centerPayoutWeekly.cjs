// ✅ 파일 경로: backend/services/releaseCenterFees.cjs
const connection = require('../db.cjs');

// KST 기준 날짜 연산(고정 오프셋 +09:00)
function toKST(date = new Date()) {
  // date는 서버 타임(UTC 가정). KST = UTC+9
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}
function fromKST(date = new Date()) {
  return new Date(date.getTime() - 9 * 60 * 60 * 1000);
}

/**
 * 실행일(now) 기준 "지난주 월 00:00:00 ~ 일 23:59:59" (KST) 계산
 * 반환: { startUtc, endUtcExclusive }  // 둘 다 UTC Date
 */
function getLastWeekRangeKST(now = new Date()) {
  const kst = toKST(now);
  const day = kst.getDay(); // 0:일 ~ 6:토
  // 이번주 월 00:00:00(KST)
  const daysSinceMon = (day + 6) % 7; // 월=0, 화=1, ... 일=6
  const thisMon = new Date(kst);
  thisMon.setHours(0,0,0,0);
  thisMon.setDate(thisMon.getDate() - daysSinceMon);

  // 지난주 월~일
  const lastMon = new Date(thisMon);
  lastMon.setDate(lastMon.getDate() - 7);
  const nextMon = new Date(thisMon); // 지난주 다음주 월(=이번주 월)

  // UTC 변환
  const startUtc = fromKST(lastMon);     // 지난주 월 00:00:00 (UTC)
  const endUtcExclusive = fromKST(nextMon); // 이번주 월 00:00:00 (UTC) - exclusive
  return { startUtc, endUtcExclusive };
}

/**
 * 지정 구간의 미이관(center, center_recommend) 합계를 출금가능액으로 이관
 * - rows 업데이트: is_released=1, released_at=NOW()
 * - members.withdrawable_point += 합계
 * 반환: {releasedMembers: n, releasedRows: m, totalAmount: sum}
 */
async function releaseCenterFeesRange(startUtc, endUtcExclusive) {
  // 1) 집계
  const [agg] = await connection.query(
    `SELECT member_id, SUM(amount) AS total
       FROM rewards_log
      WHERE type IN ('center','center_recommend')
        AND is_released = 0
        AND amount > 0
        AND created_at >= ? AND created_at < ?
      GROUP BY member_id`,
    [startUtc, endUtcExclusive]
  );

  if (!agg.length) {
    console.log('[이관 대상 없음]');
    return { releasedMembers: 0, releasedRows: 0, totalAmount: 0 };
  }

  // 2) 멤버별 출금가능액 반영
  let totalAmount = 0;
  for (const r of agg) {
    const amt = Number(r.total || 0);
    if (amt <= 0) continue;
    totalAmount += amt;
    await connection.query(
      `UPDATE members SET withdrawable_point = withdrawable_point + ? WHERE id = ?`,
      [amt, r.member_id]
    );
  }

  // 3) 로그 행들 이관 완료 처리
  const [result] = await connection.query(
    `UPDATE rewards_log
        SET is_released = 1,
            released_at = NOW(),
            memo = CASE WHEN memo IS NULL OR memo = '' THEN '센터피 이관' ELSE CONCAT(memo,' | 이관') END
      WHERE type IN ('center','center_recommend')
        AND is_released = 0
        AND amount > 0
        AND created_at >= ? AND created_at < ?`,
    [startUtc, endUtcExclusive]
  );

  return {
    releasedMembers: agg.length,
    releasedRows: result.affectedRows || 0,
    totalAmount,
  };
}

/**
 * 매주 수요일 KST에 실행: 지난주(월~일) 분 이관
 * - ENFORCE_WEDNESDAY=true면 수요일이 아닐 때 실행을 막음(안전장치)
 */
const ENFORCE_WEDNESDAY = true;
async function runWeeklyCenterRelease(now = new Date()) {
  const kst = toKST(now);
  const dow = kst.getDay(); // 0:일 ~ 6:토
  if (ENFORCE_WEDNESDAY && dow !== 3) { // 수요일=3
    console.log('[건너뜀] 수요일이 아니므로 이관 실행 안 함 (KST 기준).');
    return { skipped: true };
  }

  const { startUtc, endUtcExclusive } = getLastWeekRangeKST(now);
  console.log(`[센터피 이관] 구간(KST): ${toKST(startUtc).toISOString()} ~ ${toKST(endUtcExclusive).toISOString()} (exclusive)`);
  const res = await releaseCenterFeesRange(startUtc, endUtcExclusive);
  console.log(`✅ 이관 완료: 대상회원 ${res.releasedMembers}명, 업데이트행 ${res.releasedRows}건, 금액합계 ${res.totalAmount}`);
  return res;
}

module.exports = {
  getLastWeekRangeKST,
  releaseCenterFeesRange,
  runWeeklyCenterRelease,
};
