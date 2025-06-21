// ✅ 파일 위치: backend/routes/adminMembers.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
const bcrypt = require('bcrypt');

// ✅ 추천인 계보 재계산 함수
async function getRecommenderLineage(recommenderId) {
  const lineage = [];
  let current = recommenderId;
  while (current && lineage.length < 15) {
    const [rows] = await connection.promise().query(
      'SELECT recommender FROM members WHERE username = ?',
      [current]
    );
    if (rows.length === 0) break;
    lineage.push(current);
    current = rows[0].recommender;
  }
  while (lineage.length < 15) lineage.push(null);
  return lineage;
}

// ✅ 회원 목록 조회
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, username, name, recommender, center, date } = req.query;
    const offset = (page - 1) * limit;

    const where = [];
    const values = [];

    if (username)    { where.push('username LIKE ?');      values.push(`%${username}%`); }
    if (name)        { where.push('name LIKE ?');          values.push(`%${name}%`);     }
    if (recommender) { where.push('recommender LIKE ?');   values.push(`%${recommender}%`);}
    if (center)      { where.push('center = ?');           values.push(center);           }
    if (date)        { where.push('DATE(created_at) = ?'); values.push(date);             }

    // ✅ 관리자 제외 조건 추가
    where.push('is_admin = 0');
    const whereClause = `WHERE ${where.join(' AND ')}`;

    const countSql    = `SELECT COUNT(*) as total FROM members ${whereClause}`;
    const [countRes]  = await connection.promise().query(countSql, values);
    const total       = countRes[0].total;

    const dataSql = `
      SELECT
        id, username, name, phone, center, recommender, sponsor,
        bank_name, account_holder, account_number, created_at
      FROM members
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await connection.promise().query(
      dataSql,
      [...values, parseInt(limit), parseInt(offset)]
    );

    res.json({ data: rows, total });
  } catch (err) {
    console.error('❌ 회원 목록 조회 실패:', err);
    res.status(500).json({ error: '회원 목록 조회 실패' });
  }
});


// ✅ 추천인 변경 & 계보 재설정
router.post('/recommender', async (req, res) => {
  try {
    const { username, newRecommender } = req.body;
    if (!username || !newRecommender) {
      return res.status(400).json({ success: false, message: '필수값 누락' });
    }

    const [check] = await connection.promise().query(
      'SELECT username FROM members WHERE username = ?',
      [newRecommender]
    );
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: '신규 추천인이 존재하지 않습니다' });
    }

    const lineage = await getRecommenderLineage(newRecommender);
    const [
      rec_1, rec_2, rec_3, rec_4, rec_5,
      rec_6, rec_7, rec_8, rec_9, rec_10,
      rec_11, rec_12, rec_13, rec_14, rec_15
    ] = lineage;

    const sql = `
      UPDATE members SET
        recommender = ?,
        rec_1 = ?, rec_2 = ?, rec_3 = ?, rec_4 = ?, rec_5 = ?,
        rec_6 = ?, rec_7 = ?, rec_8 = ?, rec_9 = ?, rec_10 = ?,
        rec_11 = ?, rec_12 = ?, rec_13 = ?, rec_14 = ?, rec_15 = ?
      WHERE username = ?
    `;
    const values = [
      newRecommender,
      rec_1, rec_2, rec_3, rec_4, rec_5,
      rec_6, rec_7, rec_8, rec_9, rec_10,
      rec_11, rec_12, rec_13, rec_14, rec_15,
      username
    ];
    await connection.promise().query(sql, values);

    res.json({ success: true, message: '추천인 변경 및 계보 재설정 완료' });
  } catch (err) {
    console.error('❌ 추천인 변경 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류', error: err });
  }
});

// ✅ 회원 정보 수정
router.put('/:id', async (req, res) => {
  const { name, phone, center, recommender, bank_name, account_holder, account_number, password } = req.body;
  const { id } = req.params;

  try {
    const fields = [];
    const values = [];
    if (name)           { fields.push('name = ?');           values.push(name);           }
    if (phone)          { fields.push('phone = ?');          values.push(phone);          }
    if (center)         { fields.push('center = ?');         values.push(center);         }
    if (recommender)    { fields.push('recommender = ?');    values.push(recommender);    }
    if (bank_name)      { fields.push('bank_name = ?');      values.push(bank_name);      }
    if (account_holder) { fields.push('account_holder = ?'); values.push(account_holder); }
    if (account_number) { fields.push('account_number = ?'); values.push(account_number); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push('password = ?');
      values.push(hashed);
    }
    if (!fields.length) {
      return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    }

    const sql = `UPDATE members SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    connection.query(sql, values, err => {
      if (err) {
        console.error('❌ 회원 수정 실패:', err);
        return res.status(500).json({ error: '회원 수정 실패' });
      }
      res.json({ success: true });
    });
  } catch (err) {
    console.error('❌ 서버 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ✅ 회원 삭제 (하위 회원, 입금 및 구매 이력 체크)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1) 삭제 대상 회원의 username 조회
    const [[member]] = await connection.promise().query(
      'SELECT username FROM members WHERE id = ?',
      [id]
    );
    if (!member) {
      return res.status(404).json({ success: false, message: '회원이 존재하지 않습니다' });
    }
    const username = member.username;

    // 2) 하위 추천·후원 회원 존재 여부 확인
    const [[refCount]] = await connection.promise().query(
      `SELECT
         SUM(CASE WHEN recommender = ? THEN 1 ELSE 0 END)
       + SUM(CASE WHEN sponsor     = ? THEN 1 ELSE 0 END)
       AS cnt
       FROM members`,
      [username, username]
    );
    if (refCount.cnt > 0) {
      return res.status(400).json({
        success: false,
        message: '삭제 불가: 하위 추천/후원 회원이 존재합니다'
      });
    }

    // 3) 입금 내역 존재 여부 확인 (deposits 테이블)
    const [[depCount]] = await connection.promise().query(
      'SELECT COUNT(*) AS cnt FROM deposits WHERE member_id = ?',
      [id]
    );
    if (depCount.cnt > 0) {
      return res.status(400).json({
        success: false,
        message: '삭제 불가: 입금 내역이 존재합니다'
      });
    }

    // 4) 상품 구매 내역 존재 여부 확인 (purchase_history 테이블)
    const [[purCount]] = await connection.promise().query(
      'SELECT COUNT(*) AS cnt FROM purchase_history WHERE member_id = ?',
      [id]
    );
    if (purCount.cnt > 0) {
      return res.status(400).json({
        success: false,
        message: '삭제 불가: 상품 구매 내역이 존재합니다'
      });
    }

    // 5) 모든 체크 통과 시 실제 삭제
    const [delResult] = await connection.promise().query(
      'DELETE FROM members WHERE id = ?',
      [id]
    );
    if (delResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '회원이 존재하지 않습니다' });
    }

    res.json({ success: true, message: '삭제되었습니다' });
  } catch (err) {
    console.error('❌ 회원 삭제 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;