// ✅ 파일 경로: backend/services/rewardSponsor.cjs
'use strict';

console.log('[DEBUG] rewardSponsor.cjs loaded from', __filename);

const connection = require('../db.cjs');
const moment     = require('moment-timezone');

// 한도/슬롯(FIFO) 유틸
const { getAvailableRewardAmount, getPurchasesWithRemaining } = require('../utils/rewardLimit.cjs');

/* ────────────────────────────────────────────────────────────────
 * 정책 (다올 기준)
 *  - 정산 주기: 1일 1회 (KST 기준)
 *  - 최초 구매일: normal+bcode 포함(날짜만, 시간 무시)
 *  - PV 합산: normal 상품만, 최초 구매일(포함) 이후
 *  - XE/로또 분배 없음 (현금 포인트만)
 *  - 수당금지 회원 제외
 *  - 한도 부족 시: 한도만큼 부분지급 + 구매 FIFO(슬롯)로 ref_id 분배
 *  - 트랜잭션/멱등: rewards_log(UNIQUE), commissions.paid 기준선
 * ──────────────────────────────────────────────────────────────── */

const toKRW = (n) => Math.max(0, Math.floor(Number(n) || 0));

/** KST 오늘 날짜 문자열(YYYY-MM-DD) */
function todayKST() {
  return moment().tz('Asia/Seoul').format('YYYY-MM-DD');
}

/** 회원 최초 구매 "날짜"(normal+bcode, status=approved). 없으면 null */
async function getFirstPurchaseDate(conn, memberId) {
  const [[row]] = await conn.query(
    `SELECT DATE(MIN(created_at)) AS first_date
       FROM purchases
      WHERE member_id = ?
        AND status = 'approved'
        AND type IN ('normal','bcode')`,
    [memberId]
  );
  return row?.first_date || null; // 'YYYY-MM-DD'
}

/** 보너스 비율(sponsor). 없으면 기본 3%(0.03) */
async function getSponsorRate(conn) {
  const [[row]] = await conn.query(
    `SELECT rate
       FROM bonus_config
      WHERE reward_type = 'sponsor'
      ORDER BY updated_at DESC
      LIMIT 1`
  );
  return Number(row?.rate ?? 0.03);
}

/** 계정의 직계 하위(해당 방향) id 리스트 (일반적으로 0~1개) */
async function getDirectChildrenByDirection(conn, memberId, direction) {
  const [rows] = await conn.query(
    `SELECT id
       FROM members
      WHERE sponsor_id = ?
        AND sponsor_direction = ?`,
    [memberId, direction]
  );
  return rows.map(r => r.id);
}

/** childId를 루트로 하는 서브트리(자기포함)에서 PV 합산 (normal, 승인, 기준일 이후) */
async function sumSubtreePVFromChild(conn, childId, sinceDate /* 'YYYY-MM-DD' */) {
  const [rows] = await conn.query(
    `SELECT IFNULL(SUM(p.pv), 0) AS pv
       FROM purchases p
       JOIN members   m ON m.id = p.member_id
      WHERE p.status = 'approved'
        AND p.type   = 'normal'
        AND p.created_at >= CONCAT(?, ' 00:00:00')
        AND (m.id = ? OR m.sponsor_path LIKE CONCAT('%|', ?, '|%'))`,
    [sinceDate, childId, childId]
  );
  return Number(rows[0]?.pv || 0);
}

/** 좌/우 방향 전체 서브트리 PV 합산 (루트 직계만 방향 분기, 그 밑은 L/R 모두 포함) */
async function sumSidePV(conn, memberId, direction, sinceDate) {
  const childIds = await getDirectChildrenByDirection(conn, memberId, direction);
  if (childIds.length === 0) return 0;

  let total = 0;
  for (const childId of childIds) {
    const pv = await sumSubtreePVFromChild(conn, childId, sinceDate);
    total += pv;
  }
  return total;
}

/** commissions 현재치 조회 (없으면 0으로) */
async function getPrevCommissionState(conn, memberId) {
  const [[row]] = await conn.query(
    `SELECT left_pv, right_pv, matched_pv, paid
       FROM commissions
      WHERE member_id = ?`,
    [memberId]
  );
  if (!row) return { left_pv: 0, right_pv: 0, matched_pv: 0, paid: 0 };
  return {
    left_pv:    Number(row.left_pv || 0),
    right_pv:   Number(row.right_pv || 0),
    matched_pv: Number(row.matched_pv || 0),
    paid:       Number(row.paid || 0),
  };
}

/** 슬롯 FIFO 분배: [{ref_id, amount}] */
async function allocateFIFO(memberId, amountKRW) {
  const slots = await getPurchasesWithRemaining(memberId); // [{purchaseId, remaining}, ...]
  const alloc = [];
  let rem = toKRW(amountKRW);
  for (const s of slots) {
    if (rem <= 0) break;
    const cap = toKRW(s.remaining);
    if (cap <= 0) continue;
    const take = Math.min(rem, cap);
    if (take > 0) {
      alloc.push({ ref_id: s.purchaseId ?? s.id, amount: take });
      rem -= take;
    }
  }
  return { alloc, leftover: rem }; // leftover > 0 이면 한도 부족
}

