// ✅ 파일 경로: backend/routes/rewards.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 로그인한 회원의 수당 내역 조회 (source → username 매핑)
router.get('/', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });

  const sql = `
    SELECT 
      r.*, 
      r.memo,
      COALESCE(m_user.username, m_purchase.username) AS source_username
    FROM rewards_log r
    LEFT JOIN members m_user ON r.source = m_user.id                      -- source가 회원 ID인 경우
    LEFT JOIN purchases p ON r.source = p.id                             -- source가 구매 ID인 경우
    LEFT JOIN members m_purchase ON p.member_id = m_purchase.id          -- 구매한 회원의 아이디 조회
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `;

  connection.query(sql, [username], (err, results) => {
    if (err) {
      console.error('rewards_log 조회 오류:', err);
      return res.status(500).json({ error: 'DB 오류' });
    }
    res.json(results);
  });
});

// ✅ 로그인한 회원의 수당 총합 조회
router.get('/total/:username', (req, res) => {
  const { username } = req.params;

  const sql = `
    SELECT IFNULL(SUM(point), 0) AS total_reward
    FROM rewards_log
    WHERE user_id = ?
  `;

  connection.query(sql, [username], (err, rows) => {
    if (err) {
      console.error("총합 조회 오류:", err);
      return res.status(500).json({ error: 'DB 오류', details: err });
    }
    res.json(rows[0]);
  });
});

module.exports = router;
