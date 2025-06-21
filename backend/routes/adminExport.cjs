// ✅ 2. backend/routes/adminExport.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
const ExcelJS = require('exceljs');

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9999;
  const offset = (page - 1) * limit;

  const query = `
    SELECT username, name, phone, center, recommender, sponsor,
           bank_name, account_holder, account_number, created_at
    FROM members
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  connection.query(query, [limit, offset], async (err, results) => {
    if (err) {
      console.error('❌ 엑셀 쿼리 실패:', err);
      return res.status(500).json({ message: '엑셀 다운로드 실패' });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('회원목록');

      sheet.columns = [
        { header: '아이디', key: 'username', width: 15 },
        { header: '이름', key: 'name', width: 15 },
        { header: '핸드폰', key: 'phone', width: 15 },
        { header: '센터', key: 'center', width: 15 },
        { header: '추천인', key: 'recommender', width: 15 },
        { header: '후원인', key: 'sponsor', width: 15 },
        { header: '은행이름', key: 'bank_name', width: 15 },
        { header: '예금주', key: 'account_holder', width: 15 },
        { header: '계좌번호', key: 'account_number', width: 20 },
        { header: '등록일', key: 'created_at', width: 20 },
      ];

      results.forEach((row) => {
        sheet.addRow(row);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=members_${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('❌ 엑셀 생성 실패:', err);
      res.status(500).json({ message: '엑셀 생성 오류' });
    }
  });
});

module.exports = router;