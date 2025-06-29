// ✅ 파일 위치: backend/routes/adminMembers.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const bcrypt = require('bcrypt');

// 추천인 계보 재계산 함수 (PK 기반)
async function getRecommenderLineage(recommenderId) {
  const lineage = [];
  let current = recommenderId;
  while (current && lineage.length < 15) {
    const [rows] = await pool.query(
      'SELECT recommender_id FROM members WHERE id = ?',
      [current]
    );
    if (rows.length === 0) break;
    lineage.push(current);
    current = rows[0].recommender_id;
  }
  while (lineage.length < 15) lineage.push(null);
  return lineage;
}

// ✅ 회원 목록 조회 (센터명 필터까지 완벽 지원!)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      username,
      name,
      recommender,
      center,     // 🔥 센터명 필터 (문자)
      date
    } = req.query;
    const offset = (page - 1) * limit;

    const where = [];
    const values = [];

    if (username)    { where.push('m.username LIKE ?');      values.push(`%${username}%`); }
    if (name)        { where.push('m.name LIKE ?');          values.push(`%${name}%`);     }
    if (center)      { where.push('c.center_name LIKE ?');   values.push(`%${center}%`);   } // 🔥 센터명 필터!
    if (date)        { where.push('DATE(m.created_at) = ?'); values.push(date);            }

    // 추천인 username(문자)로 검색 지원
    if (recommender) {
      const [[rec]] = await pool.query(
        'SELECT id FROM members WHERE username = ? LIMIT 1', [recommender]
      );
      if (rec?.id) {
        where.push('m.recommender_id = ?');
        values.push(rec.id);
      } else {
        where.push('m.recommender_id = 0'); // 절대 나올 수 없는 id
      }
    }

    // 관리자 제외
    where.push('m.is_admin = 0');
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // centers 테이블 반드시 LEFT JOIN! (center_name 검색을 위함)
    const countSql = `
      SELECT COUNT(*) as total
      FROM members m
      LEFT JOIN centers c ON m.center_id = c.id
      ${whereClause}
    `;
    const [countRes] = await pool.query(countSql, values);
    const total = countRes[0].total;

    const dataSql = `
      SELECT
        m.id, m.username, m.name, m.phone, m.center_id, m.recommender_id,
        m.bank_name, m.account_holder, m.account_number, m.created_at,
        rec.username AS recommender_username, rec.name AS recommender_name,
        c.center_name,
        m.is_withdraw_blocked,
        m.is_reward_blocked
      FROM members m
      LEFT JOIN members rec ON m.recommender_id = rec.id
      LEFT JOIN centers c ON m.center_id = c.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(
      dataSql,
      [...values, parseInt(limit), parseInt(offset)]
    );

    res.json({ data: rows, total });
  } catch (err) {
    console.error('회원 목록 조회 실패:', err);
    res.status(500).json({ error: '회원 목록 조회 실패' });
  }
});

// ✅ 추천인 변경 & 계보 재설정 (PK 기반)
router.post('/recommender', async (req, res) => {
  try {
    const { member_id, new_recommender_id } = req.body;
    if (!member_id || !new_recommender_id) {
      return res.status(400).json({ success: false, message: '필수값 누락' });
    }

    const [check] = await pool.query(
      'SELECT id FROM members WHERE id = ?',
      [new_recommender_id]
    );
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: '신규 추천인이 존재하지 않습니다' });
    }

    const lineage = await getRecommenderLineage(new_recommender_id);
    const [
      rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
      rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
      rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id
    ] = lineage;

    const sql = `
      UPDATE members SET
        recommender_id = ?,
        rec_1_id = ?, rec_2_id = ?, rec_3_id = ?, rec_4_id = ?, rec_5_id = ?,
        rec_6_id = ?, rec_7_id = ?, rec_8_id = ?, rec_9_id = ?, rec_10_id = ?,
        rec_11_id = ?, rec_12_id = ?, rec_13_id = ?, rec_14_id = ?, rec_15_id = ?
      WHERE id = ?
    `;
    const values = [
      new_recommender_id,
      rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
      rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
      rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id,
      member_id
    ];
    await pool.query(sql, values);

    res.json({ success: true, message: '추천인 변경 및 계보 재설정 완료' });
  } catch (err) {
    console.error('추천인 변경 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류', error: err });
  }
});

// ✅ 회원 정보 수정 (id 기준)
router.put('/:id', async (req, res) => {
  const {
    name, phone, center_id, recommender_id,
    bank_name, account_holder, account_number, password,
    is_withdraw_blocked,
    is_reward_blocked
  } = req.body;
  const { id } = req.params;

  try {
    const fields = [];
    const values = [];
    if (name)           { fields.push('name = ?');           values.push(name);           }
    if (phone)          { fields.push('phone = ?');          values.push(phone);          }
    if (center_id)      { fields.push('center_id = ?');      values.push(center_id);      }
    if (recommender_id) { fields.push('recommender_id = ?'); values.push(recommender_id);}
    if (bank_name)      { fields.push('bank_name = ?');      values.push(bank_name);      }
    if (account_holder) { fields.push('account_holder = ?'); values.push(account_holder); }
    if (account_number) { fields.push('account_number = ?'); values.push(account_number); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push('password = ?');
      values.push(hashed);
    }
    if (typeof is_withdraw_blocked !== 'undefined') {
      fields.push('is_withdraw_blocked = ?');
      values.push(is_withdraw_blocked ? 1 : 0);
    }
    if (typeof is_reward_blocked !== 'undefined') {
      fields.push('is_reward_blocked = ?');
      values.push(is_reward_blocked ? 1 : 0);
    }
    if (!fields.length) {
      return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    }

    const sql = `UPDATE members SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    await pool.query(sql, values);
    res.json({ success: true });
  } catch (err) {
    console.error('회원 수정 실패:', err);
    res.status(500).json({ error: '회원 수정 실패' });
  }
});

// ✅ 회원 삭제 (추천/입금/구매 이력 체크)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[member]] = await pool.query(
      'SELECT id, username FROM members WHERE id = ?',
      [id]
    );
    if (!member) {
      return res.status(404).json({ success: false, message: '회원이 존재하지 않습니다' });
    }

    const [[refCount]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM members WHERE recommender_id = ?`,
      [id]
    );
    if (refCount.cnt > 0) {
      return res.status(400).json({
        success: false,
        message: '삭제 불가: 하위 추천 회원이 존재합니다'
      });
    }

    const [[depCount]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM deposits WHERE member_id = ?',
      [id]
    );
    if (depCount.cnt > 0) {
      return res.status(400).json({
        success: false,
        message: '삭제 불가: 입금 내역이 존재합니다'
      });
    }

    const [[purCount]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM purchase_history WHERE member_id = ?',
      [id]
    );
    if (purCount.cnt > 0) {
      return res.status(400).json({
        success: false,
        message: '삭제 불가: 상품 구매 내역이 존재합니다'
      });
    }

    const [delResult] = await pool.query(
      'DELETE FROM members WHERE id = ?',
      [id]
    );
    if (delResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '회원이 존재하지 않습니다' });
    }

    res.json({ success: true, message: '삭제되었습니다' });
  } catch (err) {
    console.error('회원 삭제 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;
