// ✅ 파일 경로: backend/routes/product.cjs
const express = require("express");
const router = express.Router();
const connection = require("../db.cjs");

// ✅ 상품 구매 요청 (기본상품 구매)
router.post("/", (req, res) => {
  const { member_id, package_id, amount, pv, type } = req.body;

  if (!member_id || !amount || !pv || !type) {
    return res.status(400).json({ error: "필수 항목 누락" });
  }

  const sql = `
    INSERT INTO purchases (member_id, package_id, amount, pv, status, created_at)
    VALUES (?, ?, ?, ?, 'approved', NOW())
  `;

  connection.query(sql, [member_id, package_id || null, amount, pv], (err, result) => {
    if (err) {
      console.error("❌ 상품구매 등록 오류:", err);
      return res.status(500).json({ error: "DB 오류" });
    }
    res.json({ success: true, id: result.insertId });
  });
});

module.exports = router;
