// ✅ 파일 경로: backend/routes/adminDeposits.cjs
// -----------------------------------------------------------------------------
//   • 입금 통계 / 목록 / 엑셀 다운로드 (원본 유지)
//   • 입금 완료  : 트랜잭션 + 멱등(이미 완료 스킵) +
//                  point_logs 스키마( ref_table/ref_id 유무 ) 자동 호환
//                  커밋 후 통계 갱신(실패해도 완료처리 성공 보장)
//   • 입금 삭제  : 트랜잭션 + 포인트 회수 +
//                  point_logs(ref_table/ref_id 또는 username/diff) 정밀 삭제
// -----------------------------------------------------------------------------
const express  = require('express');
const router   = express.Router();
const pool     = require('../db.cjs');
const ExcelJS  = require('exceljs');
// 네가 올려준 위치 기준(services). scripts 에 두었다면 경로만 바꿔도 됨.
const { updateSingleMemberStats } = require('../scripts/updateMemberStats.cjs');

/* ─────────────────────── 내부 유틸: point_logs 스키마 탐지 ─────────────────────── */
let hasRefColsCache = null;
async function detectPointLogSchema(conn) {
  if (hasRefColsCache !== null) return hasRefColsCache;
  const [rows] = await conn.query(
    `SHOW COLUMNS FROM point_logs WHERE Field IN ('ref_table','ref_id')`
  );
  hasRefColsCache = rows.length === 2; // 둘 다 있을 때만 true
  return hasRefColsCache;
}

/* ────────────────────────── 1. 입금 통계 ────────────────────────── */
router.get('/stats', async (req, res) => {
  const sql = `
    SELECT
      IFNULL(SUM(amount), 0) AS totalAmount,
      IFNULL(SUM(
        CASE WHEN DATE(CONVERT_TZ(created_at,'+00:00','+09:00')) = CURDATE()
          THEN amount ELSE 0 END), 0) AS todayAmount
    FROM deposit_requests
    WHERE status = '완료'
  `;
  try {
    const [rows] = await pool.query(sql);
    res.json({ total: rows[0].totalAmount, today: rows[0].todayAmount });
  } catch (err) {
    console.error('❌ 통계 조회 실패:', err);
    res.status(500).json({ message: '통계 조회 실패' });
  }
});

