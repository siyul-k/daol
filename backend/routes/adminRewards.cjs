// ✅ 파일 위치: backend/routes/adminRewards.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const ExcelJS = require('exceljs');

// 수당 목록 조회 (추천, 직급 내역 제외, created_at 시간 KST 변환 적용, 기간검색/페이지네이션)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const searchId = req.query.searchId || '';
  const type = req.query.type || '';
  const startDate = req.query.startDate || '';
  const endDate = req.query.endDate || '';

  let where = 'WHERE 1=1';
  const params = [];

  if (searchId) {
    where += ' AND m.username LIKE ?';
    params.push(`%${searchId}%`);
  }
  if (type) {
    where += ' AND r.type = ?';
    params.push(type);
  }
  if (startDate) {
    where += ' AND DATE(CONVERT_TZ(r.created_at, "+00:00", "+09:00")) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND DATE(CONVERT_TZ(r.created_at, "+00:00", "+09:00")) <= ?';
    params.push(endDate);
  }

  // ✅ 추천, 직급 내역 제외 (후원은 포함)
  where += ` AND r.type NOT IN ('recommend', 'rank')`;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM rewards_log r
    LEFT JOIN members m ON r.member_id = m.id
    ${where}
  `;
  const dataSql = `
    SELECT r.*, 
      m.username AS member_username,
      COALESCE(m_user.username, m_purchase.username) AS source_username,
      DATE_FORMAT(CONVERT_TZ(r.created_at, '+00:00', '+09:00'), '%Y-%m-%d %H:%i:%s') AS created_at_kst
    FROM rewards_log r
    LEFT JOIN members m ON r.member_id = m.id
    LEFT JOIN purchases p ON r.source = p.id
    LEFT JOIN members m_purchase ON p.member_id = m_purchase.id
    LEFT JOIN members m_user ON r.source = m_user.id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  try {
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0].total;

    const [rows] = await pool.query(dataSql, [...params, limit, offset]);
    res.json({ data: rows, total });
  } catch (err) {
    res.status(500).json({ error: '목록 조회 실패' });
  }
});

// 수당 내역 엑셀 다운로드 (기간검색 포함)
router.get('/export', async (req, res) => {
  const searchId = req.query.searchId || '';
  const type = req.query.type || '';
  const startDate = req.query.startDate || '';
  const endDate = req.query.endDate || '';

  let where = 'WHERE 1=1';
  const params = [];

  if (searchId) {
    where += ' AND m.username LIKE ?';
    params.push(`%${searchId}%`);
  }
  if (type) {
    where += ' AND r.type = ?';
    params.push(type);
  }
  if (startDate) {
    where += ' AND DATE(CONVERT_TZ(r.created_at, "+00:00", "+09:00")) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND DATE(CONVERT_TZ(r.created_at, "+00:00", "+09:00")) <= ?';
    params.push(endDate);
  }

  // ✅ 추천, 직급 내역 제외 (후원은 포함)
  where += ` AND r.type NOT IN ('recommend', 'rank')`;

  const query = `
    SELECT r.*, 
      m.username AS member_username,
      COALESCE(m_user.username, m_purchase.username) AS source_username,
      DATE_FORMAT(CONVERT_TZ(r.created_at, '+00:00', '+09:00'), '%Y-%m-%d %H:%i:%s') AS created_at_kst
    FROM rewards_log r
    LEFT JOIN members m ON r.member_id = m.id
    LEFT JOIN purchases p ON r.source = p.id
    LEFT JOIN members m_purchase ON p.member_id = m_purchase.id
    LEFT JOIN members m_user ON r.source = m_user.id
    ${where}
    ORDER BY r.created_at DESC
  `;

  try {
    const [results] = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('수당내역');

    sheet.columns = [
      { header: '등록일', key: 'created_at_kst', width: 20 },
      { header: '종류', key: 'type', width: 15 },
      { header: '아이디', key: 'member_username', width: 15 },
      { header: '포인트', key: 'amount', width: 15 },
      { header: '수당원천', key: 'source_username', width: 15 },
      { header: '상세내용', key: 'memo', width: 30 },
    ];

    results.forEach((row) => {
      sheet.addRow({
        created_at_kst: row.created_at_kst, // ✅ 이미 포맷된 문자열 그대로 사용
        type: row.type,
        member_username: row.member_username,
        amount: row.amount,
        source_username: row.source_username,
        memo: row.memo,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=rewards_export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('엑셀 생성 실패:', error);
    res.status(500).json({ error: '엑셀 생성 실패' });
  }
});

module.exports = router;
