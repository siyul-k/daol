// ✅ 파일 위치: backend/routes/rewards.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// ✅ 로그인한 회원의 수당 내역 조회 (source → username 매핑)
router.get('/', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });

  try {
    // 1. 회원 ID 조회
    const [[member]] = await pool.query(
      'SELECT id FROM members WHERE username = ? LIMIT 1',
      [username]
    );
    if (!member) return res.status(404).json({ error: '회원 없음' });

    // 2. 수당 내역 조회 (source_username 매핑)
    const sql = `
      SELECT 
        r.*,
        m_self.username AS member_username,
        r.memo,
        COALESCE(m_user.username, m_purchase.username) AS source_username,
        CONVERT_TZ(r.created_at, '+00:00', '+09:00') AS created_at_kst
      FROM rewards_log r
      LEFT JOIN members m_self ON r.member_id = m_self.id
      LEFT JOIN purchases p ON r.source = p.id
      LEFT JOIN members m_purchase ON p.member_id = m_purchase.id
      LEFT JOIN members m_user ON r.source = m_user.id
      WHERE r.member_id = ?
      ORDER BY r.created_at DESC
    `;
    const [results] = await pool.query(sql, [member.id]);

    // ✅ 추천(recommend), 직급(rank) 타입 제외
    const filtered = results.filter(
      r => r.type !== 'recommend' && r.type !== 'rank'
    );

    res.json(filtered);
  } catch (err) {
    console.error('❌ rewards_log 조회 오류:', err);
    res.status(500).json({ error: 'DB 오류', details: err });
  }
});

// ✅ 로그인한 회원의 수당 총합 조회
router.get('/total/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const [[member]] = await pool.query(
      'SELECT id FROM members WHERE username = ? LIMIT 1',
      [username]
    );
    if (!member) return res.status(404).json({ error: '회원 없음' });

    const [rows] = await pool.query(
      `SELECT IFNULL(SUM(amount), 0) AS total_reward
       FROM rewards_log
       WHERE member_id = ?`,
      [member.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ 총합 조회 오류:', err);
    res.status(500).json({ error: 'DB 오류', details: err });
  }
});

module.exports = router;
