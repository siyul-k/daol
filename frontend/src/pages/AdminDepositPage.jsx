// ✅ 파일 경로: frontend/src/pages/AdminDepositPage.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Trash2 } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 150, 9999]; // 9999=all
const PAGE_LABELS = ['25개씩', '50개씩', '100개씩', '150개씩', '전체'];

// ✅ 공통 포맷터: 문자열/숫자 모두 안전하게 1,000단위 콤마
const formatKRW = (v) => new Intl.NumberFormat('ko-KR').format(Number(v || 0));

export default function AdminDepositPage() {
  const [deposits, setDeposits] = useState([]);
  const [filters, setFilters] = useState({ username: '', status: '', startDate: '', endDate: '' });
  const [enabled, setEnabled] = useState({ username: false, status: false, date: false });
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);

  const mapStatus = (s) => (s === '요청' ? 'Request' : s === '완료' ? 'Complete' : s || '-');

  const fetchDeposits = async (_page = page, _limit = limit) => {
    setLoading(true);
    try {
      const params = { page: _page, limit: _limit };
      if (enabled.username && filters.username) params.username = filters.username;
      if (enabled.status && filters.status) params.status = filters.status;
      if (enabled.date) {
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
      }
      const res = await axios.get(`/api/ad-da/deposits`, { params });
      setDeposits(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('입금 내역 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeposits(); }, [page, limit]);

  const toggleSelect = (id, status) => {
    if (status === '완료') return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleComplete = async () => {
    if (!selected.length) return;
    try {
      await axios.post('/api/ad-da/deposits/complete', { ids: selected });
      setSelected([]); fetchDeposits(); alert('변경되었습니다');
    } catch (err) {
      console.error('완료 처리 실패:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/ad-da/deposits/${id}`);
      fetchDeposits(); alert('삭제되었습니다');
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (enabled.username && filters.username) params.append('username', filters.username);
    if (enabled.status && filters.status) params.append('status', filters.status);
    if (enabled.date) {
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
    }
    window.open(`/api/ad-da/deposits/export?${params.toString()}`, '_blank');
  };

  const handleSearch = () => { setPage(1); fetchDeposits(1, limit); };
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-2 sm:p-6 w-full text-gray-900 dark:text-gray-100">
      <h2 className="text-base sm:text-2xl font-bold mb-3 sm:mb-6">입금 관리</h2>

      {/* 필터 및 버튼 */}
      <div className="flex flex-wrap gap-2 items-center mb-3 sm:mb-4">
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <input
            type="checkbox"
            checked={enabled.username}
            onChange={(e) => setEnabled({ ...enabled, username: e.target.checked })}
          />
          <input
            type="text"
            placeholder="아이디 검색"
            value={filters.username}
            onChange={(e) => setFilters({ ...filters, username: e.target.value })}
            className="border rounded px-2 py-1 text-xs sm:text-sm w-24 sm:w-32 border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <input
            type="checkbox"
            checked={enabled.status}
            onChange={(e) => setEnabled({ ...enabled, status: e.target.checked })}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded px-2 py-1 text-xs sm:text-sm w-24 sm:w-32 border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">상태 선택</option>
            <option value="요청">Request</option>
            <option value="완료">Complete</option>
          </select>
        </div>

        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <input
            type="checkbox"
            checked={enabled.date}
            onChange={(e) => setEnabled({ ...enabled, date: e.target.checked })}
          />
          <span className="text-xs">기간</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="border rounded px-2 py-1 text-xs sm:text-sm w-28 sm:w-40 border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <span>~</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border rounded px-2 py-1 text-xs sm:text-sm w-28 sm:w-40 border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          className="border rounded px-2 py-1 text-xs sm:text-sm border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        >
          {PAGE_SIZE_OPTIONS.map((n, i) => (
            <option key={n} value={n}>{PAGE_LABELS[i]}</option>
          ))}
        </select>

        <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs sm:text-sm"
          >
            검색
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs sm:text-sm"
          >
            엑셀 다운로드
          </button>
          <button
            onClick={handleComplete}
            disabled={!selected.length}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs sm:text-sm disabled:opacity-50"
          >
            완료 처리
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="w-full overflow-x-auto">
        {loading ? (
          <p className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">불러오는 중...</p>
        ) : (
          <table className="min-w-[800px] w-full border-collapse text-xs sm:text-sm border border-gray-200 dark:border-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="border px-2 py-1"></th>
                <th className="border px-2 py-1 whitespace-nowrap">등록일</th>
                <th className="border px-2 py-1">삭제</th>
                <th className="border px-2 py-1 whitespace-nowrap">신청금액</th>
                <th className="border px-2 py-1 whitespace-nowrap">상태</th>
                <th className="border px-2 py-1 whitespace-nowrap">아이디</th>
                <th className="border px-2 py-1 whitespace-nowrap">이름</th>
                <th className="border px-2 py-1 whitespace-nowrap">입금자명</th>
                <th className="border px-2 py-1 whitespace-nowrap">입금확인일</th>
                <th className="border px-2 py-1 whitespace-nowrap">비고</th>
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-2 py-4 text-center text-gray-500 dark:text-gray-400">
                    조회된 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                deposits.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 text-center">
                    <td className="border px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selected.includes(r.id)}
                        onChange={() => toggleSelect(r.id, r.status)}
                      />
                    </td>
                    {/* ✅ 시간 그대로 출력 */}
                    <td className="border px-2 py-1">{r.created_at || '-'}</td>
                    <td className="border px-2 py-1">
                      <button onClick={() => handleDelete(r.id)}>
                        <Trash2
                          size={16}
                          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        />
                      </button>
                    </td>
                    {/* ✅ 금액: 문자열/숫자 모두 1,000단위 콤마 */}
                    <td className="border px-2 py-1 text-right">{formatKRW(r.amount)}</td>
                    <td className="border px-2 py-1">{mapStatus(r.status)}</td>
                    <td className="border px-2 py-1">{r.username}</td>
                    <td className="border px-2 py-1">{r.name}</td>
                    <td className="border px-2 py-1">{r.account_holder}</td>
                    <td className="border px-2 py-1">{r.completed_at || '-'}</td>
                    <td className="border px-2 py-1">{r.memo}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      <div className="flex flex-wrap gap-2 my-4">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            className={`px-2 py-1 border rounded ${
              page === i + 1 ? 'bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-600'
            }`}
            onClick={() => setPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
