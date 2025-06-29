// ✅ 파일 위치: backend/routes/adminSettings.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// ✅ sponsor, rank 관련 설정 제거
const bonusMap = {
  daily_reward_percent: { reward_type: 'daily', level: 0 },
  recommender_reward_percent: { reward_type: 'referral', level: 0 },
  center_fee_percent: { reward_type: 'center', level: 0 },
  center_recommender_percent: { reward_type: 'center_recommend', level: 0 }
  // sponsor_reward_percent, rank_reward_percent 제거
};

// ✅ 모든 설정 조회
router.get('/', async (req, res) => {
  const sql = `SELECT key_name, value, type, description FROM settings ORDER BY id ASC`;
  try {
    const [results] = await pool.query(sql);
    const response = {};
    results.forEach(row => {
      response[row.key_name] = {
        value: row.value,
        type: row.type,
        description: row.description
      };
    });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'DB 오류' });
  }
});

// ✅ 설정 저장 + bonus_config 동기화
router.post('/', async (req, res) => {
  const updates = req.body; // { key_name: { value }, ... }

  // ⚡️ 커넥션 풀에서 트랜잭션을 쓸 때는 getConnection!
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const [key, { value }] of Object.entries(updates)) {
      // settings 저장
      const settingSql = `
        INSERT INTO settings (key_name, value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE value = ?
      `;
      await connection.query(settingSql, [key, value, value]);

      // bonus_config 연동 대상이면 같이 업데이트
      if (bonusMap[key]) {
        const { reward_type, level } = bonusMap[key];
        const bonusSql = `
          INSERT INTO bonus_config (reward_type, level, rate, description, updated_at)
          VALUES (?, ?, ?, '', NOW())
          ON DUPLICATE KEY UPDATE rate = ?, updated_at = NOW()
        `;
        await connection.query(bonusSql, [reward_type, level, value, value]);
      }
    }

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('❌ 설정 저장 실패:', error);
    res.status(500).json({ error: '저장 실패' });
  } finally {
    connection.release();
  }
});

module.exports = router;
