// ✅ 파일 경로: src/pages/PointPage.jsx

import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { formatKST } from '../utils/time';  // 1. utils 시간 변환 함수 임포트

export default function PointPage() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perPageMap, setPerPageMap] = useState({});
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

  // 항목별 필터링
  const groupByType = (types) => {
    return Array.isArray(rewards)
      ? rewards.filter((r) => types.includes(r.type?.toLowerCase()))
      : [];
  };

  // 테이블 렌더 함수
  const renderTable = (typeLabel, typeKeys) => {
    const data = groupByType(Array.isArray(typeKeys) ? typeKeys : [typeKeys]);
    const key = Array.isArray(typeKeys) ? typeKeys.join("_") : typeKeys;

    const perPage = perPageMap[key] || 10;
    const visibleData = perPage === "ALL" ? data : data.slice(0, Number(perPage));

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
            {visibleData.length > 0 ? (
              visibleData.map((item) => (
                <tr key={item.id}>
                  {/* 2. 날짜 출력 부분에서 한국 시간 변환 함수 호출 */}
                  <td className="border px-3 py-2">
                    {formatKST(item.created_at)}
                  </td>

                  <td className="border px-3 py-2">
                    {item.member_username}
                  </td>
                  <td className="border px-3 py-2">
                    {typeKeys.includes("adjust")
                      ? "관리자"
                      : (item.member_username === item.source_username
                          ? item.member_username
                          : (item.source_username || "-")
                        )
                    }
                  </td>
                  <td className="border px-3 py-2">
                    {Number(item.amount).toLocaleString()}
                  </td>
                  <td className="border px-3 py-2">
                    {typeKeys.includes("adjust") ? item.memo || "포인트가감" : (item.memo || typeLabel)}
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

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-600">
            Items per page:
            <select
              className="ml-2 border px-2 py-1 rounded"
              value={perPage}
              onChange={(e) => {
                const newVal = e.target.value;
                setPerPageMap((prev) => ({ ...prev, [key]: newVal }));
              }}
            >
              {[10, 25, 50, 100, "ALL"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </span>
          <span className="text-sm text-gray-600">
            {data.length === 0
              ? "0-0 of 0"
              : perPage === "ALL"
              ? `1-${data.length} of ${data.length}`
              : `1-${visibleData.length} of ${data.length}`}
          </span>
        </div>
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
          {renderTable("추천", "referral")}
          {renderTable("데일리", "daily")}
          {renderTable("매칭", "daily_matching")}
          {renderTable("센터", ["center", "center_recommend"])}
          {renderTable("포인트가감", "adjust")}
        </>
      )}
    </div>
  );
}
