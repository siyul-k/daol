const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
const ExcelJS = require('exceljs');

// 관리자 - 입금 요청 엑셀 다운로드
router.get('/', async (req, res) => {
  const query = `
    SELECT 
      d.id, 
      d.created_at,
      d.username,
      m.name,
      d.account_holder,
      d.amount,
      d.status
    FROM deposit_requests d
    LEFT JOIN members m ON d.username = m.username
    ORDER BY d.created_at DESC
  `;

  connection.query(query, async (err, results) => {
    if (err) {
      console.error('❌ 엑셀 다운로드 쿼리 실패:', err);
      return res.status(500).json({ message: '엑셀 다운로드 실패' });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('입금 요청 목록');

      // ✅ 열 정의
      sheet.columns = [
        { header: '번호', key: 'id', width: 8 },
        { header: '등록일', key: 'created_at', width: 20 },
        { header: '아이디', key: 'username', width: 15 },
        { header: '이름', key: 'name', width: 15 },
        { header: '예금주', key: 'account_holder', width: 15 },
        { header: '금액', key: 'amount', width: 15 },
        { header: '상태', key: 'status', width: 12 },
      ];

      // ✅ 데이터 삽입
      results.forEach((row) => {
        sheet.addRow(row);
      });

      // ✅ 응답 헤더 설정
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=deposit_requests_${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('❌ 엑셀 생성 실패:', err);
      res.status(500).json({ message: '엑셀 생성 오류' });
    }
  });
});

module.exports = router;
