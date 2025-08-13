// ✅ 파일 경로: frontend/src/pages/AdminRewardsPage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { formatKST } from '../utils/time'; // ✅ KST 변환 추가

const PAGE_SIZE_OPTIONS = [25, 50, 100, 150, 9999]; // 9999 = 전체
const PAGE_LABELS = ['25개씩', '50개씩', '100개씩', '150개씩', '전체'];

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchId, setSearchId] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRewards();
    // eslint-disable-next-line
  }, [page, limit]);

  const fetchRewards = async (_page = page, _limit = limit) => {
    setLoading(true);
    try {
      const params = {
        page: _page,
        limit: _limit,
        searchId,
        type,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axios.get('/api/admin/rewards', { params });
      if (res.data && Array.isArray(res.data.data)) {
        setRewards(res.data.data);
        setTotal(res.data.total);
      } else {
        setRewards([]);
        setTotal(0);
      }
    } catch {
      setRewards([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (searchId) params.searchId = searchId;
      if (type) params.type = type;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const query = new URLSearchParams(params).toString();
      const res = await axios.get('/api/admin/rewards/export?' + query, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rewards_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // handle error
    }
  };

  // 필터 변경 시 page 초기화
  const onSearchIdChange = (val) => { setSearchId(val); setPage(1); };
  const onTypeChange = (val) => { setType(val); setPage(1); };
  const onStartDateChange = (val) => { setStartDate(val); setPage(1); };
  const onEndDateChange = (val) => { setEndDate(val); setPage(1); };

  // 페이지네이션
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-2 sm:p-6 w-full">
      <h2 className="text-base sm:text-2xl font-bold mb-2 sm:mb-4">수당관리</h2>

      {/* 필터·버튼 영역 (반응형) */}
      <div className="flex flex-wrap gap-2 items-center mb-3 sm:mb-4">
        <input
          type="text"
          placeholder="검색할 아이디"
          value={searchId}
          onChange={e => onSearchIdChange(e.target.value)}
          className="border px-2 py-1 rounded text-xs sm:text-sm w-24 sm:w-36"
        />
        <select
          value={type}
          onChange={e => onTypeChange(e.target.value)}
          className="border px-2 py-1 rounded text-xs sm:text-sm w-24 sm:w-36"
        >
          <option value="">전체 종류</option>
          <option value="daily">데일리</option>
          <option value="daily_matching">데일리매칭</option>
          <option value="referral">추천수당</option>
          <option value="adjust">포인트가감</option>
          <option value="center">센터피</option>
          <option value="center_recommend">센터추천피</option>
        </select>
        {/* 기간 검색 */}
        <span className="text-xs">기간</span>
        <input
          type="date"
          value={startDate}
          onChange={e => onStartDateChange(e.target.value)}
          className="border px-2 py-1 rounded text-xs sm:text-sm w-28 sm:w-40"
          placeholder="시작일"
        />
        <span>~</span>
        <input
          type="date"
          value={endDate}
          onChange={e => onEndDateChange(e.target.value)}
          className="border px-2 py-1 rounded text-xs sm:text-sm w-28 sm:w-40"
          placeholder="종료일"
        />
        {/* 개수 선택 */}
        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          className="border rounded px-2 py-1 text-xs sm:text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((n, i) => (
            <option key={n} value={n}>{PAGE_LABELS[i]}</option>
          ))}
        </select>
        <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
          <button
            onClick={() => { setPage(1); fetchRewards(1, limit); }}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
          >
            검색
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
          >
            내보내기
          </button>
        </div>
      </div>

      {/* 테이블 (반응형, 모바일 가로 스크롤) */}
      <div className="w-full overflow-x-auto">
        {loading ? (
          <p className="p-4 text-center text-gray-500 text-sm">불러오는 중...</p>
        ) : (
          <table className="min-w-[750px] w-full border text-xs sm:text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-center whitespace-nowrap w-32">등록일</th>
                <th className="border px-2 py-1 text-center whitespace-nowrap w-20">종류</th>
                <th className="border px-2 py-1 text-center whitespace-nowrap w-24">아이디</th>
                <th className="border px-2 py-1 text-center whitespace-nowrap w-20">포인트</th>
                <th className="border px-2 py-1 text-center whitespace-nowrap w-24">수당원천</th>
                <th className="border px-2 py-1 text-center whitespace-nowrap w-48">상세내용</th>
              </tr>
            </thead>
            <tbody>
              {rewards.length > 0 ? (
                rewards.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1 text-center whitespace-nowrap">
                      {formatKST(item.created_at)} {/* ✅ UTC → KST 변환 */}
                    </td>
                    <td className="border px-2 py-1 text-center whitespace-nowrap">{item.type}</td>
                    <td className="border px-2 py-1 text-center whitespace-nowrap">{item.member_username}</td>
                    <td className="border px-2 py-1 text-right whitespace-nowrap">{item.amount.toLocaleString()}</td>
                    <td className="border px-2 py-1 text-center whitespace-nowrap">{item.source_username || '-'}</td>
                    <td className="border px-2 py-1 text-center whitespace-nowrap">{item.memo || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {totalPages > 1 &&
          Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded border text-xs sm:text-sm ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-white'}`}
            >
              {i + 1}
            </button>
          ))}
      </div>
    </div>
  );
}
