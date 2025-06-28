// ✅ 파일 경로: backend/routes/adminExport.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
const ExcelJS = require('exceljs');

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9999;
  const offset = (page - 1) * limit;

  // ✅ center, recommender 조인
  const query = `
    SELECT 
      m.id,
      m.created_at,
      m.username, 
      m.name, 
      m.phone, 
      c.center_name AS center, 
      rec.username AS recommender,
      m.bank_name, 
      m.account_holder, 
      m.account_number
    FROM members m
    LEFT JOIN centers c ON m.center_id = c.id
    LEFT JOIN members rec ON m.recommender_id = rec.id
    ORDER BY m.created_at DESC
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

      // ✅ 엑셀 컬럼 순서: 번호, 등록일, 아이디, 이름, 핸드폰, 센터, 추천인, 은행이름, 예금주, 계좌번호
      sheet.columns = [
        { header: '번호', key: 'no', width: 8 },
        { header: '등록일', key: 'created_at', width: 20 },
        { header: '아이디', key: 'username', width: 15 },
        { header: '이름', key: 'name', width: 15 },
        { header: '핸드폰', key: 'phone', width: 15 },
        { header: '센터', key: 'center', width: 15 },
        { header: '추천인', key: 'recommender', width: 15 },
        { header: '은행이름', key: 'bank_name', width: 15 },
        { header: '예금주', key: 'account_holder', width: 15 },
        { header: '계좌번호', key: 'account_number', width: 20 },
      ];

      // ✅ 번호(1부터 시작)와 데이터 채우기
      results.forEach((row, idx) => {
        sheet.addRow({
          no: idx + 1,
          created_at: row.created_at,
          username: row.username,
          name: row.name,
          phone: row.phone,
          center: row.center,
          recommender: row.recommender,
          bank_name: row.bank_name,
          account_holder: row.account_holder,
          account_number: row.account_number,
        });
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
