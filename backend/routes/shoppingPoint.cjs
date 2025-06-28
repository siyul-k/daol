// ✅ 파일 경로: backend/routes/shoppingPoint.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ GET /api/shopping-point/:username (username → member_id 변환)
router.get('/:username', async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ success: false, message: "username 필수" });
  }

  try {
    // username → member_id + shopping_point 조회 (id 기준이 표준)
    const [[member]] = await connection.promise().query(
      `SELECT id, shopping_point FROM members WHERE username = ? LIMIT 1`,
      [username]
    );

    if (!member) {
      return res.status(404).json({ success: false, message: "회원 없음" });
    }

    // 필요시 member_id도 함께 반환 (통일성)
    return res.json({
      success: true,
      member_id: member.id,
      shopping_point: member.shopping_point || 0
    });
  } catch (err) {
    console.error("❌ 쇼핑포인트 조회 오류:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
});

module.exports = router;
