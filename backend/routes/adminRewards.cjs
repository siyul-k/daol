const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
const ExcelJS = require('exceljs');

// 수당 목록 조회 (후원, 직급 내역 제외, created_at 시간 KST 변환 적용)
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const searchId = req.query.searchId || '';
  const type = req.query.type || '';
  const date = req.query.date || '';

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
  if (date) {
    where += ' AND DATE(CONVERT_TZ(r.created_at, "+00:00", "+09:00")) = ?';
    params.push(date);
  }

  // 후원/직급 내역 제외
  where += ` AND r.type NOT IN ('sponsor', 'rank')`;

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
      CONVERT_TZ(r.created_at, '+00:00', '+09:00') AS created_at_kst
    FROM rewards_log r
    LEFT JOIN members m ON r.member_id = m.id
    LEFT JOIN purchases p ON r.source = p.id
    LEFT JOIN members m_purchase ON p.member_id = m_purchase.id
    LEFT JOIN members m_user ON r.source = m_user.id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  connection.query(countSql, params, (err, countResult) => {
    if (err) return res.status(500).json({ error: '카운트 조회 실패' });
    const total = countResult[0].total;

    connection.query(dataSql, [...params, limit, offset], (err2, rows) => {
      if (err2) return res.status(500).json({ error: '목록 조회 실패' });
      res.json({ data: rows, total });
    });
  });
});

// 수당 내역 엑셀 다운로드 (created_at 시간 KST 변환 적용)
router.get('/export', async (req, res) => {
  const searchId = req.query.searchId || '';
  const type = req.query.type || '';
  const date = req.query.date || '';

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
  if (date) {
    where += ' AND DATE(CONVERT_TZ(r.created_at, "+00:00", "+09:00")) = ?';
    params.push(date);
  }

  // 후원/직급 내역 제외
  where += ` AND r.type NOT IN ('sponsor', 'rank')`;

  const query = `
    SELECT r.*, 
      m.username AS member_username,
      COALESCE(m_user.username, m_purchase.username) AS source_username,
      CONVERT_TZ(r.created_at, '+00:00', '+09:00') AS created_at_kst
    FROM rewards_log r
    LEFT JOIN members m ON r.member_id = m.id
    LEFT JOIN purchases p ON r.source = p.id
    LEFT JOIN members m_purchase ON p.member_id = m_purchase.id
    LEFT JOIN members m_user ON r.source = m_user.id
    ${where}
    ORDER BY r.created_at DESC
  `;

  connection.query(query, params, async (err, results) => {
    if (err) return res.status(500).json({ error: '엑셀 쿼리 실패' });

    try {
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
          created_at_kst: new Date(row.created_at_kst).toLocaleString('ko-KR'),
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
});

module.exports = router;
