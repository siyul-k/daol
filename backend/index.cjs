// ✅ 파일 경로: backend/index.cjs
const express = require('express');
const cors = require('cors');
const connection = require('./db.cjs');

const app = express();
const port = process.env.PORT || 3001;

// ✅ CORS 설정 (프론트엔드 도메인 명시)
const corsOptions = {
  origin: [
    "https://daol-xi.vercel.app",
    "https://daol-git-main-siyul-ks-projects.vercel.app",
    "https://daol-8pnooti3a-siyul-ks-projects.app",
    "http://localhost:3000",    // 개발용
    "http://localhost:5173",     // Vite 개발용
    "https://daol.world",       // 추가
    "https://www.daol.world"    // 추가
  ],
  credentials: true,
};


app.use(cors(corsOptions));
app.use(express.json());

// ✅ 관리자 포인트 보정 라우터
app.use('/api/points', require('./routes/pointAdjust.cjs'));

// ✅ 관리자용 설정
app.use('/api/reward-config',      require('./routes/rewardConfig.cjs'));

// ✅ 관리자용 라우터
app.use('/api/updateRecommender', require('./routes/updateRecommender.cjs'));
app.use('/api/ad-da/rewards',          require('./routes/adminRewards.cjs'));
app.use('/api/ad-da/notices',          require('./routes/adminNotices.cjs'));
app.use('/api/ad-da/members/export',   require('./routes/adminExport.cjs'));
app.use('/api/ad-da/members/stats',    require('./routes/adminMemberStats.cjs'));
app.use('/api/ad-da/members',          require('./routes/adminMembers.cjs'));
app.use('/api/ad-da/deposits/export',  require('./routes/depositExport.cjs'));
app.use('/api/ad-da/deposits',         require('./routes/adminDeposits.cjs'));
app.use('/api/ad-da/withdraws',        require('./routes/adminWithdraws.cjs'));
app.use('/api/withdraw/check',         require('./routes/withdrawCheck.cjs'));
//app.use('/api/ad-da/bcode',            require('./routes/adminBcode.cjs'));
app.use('/api/ad-da/centers',          require('./routes/adminCenters.cjs'));
app.use('/api/ad-da/settings',         require('./routes/adminSettings.cjs'));
app.use('/api/ad-da/settings/admins',  require('./routes/adminAdmins.cjs'));

// ✅ 조직도 API
app.use('/api/tree',                   require('./routes/tree.cjs'));


// ✅ 환경설정 API
app.use('/api/settings',               require('./routes/settings.cjs'));

// ✅ 인증/회원 관련
app.use('/api/signup',                 require('./routes/signup.cjs'));
app.use('/api/login',                  require('./routes/login.cjs'));
app.use('/api/admin-login',            require('./routes/admin-Login.cjs'));
app.use('/api/check-user',             require('./routes/check-user.cjs'));
app.use('/api/members',                require('./routes/members.cjs'));
app.use('/api/members/sponsor-pv',     require('./routes/sponsorPv.cjs'));  // ✅ 추가된 라우터

// ✅ Lookup API
app.use('/api/lookup',                 require('./routes/lookup.cjs'));
app.use('/api/reward-limit', require('./routes/rewardLimitApi.cjs'));


// ✅ 입출금 요청
app.use('/api/deposit',                require('./routes/deposit.cjs'));
app.use('/api/withdraw',               require('./routes/withdraw.cjs'));
app.use('/api/withdraw/available',     require('./routes/withdrawAvailable.cjs'));

// ✅ 사용자 대시보드용 통계
// ✅ 대시보드 통계 API (한 번에 통계 집계)
app.use('/api/dashboard', require('./routes/dashboard.cjs'));
app.use('/api/sponsor-pv', require('./routes/sponsorPv.cjs'));
app.use('/api/recommender-pv', require('./routes/recommenderPV.cjs'));
app.use('/api/shopping-point', require('./routes/shoppingPoint.cjs'));
app.use('/api/withdraw-total',         require('./routes/withdrawStats.cjs'));
app.use('/api/withdrawable-points',    require('./routes/withdrawablePoints.cjs'));
app.use('/api/rewards-total',          require('./routes/rewardsTotal.cjs'));
app.use('/api/purchase-points',        require('./routes/purchasePoints.cjs'));
app.use('/api/members/rank',           require('./routes/rank.cjs'));
app.use('/api/members/referrals',      require('./routes/referrals.cjs'));
app.use('/api/deposit-total',          require('./routes/depositTotal.cjs'));



// ✅ 공지사항 (회원용)
app.use('/api/rewards',                require('./routes/rewards.cjs'));
app.use('/api/notices',                require('./routes/publicNotices.cjs'));

// ✅ 상품 관련
app.use('/api/ad-da/products',         require('./routes/adminProducts.cjs'));
app.use('/api/ad-da/code-give',        require('./routes/adminCodeGive.cjs'));
app.use('/api/product',                require('./routes/product.cjs'));
app.use('/api/purchase',               require('./routes/productPurchase.cjs'));
app.use('/api/purchase-history',       require('./routes/purchase-history.cjs'));
app.use('/api/packages',               require('./routes/packages.cjs'));

// ✅ 서버 실행
app.listen(port, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${port}`);
});

// ✅ DB 연결
//connection.connect(err => {
 // if (err) console.error('❌ MySQL 연결 실패:', err);
 // else console.log('✅ MySQL 연결 성공!');
//});

// ✅ 통합 스케줄러 실행
require('./schedulers/rewardScheduler.cjs');

// ✅ 데일리 수당 스케줄러 실행
//require('./jobs/dailyRewardJob.cjs');
