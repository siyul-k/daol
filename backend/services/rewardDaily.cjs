// ✅ 파일 경로: backend/services/rewardDaily.cjs

const connection = require('../db.cjs');
const { getAvailableRewardAmountByMemberIds } = require('../utils/rewardLimit.cjs');

async function processDailyRewards() {
  try {
    // 1. 구매내역(기본+BCODE) - 승인/활성만, 기준일(최초구매일) 포함
    const [products] = await connection.query(`
      SELECT 
        p.id AS purchase_id, p.member_id, p.pv, p.type, p.active, p.created_at,
        m.rec_1_id, m.rec_2_id, m.rec_3_id, m.rec_4_id, m.rec_5_id,
        m.rec_6_id, m.rec_7_id, m.rec_8_id, m.rec_9_id, m.rec_10_id,
        m.first_purchase_at,
        m.is_reward_blocked
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.status = 'approved'
      ORDER BY p.created_at ASC
    `);

    // 2. 데일리 수당률
    const [[rateRow]] = await connection.query(`
      SELECT rate FROM bonus_config
      WHERE reward_type = 'daily' AND level = 0
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    let dailyRate = rateRow?.rate || 0.02;
    if (dailyRate > 1) dailyRate = dailyRate / 100;

    // 3. 매칭 수당률 (10대까지)
    const [matchingRows] = await connection.query(`
      SELECT level, rate FROM bonus_config
      WHERE reward_type = 'daily_matching'
      ORDER BY level ASC
    `);
    const matchRateMap = {};
    for (const row of matchingRows) {
      let rate = row.rate;
      if (rate > 1) rate = rate / 100;
      matchRateMap[row.level] = rate;
    }

    // 4. 오늘 지급내역(중복방지)
    const [todayLogs] = await connection.query(`
      SELECT member_id, type, source FROM rewards_log
      WHERE DATE(created_at) = CURDATE()
    `);
    const existsMap = new Set(todayLogs.map(r => `${r.member_id}_${r.type}_${r.source}`));

    // 5. 한도 batch 캐싱
    const memberIds = [
      ...new Set(
        products.flatMap(p => [
          p.member_id, p.rec_1_id, p.rec_2_id, p.rec_3_id, p.rec_4_id,
          p.rec_5_id, p.rec_6_id, p.rec_7_id, p.rec_8_id, p.rec_9_id, p.rec_10_id
        ]).filter(Boolean)
      )
    ];
    const availableMap = await getAvailableRewardAmountByMemberIds(memberIds);

    // 6. 수당금지 여부 캐싱
    const [blockRows] = await connection.query(
      `SELECT id, is_reward_blocked FROM members WHERE id IN (?)`, [memberIds]
    );
    const blockMap = {};
    for (const r of blockRows) blockMap[r.id] = r.is_reward_blocked;

    // 7. 매칭수당 지급을 위해 하위 10대별 기준일 미리 캐싱
    // (내 기준일: 내 first_purchase_at)
    const memberFirstPurchaseAtMap = {};
    for (const p of products) {
      memberFirstPurchaseAtMap[p.member_id] = p.first_purchase_at;
    }

    // 8. 수당 지급 준비
    const rewardInserts = [];

    for (const p of products) {
      const {
        purchase_id, member_id, pv, type, active,
        rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
        rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id
      } = p;

      // ① 데일리 (Bcode면 active=1만)
      if (type === 'bcode' && active === 0) continue;
      if (blockMap[member_id]) continue;

      const dailyAmount = Math.floor(pv * dailyRate);
      const key = `${member_id}_daily_${purchase_id}`;

      if (!existsMap.has(key)) {
        const available = availableMap[member_id] ?? 0;
        if (available < dailyAmount) {
          rewardInserts.push([member_id, 'daily', purchase_id, 0, '한도초과(데일리)']);
        } else {
          rewardInserts.push([member_id, 'daily', purchase_id, dailyAmount, '데일리수당']);
          availableMap[member_id] -= dailyAmount;
        }
      }

      // ② 매칭수당: normal만, 하위 10대의 기준일 이후 데일리만 매칭
      if (type !== 'normal') continue;

      const recs = [
        rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
        rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id
      ];

      for (let i = 0; i < recs.length; i++) {
        const recId = recs[i];
        const level = i + 1;

        if (!recId || !matchRateMap[level]) continue;
        if (blockMap[recId]) continue;

        // ⚡ 매칭수당 기준일 계산
        // - 내 기준일보다 먼저 구매된 하위 회원의 데일리(같은날 포함)만 매칭
        const myFirstPurchaseAt = memberFirstPurchaseAtMap[recId];
        if (!myFirstPurchaseAt) continue;

        // 하위 회원이 구매한 상품(p)의 created_at이 recId의 기준일 이후인가?
        if (new Date(p.created_at) < new Date(myFirstPurchaseAt)) continue;

        const matchAmount = Math.floor(dailyAmount * matchRateMap[level]);
        const recKey = `${recId}_daily_matching_${purchase_id}`;

        if (!existsMap.has(recKey)) {
          const recAvailable = availableMap[recId] ?? 0;
          if (recAvailable < matchAmount) {
            rewardInserts.push([recId, 'daily_matching', purchase_id, 0, `한도초과(매칭-${level}대)`]);
          } else {
            rewardInserts.push([recId, 'daily_matching', purchase_id, matchAmount, `데일리매칭-${level}대`]);
            availableMap[recId] -= matchAmount;
          }
        }
      }
    }

    // 9. 일괄 INSERT + 출금가능포인트 동시에 UPDATE
    if (rewardInserts.length > 0) {
      const insertQuery = `
        INSERT INTO rewards_log (member_id, type, source, amount, memo, created_at)
        VALUES ?
      `;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const values = rewardInserts.map(r => [...r, now]);
      await connection.query(insertQuery, [values]);

      // ✅ 지급액이 있는 건만 출금가능포인트 동시에 update!
      // 1. member_id별 지급액 합산
      const memberRewardMap = {};
      for (const [member_id, , , amount] of rewardInserts) {
        if (amount > 0) {
          memberRewardMap[member_id] = (memberRewardMap[member_id] || 0) + amount;
        }
      }
      // 2. 각 회원별로 update
      for (const member_id in memberRewardMap) {
        const total = memberRewardMap[member_id];
        await connection.query(
          'UPDATE members SET withdrawable_point = withdrawable_point + ? WHERE id = ?',
          [total, member_id]
        );
      }
    }

    console.log(`✅ 데일리 + 매칭 정산 완료 (${rewardInserts.length}건)`);
  } catch (err) {
    console.error('❌ 데일리 정산 실패:', err);
  }
}

module.exports = { processDailyRewards };
