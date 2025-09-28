// ✅ 파일 경로: backend/scripts/fixRecommendLineage.cjs
'use strict';

const pool = require('../db.cjs');

/**
 * 전체 회원의 rec_1_id ~ rec_{limitDepth}_id + sponsor_path 갱신
 * - rec_x: 추천 계보 (1~15대까지 저장, 기본 깊이 5)
 * - sponsor_path: 후원 계보 (|조상1|조상2|...|본인| 형식, 자기 자신 포함)
 * - 메모리 맵으로 추적하여 DB 왕복 최소화
 * - 사이클(순환추천/후원) 가드
 */
async function updateAllRecommendLineage(limitDepth = 15, chunkSize = 1000) {
  const conn = await pool.getConnection();
  try {
    // 1) 전체 맵 로드
    const [rows] = await conn.query(
      'SELECT id, recommender_id, sponsor_id FROM members WHERE COALESCE(is_admin,0)=0'
    );
    const recParent  = new Map(rows.map(r => [r.id, r.recommender_id || null]));
    const sponParent = new Map(rows.map(r => [r.id, r.sponsor_id     || null]));

    // 2) 트랜잭션 시작
    await conn.beginTransaction();

    let batch = [];
    for (const { id } of rows) {
      /* ---------- 추천 rec_1_id ~ rec_N_id ---------- */
      const recLine = [];
      const seenRec = new Set([id]);
      let curRec = recParent.get(id) || null;

      for (let d = 0; d < limitDepth && curRec; d++) {
        if (seenRec.has(curRec)) {
          console.warn(`⚠️ [REC] cycle detected: member ${id} -> ${curRec}`);
          break;
        }
        recLine.push(curRec);
        seenRec.add(curRec);
        curRec = recParent.get(curRec) || null;
      }

      const recFields = Array
        .from({ length: limitDepth }, (_, i) => `rec_${i + 1}_id = ${recLine[i] ?? 'NULL'}`)
        .join(', ');

      /* ---------- 후원 sponsor_path (자기 자신 포함) ---------- */
      const seenSpon = new Set([id]);
      const chain = [];
      let curSpon = sponParent.get(id) || null;
      while (curSpon && sponParent.has(curSpon)) {
        if (seenSpon.has(curSpon)) {
          console.warn(`⚠️ [SPON] cycle detected: member ${id} -> ${curSpon}`);
          break;
        }
        chain.unshift(curSpon);
        seenSpon.add(curSpon);
        curSpon = sponParent.get(curSpon) || null;
      }
      chain.push(id); // 자기 자신 포함
      const sPath = '|' + chain.join('|') + '|';

      /* ---------- UPDATE ---------- */
      batch.push({
        id,
        sql: `UPDATE members SET ${recFields}, sponsor_path=? WHERE id=?`,
        params: [sPath, id]
      });

      // 청크 단위 실행
      if (batch.length >= chunkSize) {
        for (const q of batch) {
          await conn.query(q.sql, q.params);
        }
        batch = [];
      }
    }

    // 잔여 실행
    for (const q of batch) {
      await conn.query(q.sql, q.params);
    }

    await conn.commit();
    console.log(`✅ rec_1~rec_${limitDepth} + sponsor_path 갱신 완료 (members: ${rows.length})`);
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error('❌ 계보 갱신 실패:', e);
    throw e;
  } finally {
    conn.release();
  }
}

// 단독 실행 지원
if (require.main === module) {
  updateAllRecommendLineage().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { updateAllRecommendLineage };
