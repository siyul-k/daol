// ✅ 파일 경로: frontend/src/pages/AdminRewardsPage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { formatKST } from '../utils/time';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 150, 9999];
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
      const params = { page: _page, limit: _limit, searchId, type };
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
      const res = await axios.get('/api/admin/rewards/export?' + query, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rewards_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {}
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-2 sm:p-6 w-full">
      <h2 className="text-base sm:text-2xl font-bold mb-2 sm:mb-4">수당관리</h2>

      {/* 필터·버튼 영역 */}
      <div className="flex flex-wrap gap-2 items-center mb-3 sm:mb-4">
        <input
          type="text"
          placeholder="검색할 아이디"
          value={searchId}
          onChange={e => { setSearchId(e.target.value); setPage(1); }}
          className="border px-2 py-1 rounded text-xs sm:text-sm w-24 sm:w-36
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
        />
        <select
          value={type}
          onChange={e => { setType(e.target.value); setPage(1); }}
          className="border px-2 py-1 rounded text-xs sm:text-sm w-24 sm:w-36
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
        >
          <option value="">전체 종류</option>
          <option value="daily">데일리</option>
          <option value="daily_matching">데일리매칭</option>
          <option value="referral">추천수당</option>
          <option value="adjust">포인트가감</option>
          <option value="center">센터피</option>
          <option value="center_recommend">센터추천피</option>
        </select>
        <span className="text-xs dark:text-gray-300">기간</span>
        <input
          type="date"
          value={startDate}
          onChange={e => { setStartDate(e.target.value); setPage(1); }}
          className="border px-2 py-1 rounded text-xs sm:text-sm w-28 sm:w-40
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
        />
        <span className="dark:text-gray-300">~</span>
        <input
          type="date"
          value={endDate}
          onChange={e => { setEndDate(e.target.value); setPage(1); }}
          className="border px-2 py-1 rounded text-xs sm:text-sm w-28 sm:w-40
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
        />
        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          className="border rounded px-2 py-1 text-xs sm:text-sm
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
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

      {/* 테이블 */}
      <div className="w-full overflow-x-auto">
        {loading ? (
          <p className="p-4 text-center text-gray-500 text-sm">불러오는 중...</p>
        ) : (
          <table className="min-w-[750px] w-full text-xs sm:text-sm
                             border border-gray-200 dark:border-white/10">
            <thead className="bg-gray-100 dark:bg-gray-700 dark:text-white">
              <tr>
                {['등록일','종류','아이디','포인트','수당원천','상세내용'].map(h => (
                  <th key={h} className="border px-2 py-1 text-center whitespace-nowrap dark:border-white/10">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 dark:text-gray-100">
              {rewards.length > 0 ? (
                rewards.map((item, idx) => (
                  <tr key={idx} className="border-t border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700/60">
                    <td className="border px-2 py-1 text-center whitespace-nowrap dark:border-white/10">{formatKST(item.created_at)}</td>
                    <td className="border px-2 py-1 text-center whitespace-nowrap dark:border-white/10">{item.type}</td>
                    <td className="border px-2 py-1 text-center whitespace-nowrap dark:border-white/10">{item.member_username}</td>
                    <td className="border px-2 py-1 text-right whitespace-nowrap dark:border-white/10">{item.amount.toLocaleString()}</td>
                    <td className="border px-2 py-1 text-center whitespace-nowrap dark:border-white/10">{item.source_username || '-'}</td>
                    <td className="border px-2 py-1 text-center whitespace-nowrap dark:border-white/10">{item.memo || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500 dark:text-gray-400">데이터가 없습니다.</td>
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
              className={`px-3 py-1 rounded border text-xs sm:text-sm 
                         ${page === i + 1 
                           ? 'bg-blue-600 text-white' 
                           : 'bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-white/10'}`}
            >
              {i + 1}
            </button>
          ))}
      </div>
    </div>
  );
}