/** 멱등 보장을 위한 rewards_log INSERT (슬롯별) */
async function insertSponsorRewardLogs(conn, memberId, rewardDate, allocations) {
  if (!allocations.length) return 0;
  // source는 일괄 집계형이므로 0 고정(UNIQUE 키에 포함되더라도 날짜+ref_id로 멱등 보장)
  const sql = `
    INSERT INTO rewards_log
      (member_id, type, source, ref_id, amount, memo, reward_date, created_at)
    VALUES ?
    ON DUPLICATE KEY UPDATE amount = VALUES(amount)`;
  const values = allocations.map(a => [
    memberId,
    'sponsor',
    0,
    a.ref_id,
    toKRW(a.amount),
    '후원수당',
    rewardDate,
    moment().tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss'),
  ]);
  const [r] = await conn.query(sql, [values]);
  return r.affectedRows || 0;
}

/** commissions UPSERT */
async function upsertCommissions(conn, memberId, leftPV, rightPV, matchedPV) {
  await conn.query(
    `INSERT INTO commissions (member_id, left_pv, right_pv, matched_pv, paid, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       left_pv = VALUES(left_pv),
       right_pv = VALUES(right_pv),
       matched_pv = VALUES(matched_pv),
       paid = VALUES(paid)`,
    [memberId, leftPV, rightPV, matchedPV, matchedPV]
  );
}

/** withdrawable_point 증가 */
async function addWithdrawablePoint(conn, memberId, amountKRW) {
  await conn.query(
    `UPDATE members
        SET withdrawable_point = withdrawable_point + ?
      WHERE id = ?`,
    [toKRW(amountKRW), memberId]
  );
}

/** 메인: 후원수당 정산 (jobDate = 'YYYY-MM-DD' 옵션) */
async function runSponsorReward(jobDate /* optional YYYY-MM-DD */) {
  const rewardDate = jobDate || todayKST();
  console.log(`[SPONSOR] Start job for reward_date=${rewardDate}`);

  const db = await connection.getConnection();
  try {
    // 대상 회원: 블랙리스트/수당금지 제외
    const [members] = await db.query(
      `SELECT id, username
         FROM members
        WHERE COALESCE(is_blacklisted, 0) = 0
          AND COALESCE(is_reward_blocked, 0) = 0`
    );
    if (!members.length) {
      console.log('[SPONSOR] 대상 회원 없음');
      db.release();
      return;
    }

    const rate = await getSponsorRate(db);

    for (const { id: memberId } of members) {
      // 1) 최초 구매 "날짜"(normal+bcode). 없으면 스킵
      const firstDate = await getFirstPurchaseDate(db, memberId);
      if (!firstDate) continue;

      // 2) 좌/우 PV 집계 (normal만, 최초 구매 "날짜" 당일 포함)
      const leftPV  = await sumSidePV(db, memberId, 'L', firstDate);
      const rightPV = await sumSidePV(db, memberId, 'R', firstDate);
      const matchedPV = Math.min(leftPV, rightPV);

      // 3) 이전 기준선
      const { paid: prevPaid } = await getPrevCommissionState(db, memberId);
      const matchedDelta = matchedPV - prevPaid;
      if (matchedDelta <= 0) continue;

      // 4) 수당액 계산
      const grossAmount = toKRW(matchedDelta * rate);
      if (grossAmount <= 0) continue;

      // 5) 한도 확인 + 부분지급(FIFO)
      const available = toKRW(await getAvailableRewardAmount(memberId));
      if (available <= 0) continue;

      const payAmount = Math.min(grossAmount, available);
      const { alloc, leftover } = await allocateFIFO(memberId, payAmount);
      if (!alloc.length) continue; // 슬롯 없음/한도 0

      // 6) 트랜잭션: 보상 기록 + 회원 포인트 + 커미션 기준선
      await db.beginTransaction();
      try {
        // 슬롯별 rewards_log (멱등 ON DUPLICATE)
        await insertSponsorRewardLogs(db, memberId, rewardDate, alloc);

        // 회원 출금가능 포인트 증가
        const totalPaid = alloc.reduce((s, a) => s + toKRW(a.amount), 0);
        await addWithdrawablePoint(db, memberId, totalPaid);

        // commissions: 기준치 갱신(= matchedPV)
        await upsertCommissions(db, memberId, leftPV, rightPV, matchedPV);

        await db.commit();
      } catch (e) {
        await db.rollback();
        console.error(`[SPONSOR] TX rollback member=${memberId}`, e);
        // 다음 회원 진행
        continue;
      }

      if (leftover > 0) {
        // 한도보다 큰 금액은 자동으로 잘려서 지급됨(정보 로그)
        console.log(`[SPONSOR] member=${memberId} 한도부족으로 ${leftover}원 미지급`);
      }
    }

    console.log('[SPONSOR] 후원수당 정산 완료');
  } catch (err) {
    console.error('❌ 후원수당 정산 실패:', err);
  } finally {
    try { db.release(); } catch {}
  }
}

module.exports = { runSponsorReward };
