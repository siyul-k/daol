// ✅ 파일 경로: src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../axiosConfig";
import LimitProgress from "../components/LimitProgress";
import { User, Gift, Coins, Wallet, ArrowDownCircle, ArrowUpRight, Package, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [percent, setPercent] = useState(0);
  const [limit, setLimit] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [recommenderPV, setRecommenderPV] = useState([]);
  const [user, setUser] = useState(null);
  const [latestNotice, setLatestNotice] = useState(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user"));
    if (!u?.username) {
      navigate("/login");
      return;
    }
    setUser(u);

    Promise.all([
      axios.get(`/api/dashboard/${u.username}`),
      axios.get(`/api/rewards?username=${u.username}`),
      axios.get(`/api/reward-limit?username=${u.username}`),
      axios.get("/api/notices?limit=1")
    ])
      .then(([dashboardRes, rewardsRes, limitRes, noticeRes]) => {
        setData(dashboardRes.data);
        setRewards(rewardsRes.data || []);
        setLimit(limitRes.data.limit || 0);
        if (Array.isArray(noticeRes.data) && noticeRes.data.length > 0) {
          setLatestNotice(noticeRes.data[0]);
        }
      })
      .catch(err => console.error("❌ 데이터 불러오기 실패:", err))
      .finally(() => setLoading(false));
  }, [navigate]);

  // 추천인별 하위 PV
  useEffect(() => {
  if (!data?.recommenderList?.length) return setRecommenderPV([]);
  // 기존에는 하위 전체 PV를 계산했는데 → 이제는 개별 회원 PV만 조회
  axios.post('/api/recommender-pv', { recommenders: data.recommenderList, selfOnly: true })
    .then(res => setRecommenderPV(res.data))
    .catch(() => setRecommenderPV([]));
}, [data?.recommenderList]);

  // ✅ 진행률 계산
  useEffect(() => {
    if (limit > 0 && rewards.length > 0) {
      const received = rewards
        .filter(r => r.type !== "center" && r.type !== "center_recommend")
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const p = Math.min((received / limit) * 100, 100);
      setPercent(Number(p.toFixed(2)));
    }
  }, [limit, rewards]);

  const formatNumber = (num) => Number(num).toLocaleString();

  if (loading || !data) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 text-lg mt-10">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* 제목 */}
      <h2 className="text-2xl font-bold text-center mb-2">
        {user?.username}님의 대시보드
      </h2>

      {/* 수당 한도 그래프 */}
      <div
        className="
          rounded-2xl p-6 flex justify-center 
          bg-gray-100 shadow-[8px_8px_16px_#cfd4dc,-8px_-8px_16px_#ffffff]
          dark:bg-transparent dark:border dark:border-white/10 dark:shadow-none
        "
      >
        <LimitProgress percent={percent} size={288} />
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <Card
          icon={<Package className="size-6" />}
          title="보유 패키지"
          value={formatNumber(data.packageTotal)}
          link="/product-history"
          gradient="from-blue-400 to-indigo-500"
        />
        <Card
          icon={<Wallet className="size-6" />}
          title="구매가능 포인트"
          value={formatNumber(data.availablePoints)}
          link="/product"
          gradient="from-green-400 to-lime-500"
        />
        <Card
          icon={<ArrowDownCircle className="size-6" />}
          title="입금내역"
          value={formatNumber(data.depositAmount)}
          link="/deposit-history"
          gradient="from-pink-400 to-purple-500"
        />
        <Card
          icon={<Gift className="size-6" />}
          title="총 받은 포인트"
          value={formatNumber(data.totalReward)}
          link="/point"
          gradient="from-orange-400 to-yellow-500"
        />
        <Card
          icon={<ArrowUpRight className="size-6" />}
          title="총 출금 포인트"
          value={formatNumber(data.totalWithdraw)}
          link="/withdraw-history"
          gradient="from-sky-400 to-blue-500"
        />
        <Card
          icon={<Coins className="size-6" />}
          title="출금가능 포인트"
          value={formatNumber(data.withdrawableAmount)}
          link="/withdraw"
          gradient="from-purple-400 to-pink-500"
        />
        <Card
          icon={<Coins className="size-6" />}
          title="쇼핑포인트"
          value={formatNumber(data.shoppingPoint)}
          gradient="from-cyan-400 to-teal-500"
        />
      </div>

      {/* 추천인 목록 */}
<div
  className="
    relative rounded-2xl p-4 
    bg-gray-100 shadow-[6px_6px_12px_#cfd4dc,-6px_-6px_12px_#ffffff] 
    dark:bg-white/5 dark:border dark:border-white/10 dark:shadow-none
  "
>
  <h2 className="text-lg font-semibold mb-3">추천인 목록</h2>
  <ul className="space-y-3">
    {recommenderPV.length > 0 ? (
      recommenderPV.map((r, idx) => (
        <li key={idx} className="flex items-center gap-3">
          {/* ✅ 원형 배경 안의 User 아이콘 */}
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400">
            <User className="w-4 h-4 text-white" />
          </div>
          {/* ✅ 추천인 아이디/이름 글씨 키움 */}
          <span className="text-lg">
            <b>{r.username}</b> {r.name && <>({r.name})</>} :{" "}
            <span className="text-blue-600 font-bold">
              {formatNumber(r.pv)}
            </span> PV
          </span>
        </li>
      ))
    ) : (
      <li>추천인이 없습니다.</li>
    )}
  </ul>

  {/* 조직도 이동 아이콘 */}
  <Link
    to="/tree/recommend"
    className="absolute bottom-3 right-3 text-blue-500 hover:text-blue-400"
  >
    <ArrowRight className="size-5" />
  </Link>
</div>

      {/* 최신 공지 */}
      {latestNotice && (
        <div
          className="
            rounded-2xl p-4 
            bg-gray-100 shadow-[6px_6px_12px_#cfd4dc,-6px_-6px_12px_#ffffff] 
            dark:bg-white/5 dark:border dark:border-white/10 dark:shadow-none
          "
        >
          <h2 className="text-lg font-semibold mb-2">📢 공지사항</h2>
          <h3 className="font-bold text-blue-400">{latestNotice.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line line-clamp-3">
            {latestNotice.content}
          </p>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-400">
              {new Date(latestNotice.created_at).toLocaleString()}
            </p>
            <Link
              to="/notices"
              className="text-sm font-semibold text-blue-500 hover:text-blue-400"
            >
              공지사항 더보기 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ icon, title, value, link, gradient }) {
  return (
    <div
      className="
        relative rounded-2xl p-4 flex flex-col justify-between 
        bg-gray-100 shadow-[6px_6px_12px_#cfd4dc,-6px_-6px_12px_#ffffff] 
        dark:bg-transparent dark:border dark:border-green-700 dark:text-green-300 dark:shadow-none
      "
    >
      <div className="flex items-center gap-3">
        {/* ✅ 라이트 모드: 알록달록 그라데이션 / 다크 모드: 흰색 아이콘 */}
        <div
          className={`
            p-2 rounded-lg border border-white/10
            text-white 
            bg-gradient-to-br ${gradient} 
            dark:bg-white/10 dark:text-white
          `}
        >
          {icon}
        </div>
        <div className="text-sm text-gray-600 dark:text-green-300">{title}</div>
      </div>
      <div className="mt-3 text-2xl font-extrabold text-gray-900 dark:text-green-300">
        {value}
      </div>
      {link && (
        <Link
          to={link}
          className="absolute bottom-2 right-2 text-gray-500 dark:text-green-300 hover:text-green-400"
        >
          <ArrowRight className="size-5" />
        </Link>
      )}
    </div>
  );
}