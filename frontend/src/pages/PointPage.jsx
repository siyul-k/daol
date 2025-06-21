// ✅ 파일 경로: src/pages/PointPage.jsx

import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";

export default function PointPage() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const res = await axios.get(`/api/rewards?username=${currentUser.username}`);
        setRewards(res.data || []);
      } catch (err) {
        console.error("❌ 포인트 내역 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, []);

  const groupByType = (type) =>
    Array.isArray(rewards) ? rewards.filter((r) => r.type?.toLowerCase() === type) : [];

  const renderTable = (typeLabel, typeKey) => {
    const data = groupByType(typeKey);
    return (
      <div className="mb-10 overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">{typeLabel}</h2>
        <table className="w-full min-w-[800px] border border-gray-300 text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2">등록일시</th>
              <th className="border px-3 py-2">아이디</th>
              <th className="border px-3 py-2">수당원천</th>
              <th className="border px-3 py-2">포인트</th>
              <th className="border px-3 py-2">상세내역</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((item) => (
                <tr key={item.id}>
                  <td className="border px-3 py-2">
                    {new Date(item.created_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="border px-3 py-2">{item.user_id}</td>
                  <td className="border px-3 py-2">{item.source_username || "-"}</td>
                  <td className="border px-3 py-2">
                    {Number(item.amount).toLocaleString()}
                  </td>
                  <td className="border px-3 py-2">
                    {typeKey === "adjust" ? item.memo || "포인트가감" : typeLabel}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-3 text-gray-500">
                  내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">포인트 내역</h1>
      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          {renderTable("데일리", "daily")}
          {renderTable("매칭", "daily_matching")}
          {renderTable("추천", "referral")}
          {renderTable("후원", "sponsor")}
          {renderTable("센터피", "center")}
          {renderTable("센터추천", "center_recommend")}
          {renderTable("직급", "rank")}
          {renderTable("포인트가감", "adjust")}
        </>
      )}
    </div>
  );
}
