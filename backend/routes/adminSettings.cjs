// ✅ 파일 위치: backend/routes/adminSettings.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ bonus_config 매핑 정의
const bonusMap = {
  daily_reward_percent: { reward_type: 'daily', level: 0 },
  recommender_reward_percent: { reward_type: 'referral', level: 0 },
  sponsor_reward_percent: { reward_type: 'sponsor', level: 0 },
  center_fee_percent: { reward_type: 'center', level: 0 },
  center_recommender_percent: { reward_type: 'center_recommend', level: 0 },
  rank_reward_percent: { reward_type: 'rank', level: 0 }
};

// ✅ 모든 설정 조회
router.get('/', (req, res) => {
  const sql = `SELECT key_name, value, type, description FROM settings ORDER BY id ASC`;
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'DB 오류' });

    const response = {};
    results.forEach(row => {
      response[row.key_name] = {
        value: row.value,
        type: row.type,
        description: row.description
      };
    });

    res.json(response);
  });
});

// ✅ 설정 저장 + bonus_config 동기화
router.post('/', (req, res) => {
  const updates = req.body; // { key_name: { value }, ... }

  const queries = Object.entries(updates).flatMap(([key, { value }]) => {
    const sqls = [];

    // settings 저장
    const settingSql = `
      INSERT INTO settings (key_name, value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE value = ?
    `;
    sqls.push({ query: settingSql, params: [key, value, value] });

    // bonus_config 연동 대상이면 같이 업데이트
    if (bonusMap[key]) {
      const { reward_type, level } = bonusMap[key];
      const bonusSql = `
        INSERT INTO bonus_config (reward_type, level, rate, description, updated_at)
        VALUES (?, ?, ?, '', NOW())
        ON DUPLICATE KEY UPDATE rate = ?, updated_at = NOW()
      `;
      sqls.push({ query: bonusSql, params: [reward_type, level, value, value] });
    }

    return sqls;
  });

  // 트랜잭션 실행
  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ error: '트랜잭션 오류' });

    Promise.all(
      queries.map(q =>
        new Promise((resolve, reject) => {
          connection.query(q.query, q.params, (err) => {
            if (err) return reject(err);
            resolve();
          });
        })
      )
    )
      .then(() => {
        connection.commit();
        res.json({ success: true });
      })
      .catch(error => {
        connection.rollback(() => {
          console.error('❌ 설정 저장 실패:', error);
          res.status(500).json({ error: '저장 실패' });
        });
      });
  });
});

module.exports = router;
