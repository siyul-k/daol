// ✅ 파일 경로: backend/routes/withdrawablePoints.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');  // connection → pool
const getMemberId = require('../utils/getMemberId.cjs');

// 출금가능 포인트 조회 API (withdrawable_point 즉시 반환)
router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // username → member_id 변환
    const member_id = await getMemberId(username);
    if (!member_id) {
      return res.status(404).json({ error: '존재하지 않는 회원입니다.' });
    }

    // ✅ members.withdrawable_point 값만 즉시 반환 (초고속)
    const [[row]] = await pool.query(
      'SELECT withdrawable_point FROM members WHERE id = ?',
      [member_id]
    );
    res.json({ withdrawable: row.withdrawable_point || 0 });
  } catch (err) {
    return res.status(500).json({ error: '회원 확인 실패', details: err.message });
  }
});

module.exports = router;
