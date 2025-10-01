// ✅ 파일 경로: backend/routes/sponsorPv.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs'); // connection → pool

/* ────────────────────────────────────────────────────────────────
 * 대시보드: 후원인 목록 PV (직접 하위만 → 본인+하위 전체 PV 합산)
 *    POST /api/sponsor-pv/list
 *    body: { sponsors: string[] }  // 후원인 username 배열 (직접 하위)
 *    - 각 회원 "본인+하위 전체" PV 합산
 *    - PV: approved + type='normal' 만
 * ──────────────────────────────────────────────────────────────── */
router.post('/list', async (req, res) => {
  try {
    const sponsors = Array.isArray(req.body.sponsors) ? req.body.sponsors.filter(Boolean) : [];
    if (sponsors.length === 0) return res.json([]);

    const placeholders = sponsors.map(() => '?').join(',');
    const sql = `
      SELECT m.username, m.name,
             IFNULL((
               SELECT SUM(p.pv)
                 FROM purchases p
                 JOIN members mm ON mm.id = p.member_id
                WHERE p.status='approved'
                  AND p.type='normal'
                  AND (mm.id = m.id OR mm.sponsor_path LIKE CONCAT('%|', m.id, '|%'))
             ), 0) AS pv
        FROM members m
       WHERE m.username IN (${placeholders})
    `;
    const [rows] = await pool.query(sql, sponsors);

    // 요청 순서 유지 + 존재하지 않는 username도 0으로 반환
    const map = new Map(
      rows.map(r => [r.username, { username: r.username, name: r.name, pv: Number(r.pv || 0) }])
    );
    const result = sponsors.map(u => map.get(u) || { username: u, name: '', pv: 0 });

    res.json(result);
  } catch (err) {
    console.error('❌ sponsor-pv/list 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
