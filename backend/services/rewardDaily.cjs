// ✅ 파일 경로: backend/services/rewardDaily.cjs

const connection = require('../db.cjs');
const { getAvailableRewardAmount, getAvailableRewardAmountByUsername } = require('../utils/rewardLimit.cjs');

async function processDailyRewards() {
  try {
    // 1. 상품 전체 조회 - 시간순 정렬!
    const [products] = await connection.promise().query(`
      SELECT p.id AS purchase_id, p.member_id, p.pv, p.type, p.active, p.created_at,
             m.username, m.recommender,
             m.rec_1, m.rec_2, m.rec_3
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.status = 'approved'
      ORDER BY p.created_at ASC
    `);

    // 2. 유저별 한도 캐시 (매 반복마다 전체 쿼리 막기 위해)
    const availableMap = {};

    for (const product of products) {
      const {
        purchase_id, member_id, pv, type, active,
        username, recommender,
        rec_1, rec_2, rec_3
      } = product;

      // ✅ Bcode 비활성화면 데일리 발생 안 함
      if (type === 'bcode' && active === 0) continue;

      // ✅ 데일리 비율
      const [[rateRow]] = await connection.promise().query(`
        SELECT rate FROM bonus_config WHERE reward_type = 'daily' LIMIT 1
      `);
      const dailyRate = rateRow?.rate || 0.02;
      const dailyAmount = Math.floor(pv * dailyRate);

      // ✅ 현재 유저 한도 캐시 조회 또는 계산
      if (!availableMap[username]) {
        availableMap[username] = await getAvailableRewardAmount(member_id);
      }

      const available = availableMap[username];

      // ✅ 오늘 이미 지급된 경우 중복 방지
      const [already] = await connection.promise().query(`
        SELECT 1 FROM rewards_log
        WHERE user_id = ? AND type = 'daily' AND source = ? AND DATE(created_at) = CURDATE()
      `, [username, purchase_id]);
      if (already.length > 0) continue;

      // ✅ 지급 또는 한도초과 처리
      if (available < dailyAmount) {
        await connection.promise().query(`
          INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
          VALUES (?, 'daily', ?, 0, '한도초과(데일리)', NOW())
        `, [username, purchase_id]);
        continue;
      }

      // ✅ 정상 지급
      await connection.promise().query(`
        INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
        VALUES (?, 'daily', ?, ?, '데일리수당', NOW())
      `, [username, purchase_id, dailyAmount]);

      // ✅ 한도 소진 업데이트
      availableMap[username] -= dailyAmount;

      // ✅ 매칭 수당은 기본상품만
      if (type !== 'normal') continue;

      const recList = [rec_1, rec_2, rec_3].filter(Boolean);

      const [configRows] = await connection.promise().query(`
        SELECT level, rate FROM bonus_config WHERE reward_type = 'daily_matching'
      `);
      const rateMap = {};
      for (const row of configRows) {
        rateMap[row.level] = row.rate;
      }

      for (let i = 0; i < recList.length; i++) {
        const recUsername = recList[i];
        const level = i + 1;
        const rate = rateMap[level];
        if (!rate) continue;

        const matchAmount = Math.floor(dailyAmount * rate);
        const availableMatch = await getAvailableRewardAmountByUsername(recUsername);

        if (availableMatch < matchAmount) {
          await connection.promise().query(`
            INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
            VALUES (?, 'daily_matching', ?, 0, ?, NOW())
          `, [recUsername, purchase_id, `한도초과(매칭-${level}대)`]);
        } else {
          await connection.promise().query(`
            INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
            VALUES (?, 'daily_matching', ?, ?, ?, NOW())
          `, [
            recUsername,
            purchase_id,
            matchAmount,
            `데일리매칭-${level}대`
          ]);
        }
      }
    }

    console.log('✅ 데일리 수당 + 매칭 정산 완료 (시간순 한도 적용)');
  } catch (err) {
    console.error('❌ 데일리 정산 오류:', err);
  }
}

module.exports = { processDailyRewards };
