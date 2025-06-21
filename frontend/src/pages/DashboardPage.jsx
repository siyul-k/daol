// ✅ 파일 경로: frontend/src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axiosConfig";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.username) {
      navigate("/login");
      return;
    }

    setUsername(user.username); // ✅ 사용자명 저장

    const fetchData = async () => {
      try {
        const [
          depositRes,
          rewardRes,
          withdrawRes,
          withdrawAvailableRes,
          rankRes,
          referralRes,
          depositTotalRes,
        ] = await Promise.all([
          axios.get(`/api/purchase-points/${user.username}`),
          axios.get(`/api/rewards-total/${user.username}`),
          axios.get(`/api/withdraw-total/${user.username}`),
          axios.get(`/api/withdraw/available?username=${user.username}`),
          axios.get(`/api/members/rank/${user.username}`),
          axios.get(`/api/members/referrals/${user.username}`),
          axios.get(`/api/deposit-total/${user.username}`),
        ]);

        setData({
          rank: rankRes.data.rank || "-",
          availablePoints: depositRes.data.available_point || 0,
          depositAmount: depositTotalRes.data.total_deposit || 0,
          totalReward: rewardRes.data.total_reward || 0,
          totalWithdraw: withdrawRes.data.total_withdraw || 0,
          withdrawableAmount: withdrawAvailableRes.data.normal || 0,
          recommenderList: referralRes.data.recommenders || [],
          sponsorList: referralRes.data.sponsors || [],
        });
      } catch (err) {
        console.error("❌ 대시보드 데이터 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const formatNumber = (num) => Number(num).toLocaleString();

  if (loading || !data) {
    return (
      <div className="text-center text-gray-500 text-lg mt-10">로딩 중...</div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* ✅ 아이디 표시 헤더 */}
      <h1 className="text-xl md:text-2xl font-bold mb-6 text-gray-700">
        <span className="text-blue-600">{username}</span>님의 대시보드
      </h1>

      {/* 요약 카드 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: "직급", value: data.rank },
          { label: "구매가능 포인트", value: formatNumber(data.availablePoints) },
          { label: "입금내역", value: formatNumber(data.depositAmount) },
          { label: "지금까지 받은 수당", value: formatNumber(data.totalReward) },
          { label: "총 출금액", value: formatNumber(data.totalWithdraw) },
          {
            label: "출금 가능액",
            value: formatNumber(data.withdrawableAmount),
            highlight: true,
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`bg-white p-5 rounded-2xl shadow-md hover:shadow-lg transition border ${
              item.highlight ? "bg-green-50 border-green-200" : "border-gray-100"
            }`}
          >
            <h2 className="text-sm text-gray-500 mb-1">{item.label}</h2>
            <p
              className={`text-2xl font-bold ${
                item.highlight ? "text-green-600" : "text-gray-800"
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* 추천인/후원인 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">
            {username}님의 추천인 목록
          </h2>
          <ul className="text-sm text-gray-700 space-y-1">
            {data.recommenderList.length > 0 ? (
              data.recommenderList.map((id, idx) => <li key={idx}>{id}</li>)
            ) : (
              <li>추천인이 없습니다.</li>
            )}
          </ul>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">
            {username}님의 후원인 목록
          </h2>
          <ul className="text-sm text-gray-700 space-y-1">
            {data.sponsorList.length > 0 ? (
              data.sponsorList.map((id, idx) => <li key={idx}>{id}</li>)
            ) : (
              <li>후원인이 없습니다.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
