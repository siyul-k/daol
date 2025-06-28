const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// 로그인한 회원의 수당 내역 조회 (source → username 매핑)
router.get('/', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });

  connection.query(
    'SELECT id FROM members WHERE username = ? LIMIT 1',
    [username],
    (err, rows) => {
      if (err || !rows.length) {
        return res.status(404).json({ error: '회원 없음' });
      }
      const member_id = rows[0].id;

      const sql = `
  SELECT 
    r.*, 
    m_self.username AS member_username,
    r.memo,
    m_purchase.username AS source_username,
    CONVERT_TZ(r.created_at, '+00:00', '+09:00') AS created_at_kst
  FROM rewards_log r
  LEFT JOIN members m_self ON r.member_id = m_self.id
  LEFT JOIN purchases p ON r.source = p.id
  LEFT JOIN members m_purchase ON p.member_id = m_purchase.id
  WHERE r.member_id = ?
  ORDER BY r.created_at DESC
`;

      connection.query(sql, [member_id], (err2, results) => {
        if (err2) {
          console.error('rewards_log 조회 오류:', err2);
          return res.status(500).json({ error: 'DB 오류' });
        }
        // 후원(sponsor), 직급(rank) 타입 제외
        const filtered = results.filter(
          (r) => r.type !== "sponsor" && r.type !== "rank"
        );
        res.json(filtered);
      });
    }
  );
});

// 로그인한 회원의 수당 총합 조회
router.get('/total/:username', (req, res) => {
  const { username } = req.params;

  connection.query(
    'SELECT id FROM members WHERE username = ? LIMIT 1',
    [username],
    (err, rows) => {
      if (err || !rows.length) {
        return res.status(404).json({ error: '회원 없음' });
      }
      const member_id = rows[0].id;

      const sql = `
        SELECT IFNULL(SUM(amount), 0) AS total_reward
        FROM rewards_log
        WHERE member_id = ?
      `;

      connection.query(sql, [member_id], (err2, rows2) => {
        if (err2) {
          console.error("총합 조회 오류:", err2);
          return res.status(500).json({ error: 'DB 오류', details: err2 });
        }
        res.json(rows2[0]);
      });
    }
  );
});

module.exports = router;
