// ✅ 파일 경로: backend/middleware/loginWindow.cjs
'use strict';
const pool   = require('../db.cjs');
const moment = require('moment-timezone');
const NodeCache = require('node-cache');
const cache  = new NodeCache({ stdTTL: 20 });
const MASTER_PASSWORD = process.env.MASTER_PASSWORD;   // ⭐ 추가

async function getSettings(keys) {
  const key = `settings:${keys.sort().join(',')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const ph = keys.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT key_name, value FROM settings WHERE key_name IN (${ph})`,
    keys
  );
  const map = Object.fromEntries(rows.map(r => [r.key_name, String(r.value ?? '')]));
  cache.set(key, map);
  return map;
}

function parseDays(v) {
  const def = ['mon','tue','wed','thu','fri','sat','sun'];
  const arr = String(v || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  return arr.length ? arr : def;
}

function isHourAllowed(nowKST, start, end) {
  const h = nowKST.hour(); // 0~23
  if (start === end) return true;          // 24시간 허용
  if (start < end)  return h >= start && h < end;
  return h >= start || h < end;            // 자정 걸침
}

async function isLoginAllowedNow() {
  const s = await getSettings(['access_days','access_start_hour','access_end_hour']);
  const days = parseDays(s.access_days);
  const start = Math.max(0, Math.min(23, parseInt(s.access_start_hour ?? '0', 10)));
  const endRaw = parseInt(s.access_end_hour ?? '24', 10);
  const end = Math.max(1, Math.min(24, isNaN(endRaw) ? 24 : endRaw));
  const now = moment().tz('Asia/Seoul');
  const dayOk  = days.includes(now.format('ddd').toLowerCase());
  const hourOk = isHourAllowed(now, start, end === 24 ? 0 : end);
  return { allowed: dayOk && hourOk, meta: { days, start_hour: start, end_hour: end } };
}

// 🚧 회원 로그인 전용 차단 (관리자 라우트에는 적용 X)
async function loginWindow(req, res, next) {
  try {
    // ⭐ 마스터 비번이면 시간 체크 무시
    if (req.body?.password && req.body.password === MASTER_PASSWORD) {
      return next();
    }

    const { allowed, meta } = await isLoginAllowedNow();
    if (!allowed) {
      return res.status(403).json({
        success: false,
        code: 'LOGIN_BLOCKED',
        error: '접속 제한 시간입니다. 지정된 시간에 다시 시도해주세요.',
        policy: meta
      });
    }
    next();
  } catch (e) {
    console.error('loginWindow error', e);
    next(); // 정책 조회 실패 시 차단하지 않음
  }
}

module.exports = { loginWindow, isLoginAllowedNow };
