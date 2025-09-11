// ✅ 파일 경로: backend/routes/sponsorPv.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs'); // connection → pool로

/* ────────────────────────────────────────────────────────────────
 * ① 후원 좌/우 하위 PV 합산 (기존 유지)
 *    GET /api/sponsor-pv/:username
 *    - 좌/우 전체 하위 트리 PV 합계
 *    - PV: approved + type='normal' 만
 * ──────────────────────────────────────────────────────────────── */
router.get('/:username', async (req, res) => {
  const username = req.params.username;
  if (!username) {
    return res.status(400).json({ success: false, message: 'username 필수' });
  }

  try {
    // 1) 기준 회원의 member_id
    const [[user]] = await pool.query(
      `SELECT id FROM members WHERE username = ? AND is_admin = 0 LIMIT 1`,
      [username]
    );
    if (!user) {
      return res.status(404).json({ success: false, message: '회원 없음' });
    }
    const member_id = user.id;

    // 2) 전체 회원 (PK / 후원인 / 좌우)
    const [members] = await pool.query(`
      SELECT id, username, sponsor_id, sponsor_direction
      FROM members
      WHERE is_admin = 0
    `);

    // 3) 후원 트리 재귀 탐색 (PK 기반)
    function getDescendants(parent_id, direction) {
      const queue = members
        .filter(m => m.sponsor_id === parent_id && m.sponsor_direction === direction)
        .map(m => m.id);

      const descendants = new Set([...queue]);
      while (queue.length > 0) {
        const current = queue.shift();
        members
          .filter(m => m.sponsor_id === current)
          .forEach(m => {
            if (!descendants.has(m.id)) {
              descendants.add(m.id);
              queue.push(m.id);
            }
          });
      }
      return [...descendants];
    }

    const leftIds  = getDescendants(member_id, 'L');
    const rightIds = getDescendants(member_id, 'R');

    // 4) PV 합산 (member_id 리스트 기반) : approved + type='normal'
    async function getPVTotal(memberIds) {
      if (!Array.isArray(memberIds) || memberIds.length === 0) return 0;
      const qs = memberIds.map(() => '?').join(',');
      const [rows] = await pool.query(
        `
        SELECT IFNULL(SUM(p.pv),0) AS total_pv
          FROM purchases p
         WHERE p.member_id IN (${qs})
           AND p.status = 'approved'
           AND p.type   = 'normal'
        `,
        memberIds
      );
      return Number(rows[0]?.total_pv || 0);
    }

    const [leftPV, rightPV] = await Promise.all([
      getPVTotal(leftIds),
      getPVTotal(rightIds)
    ]);

    res.json({
      success: true,
      L: { total_pv: leftPV },
      R: { total_pv: rightPV }
    });

  } catch (err) {
    console.error("❌ sponsor-pv 오류:", err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

/* ────────────────────────────────────────────────────────────────
 * ② 대시보드: 후원인 목록 PV (직접 하위만 → 본인+하위 전체 PV 합산)
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
    const map = new Map(rows.map(r => [r.username, { username: r.username, name: r.name, pv: Number(r.pv || 0) }]));
    const result = sponsors.map(u => map.get(u) || ({ username: u, name: '', pv: 0 }));

    res.json(result);
  } catch (err) {
    console.error('❌ sponsor-pv/list 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
