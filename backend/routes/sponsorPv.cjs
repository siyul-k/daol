// ✅ 파일 경로: backend/routes/sponsorPv.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs'); // connection → pool로

// ✅ 후원 좌/우 하위 PV 합산 API (PK 기반)
router.get('/:username', async (req, res) => {
  const username = req.params.username;
  if (!username) {
    return res.status(400).json({ success: false, message: 'username 필수' });
  }

  try {
    // 1. 기준 회원의 member_id 가져오기
    const [[user]] = await pool.query(
      `SELECT id FROM members WHERE username = ? AND is_admin = 0 LIMIT 1`,
      [username]
    );
    if (!user) {
      return res.status(404).json({ success: false, message: '회원 없음' });
    }
    const member_id = user.id;

    // 2. 전체 회원 정보 (PK/후원인/좌우) 모두 PK로!
    const [members] = await pool.query(`
      SELECT id, username, sponsor_id, sponsor_direction
      FROM members
      WHERE is_admin = 0
    `);

    // 3. 후원 트리 재귀 탐색 (PK기반)
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

    const leftIds = getDescendants(member_id, 'L');
    const rightIds = getDescendants(member_id, 'R');

    // 4. PV 합산 (member_id 리스트 기반)
    async function getPVTotal(memberIds) {
      if (!Array.isArray(memberIds) || memberIds.length === 0) return 0;
      const qs = memberIds.map(() => '?').join(',');
      const [rows] = await pool.query(
        `
        SELECT SUM(p.pv) AS total_pv
        FROM purchases p
        WHERE p.member_id IN (${qs})
         AND p.status = 'approved'
          AND p.type = 'normal'
        `,
        memberIds
     );
     return rows[0].total_pv || 0;
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

module.exports = router;