/* ─────────────── 2. 입금 목록 (페이지네이션+기간검색) ─────────────── */
router.get('/', async (req, res) => {
  let { username, status, startDate, endDate, page = 1, limit = 25 } = req.query;
  page  = parseInt(page, 10);
  limit = parseInt(limit, 10);

  const cond = [], params = [];
  if (username) cond.push('m.username = ?'), params.push(username);
  if (status)   cond.push('d.status   = ?'), params.push(status);

  if (startDate && endDate) {
    cond.push('DATE(CONVERT_TZ(d.created_at,"+00:00","+09:00")) BETWEEN ? AND ?');
    params.push(startDate, endDate);
  } else if (startDate) {
    cond.push('DATE(CONVERT_TZ(d.created_at,"+00:00","+09:00")) >= ?');
    params.push(startDate);
  } else if (endDate) {
    cond.push('DATE(CONVERT_TZ(d.created_at,"+00:00","+09:00")) <= ?');
    params.push(endDate);
  }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM deposit_requests d
    LEFT JOIN members m ON d.member_id = m.id
    ${where}
  `;
  const dataSql = `
    SELECT d.id,
           DATE_FORMAT(CONVERT_TZ(d.created_at ,'+00:00','+09:00'), '%Y-%m-%d %H:%i:%s') AS created_at,
           m.username, m.name,
           d.status, d.account_holder, d.amount, d.memo,
           DATE_FORMAT(CONVERT_TZ(d.completed_at,'+00:00','+09:00'), '%Y-%m-%d %H:%i:%s') AS completed_at
    FROM deposit_requests d
    LEFT JOIN members m ON d.member_id = m.id
    ${where}
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?
  `;
  try {
    const [[{ total }]] = await pool.query(countSql, params);
    const [rows] = await pool.query(dataSql, [...params, limit, (page - 1) * limit]);
    res.json({ data: rows, total });
  } catch (err) {
    console.error('❌ 입금 내역 조회 실패:', err);
    res.status(500).json({ message: '입금 내역 조회 실패' });
  }
});

/* ───── 3. 입금 완료 처리 + 포인트 지급 (트랜잭션/멱등 + 스키마 호환 + 사후 통계갱신) ───── */
router.post('/complete', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: '잘못된 요청 형식' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const memberIdsToRefresh = new Set();
    let updatedRows = 0;

    const hasRefCols = await detectPointLogSchema(conn);

    for (const id of ids) {
      // 3-1) '요청' → '완료' (이미 완료면 스킵)
      const [upd] = await conn.query(
        `UPDATE deposit_requests
           SET status='완료', completed_at=UTC_TIMESTAMP()
         WHERE id=? AND status='요청'`,
        [id]
      );
      if (!upd.affectedRows) continue;
      updatedRows += upd.affectedRows;

      // 3-2) 멤버/금액 조회(FOR UPDATE)
      const [[dep]] = await conn.query(
        `SELECT member_id, amount FROM deposit_requests WHERE id=?`,
        [id]
      );
      const [[mem]] = await conn.query(
        `SELECT username, point_balance
           FROM members WHERE id=? FOR UPDATE`,
        [dep.member_id]
      );

      const beforePt = Number(mem.point_balance || 0);
      const afterPt  = beforePt + Number(dep.amount || 0);

      // 3-3) 포인트 가산
      await conn.query(
        `UPDATE members SET point_balance=? WHERE id=?`,
        [afterPt, dep.member_id]
      );

      // 3-4) 로그 기록 (스키마에 따라 분기)
      if (hasRefCols) {
        await conn.query(
          `INSERT INTO point_logs
            (member_id, username, before_point, after_point, diff, reason, ref_table, ref_id, created_at)
           VALUES (?, ?, ?, ?, ?, '입금 완료로 포인트 지급', 'deposit_requests', ?, NOW())`,
          [dep.member_id, mem.username, beforePt, afterPt, dep.amount, id]
        );
      } else {
        await conn.query(
          `INSERT INTO point_logs
            (member_id, username, before_point, after_point, diff, reason, created_at)
           VALUES (?, ?, ?, ?, ?, '입금 완료로 포인트 지급', NOW())`,
          [dep.member_id, mem.username, beforePt, afterPt, dep.amount]
        );
      }

      memberIdsToRefresh.add(dep.member_id);
    }

    await conn.commit();

    // 3-5) 커밋 후 통계 갱신(실패해도 완료처리 자체는 성공)
    (async () => {
      try {
        await Promise.all(
          [...memberIdsToRefresh].map((mid) => updateSingleMemberStats(mid))
        );
      } catch (e) {
        console.error('⚠️ 통계 갱신 실패(완료처리는 성공함):', e);
      }
    })();

    res.json({ success: true, updatedRows });
  } catch (e) {
    await conn.rollback();
    console.error('❌ 완료 처리 실패:', e);
    res.status(500).json({ message: '포인트 반영 오류' });
  } finally {
    conn.release();
  }
});

/* ───────── 4. 입금 삭제 + 포인트 복구 (트랜잭션/정합성 + 스키마 호환) ───────── */
router.delete('/:id', async (req, res) => {
  const depositId = req.params.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[dep]] = await conn.query(
      `SELECT member_id, amount, status FROM deposit_requests WHERE id=? FOR UPDATE`,
      [depositId]
    );
    if (!dep) {
      await conn.rollback();
      return res.status(404).json({ message: '존재하지 않는 요청' });
    }

    const [[mem]] = await conn.query(
      `SELECT username, point_balance FROM members WHERE id=? FOR UPDATE`,
      [dep.member_id]
    );

    if (dep.status === '완료') {
      if (Number(mem.point_balance || 0) < Number(dep.amount || 0)) {
        await conn.rollback();
        return res.status(400).json({ message: '포인트 부족으로 삭제 불가' });
      }

      const hasRefCols = await detectPointLogSchema(conn);

      // 관련 로그 삭제 (스키마 호환)
      if (hasRefCols) {
        await conn.query(
          `DELETE FROM point_logs WHERE ref_table='deposit_requests' AND ref_id=?`,
          [depositId]
        );
      } else {
        await conn.query(
          `DELETE FROM point_logs
            WHERE username=? AND diff=? AND reason LIKE '입금 완료로 포인트 지급%'`,
          [mem.username, dep.amount]
        );
      }

      // 포인트 회수
      await conn.query(
        `UPDATE members
            SET point_balance = point_balance - ?
          WHERE id = ?`,
        [dep.amount, dep.member_id]
      );
    }

    // 원 요청 삭제
    await conn.query(`DELETE FROM deposit_requests WHERE id=?`, [depositId]);

    await conn.commit();

    // 사후 통계갱신
    (async () => {
      try {
        await updateSingleMemberStats(dep.member_id);
      } catch (e) {
        console.error('⚠️ 통계 갱신 실패(삭제는 성공함):', e);
      }
    })();

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('❌ 입금 삭제 오류:', err);
    res.status(500).json({ message: '삭제 실패' });
  } finally {
    conn.release();
  }
});

/* ─────────────── 4.5. 입금자명·비고 수정 (원본 유지) ─────────────── */
router.post('/update-memo', async (req, res) => {
  const { id, account_holder, memo } = req.body;
  if (!id) return res.status(400).json({ message: 'ID가 필요합니다.' });
  try {
    await pool.query(
      `UPDATE deposit_requests
          SET account_holder=?, memo=?
        WHERE id=?`,
      [account_holder ?? '', memo ?? '', id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 입금 메모 업데이트 실패:', err);
    res.status(500).json({ message: '업데이트 실패' });
  }
});

/* ─────────────── 5. 엑셀 다운로드 (필터 동기화/원본 유지) ─────────────── */
router.get('/export', async (req, res) => {
  let { username, status, startDate, endDate } = req.query;
  const cond = [], params = [];
  if (username) cond.push('m.username = ?'), params.push(username);
  if (status)   cond.push('d.status   = ?'), params.push(status);
  if (startDate && endDate) {
    cond.push('DATE(CONVERT_TZ(d.created_at,"+00:00","+09:00")) BETWEEN ? AND ?');
    params.push(startDate, endDate);
  } else if (startDate) {
    cond.push('DATE(CONVERT_TZ(d.created_at,"+00:00","+09:00")) >= ?');
    params.push(startDate);
  } else if (endDate) {
    cond.push('DATE(CONVERT_TZ(d.created_at,"+00:00","+09:00")) <= ?');
    params.push(endDate);
  }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';

  const sql = `
    SELECT d.id,
           m.username,
           m.name,
           d.status,
           d.account_holder,
           d.amount,
           DATE_FORMAT(CONVERT_TZ(d.created_at ,'+00:00','+09:00'), '%Y-%m-%d %H:%i:%s') AS created_at,
           DATE_FORMAT(CONVERT_TZ(d.completed_at,'+00:00','+09:00'), '%Y-%m-%d %H:%i:%s') AS completed_at,
           d.memo
    FROM deposit_requests d
    LEFT JOIN members m ON d.member_id = m.id
    ${where}
    ORDER BY d.created_at DESC
  `;
  try {
    const [rows] = await pool.query(sql, params);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('입금내역');
    ws.columns = [
      { header: '번호',       key: 'id',            width: 8  },
      { header: '아이디',     key: 'username',      width: 15 },
      { header: '이름',       key: 'name',          width: 15 },
      { header: '상태',       key: 'status',        width: 10 },
      { header: '입금자명',   key: 'account_holder',width: 15 },
      { header: '금액',       key: 'amount',        width: 12 },
      { header: '등록일',     key: 'created_at',    width: 20 },
      { header: '완료일',     key: 'completed_at',  width: 20 },
      { header: '비고',       key: 'memo',          width: 20 },
    ];
    rows.forEach(r => ws.addRow(r));
    res.setHeader('Content-Disposition', `attachment; filename=deposits_${Date.now()}.xlsx`);
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ 엑셀 생성 오류:', err);
    res.status(500).json({ message: '엑셀 생성 실패' });
  }
});

module.exports = router;
