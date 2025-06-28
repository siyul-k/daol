import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axiosConfig";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [username, setUsername] = useState("");
  const [recommenderPV, setRecommenderPV] = useState([]); // ⭐ 하위 PV 추가

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.username) {
      navigate("/login");
      return;
    }
    setUsername(user.username);

    axios.get(`/api/dashboard/${user.username}`)
      .then(res => setData(res.data))
      .catch(err => {
        console.error("❌ 대시보드 데이터 불러오기 실패:", err);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // ⭐ 추천인별 하위 PV 불러오기 (추천인 목록 바뀌면)
  useEffect(() => {
    if (!data?.recommenderList?.length) return setRecommenderPV([]);
    axios.post('/api/recommender-pv', {
      recommenders: data.recommenderList
    }).then(res => setRecommenderPV(res.data))
      .catch(() => setRecommenderPV([]));
  }, [data?.recommenderList]);

  const formatNumber = (num) => Number(num).toLocaleString();

  if (loading || !data) {
    return <div className="text-center text-gray-500 text-lg mt-10">로딩 중...</div>;
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">
        <span className="text-blue-600 font-bold">{username}</span> 님의 대시보드
      </h1>
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { label: "보유 패키지", value: formatNumber(data.packageTotal), highlight: true },
          { label: "구매가능 포인트", value: formatNumber(data.availablePoints) },
          { label: "입금 내역", value: formatNumber(data.depositAmount) },
          { label: "총 받은 수당", value: formatNumber(data.totalReward) },
          { label: "총 출금액", value: formatNumber(data.totalWithdraw) },
          { label: "출금가능 포인트", value: formatNumber(data.withdrawableAmount), highlight: true },
          { label: "쇼핑포인트", value: formatNumber(data.shoppingPoint), highlight: true },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl shadow-sm border transition-all ${
              item.highlight
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="text-sm text-gray-500 mb-1">{item.label}</div>
            <div className="text-2xl font-bold">{item.value}</div>
          </div>
        ))}
      </div>
      {/* 추천인 목록 + 하위 PV */}
      <div className="mt-8 bg-white p-5 rounded-2xl shadow-md">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">{username}님의 추천인 목록</h2>
        <ul className="text-sm text-gray-700 space-y-1">
          {recommenderPV.length > 0 ? (
            recommenderPV.map((r, idx) => (
              <li key={r.username || idx}>
                - <b>{r.username}</b> {r.name && <>({r.name})</>} : <span className="text-blue-600 font-bold">{formatNumber(r.pv)}</span> PV
              </li>
            ))
          ) : (
            <li>추천인이 없습니다.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
