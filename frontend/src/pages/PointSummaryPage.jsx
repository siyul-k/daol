// ✅ 파일 경로: src/pages/PointSummaryPage.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";

export default function PointSummaryPage() {
  const [rewards, setRewards] = useState([]);
  const [packages, setPackages] = useState([]);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rewardRes, purchaseRes, limitRes] = await Promise.all([
          axios.get(`/api/rewards?username=${currentUser.username}`),
          axios.get(`/api/purchase-history?username=${currentUser.username}`),
          axios.get(`/api/reward-limit?username=${currentUser.username}`)
        ]);
        setRewards(rewardRes.data || []);
        setPackages(purchaseRes.data || []);
        setLimit(limitRes.data.limit || 0);
      } catch (err) {
        console.error("❌ 수당 데이터 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sumByTypes = (types) => {
    const list = (Array.isArray(types) ? types : [types]).map((t) => t.toLowerCase());
    return rewards
      .filter((r) => list.includes(r.type?.toLowerCase()))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  };

  const total = rewards.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  // 센터와 센터추천 모두 포함해서 총 합계
  const sumCenterTotal = () => sumByTypes(["center", "center_recommend"]);

  // 한도 달성률(센터 제외)
  const sumExcludingCenter = () =>
    rewards
      .filter((r) => r.type !== "center" && r.type !== "center_recommend")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  // ✅ 타일 구성 (추천 = referral + recommend)
  const categories = [
    { label: "추천", types: ["referral", "recommend"] },
    { label: "데일리", types: ["daily"] },
    { label: "매칭", types: ["daily_matching"] },
  ];

  const sumByDate = () => {
    const grouped = {};
    rewards.forEach((r) => {
      const date =
        (r.created_at_kst && r.created_at_kst.slice(0, 10)) ||
        (r.created_at && r.created_at.slice(0, 10)) ||
        "";
      if (!grouped[date]) grouped[date] = 0;
      grouped[date] += Number(r.amount || 0);
    });
    return Object.entries(grouped).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  };

  const received = sumExcludingCenter();
  const percent = limit > 0 ? Math.min((received / limit) * 100, 100) : 0;

  return (
    <div className="p-4 md:p-6">
      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          {/* 수당한도 막대그래프 */}
          <div className="bg-white rounded shadow p-4 mb-6">
            <div className="mb-2 text-sm text-gray-700 font-semibold">
              수당 한도 달성률 (센터 제외)
            </div>
            <div className="w-full bg-gray-200 h-6 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-blue-500 text-white text-sm font-bold text-center"
                style={{ width: `${percent}%`, lineHeight: "1.5rem" }}
              >
                {percent.toFixed(2)}%
              </div>
            </div>
            <div className="text-xs text-right text-gray-500 mt-1">
              현재까지 누적 포인트: {received.toLocaleString()} P / 한도 {limit.toLocaleString()} P
            </div>
          </div>

          {/* 총 수령 포인트 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-sm">
            <div className="bg-white shadow p-4 rounded border text-center col-span-2 md:col-span-4">
              <div className="text-gray-500 mb-1">총 수령 포인트</div>
              <div className="text-2xl font-bold text-green-700">{total.toLocaleString()}</div>
            </div>

            {/* ✅ 항목별 요약 타일 */}
            {categories.map((cat) => (
              <div key={cat.label} className="bg-white shadow p-4 rounded border text-center">
                <div className="text-gray-500 mb-1">{cat.label}</div>
                <div className="font-semibold">{sumByTypes(cat.types).toLocaleString()}</div>
              </div>
            ))}

            {/* 센터 수당 */}
            <div className="bg-white shadow p-4 rounded border text-center">
              <div className="text-gray-500 mb-1">센터</div>
              <div className="font-semibold">{sumCenterTotal().toLocaleString()}</div>
            </div>
          </div>

          {/* 일자별 수당 합계 테이블 */}
          <div>
            <h2 className="text-lg font-bold mb-2">📅 일자별 수당 합계</h2>
            <table className="w-full text-sm border text-center">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">날짜</th>
                  <th className="border px-3 py-2">합계</th>
                </tr>
              </thead>
              <tbody>
                {sumByDate().length > 0 ? (
                  sumByDate().map(([date, dayTotal], idx) => (
                    <tr key={idx}>
                      <td className="border px-3 py-2">{date}</td>
                      <td className="border px-3 py-2 text-center">{dayTotal.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="text-center py-4 text-gray-500">
                      수당 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
