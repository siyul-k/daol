// ✅ 파일 경로: frontend/src/pages/AdminWithdrawPage.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from '../axiosConfig';
import * as XLSX from 'xlsx';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 150, 9999];
const PAGE_LABELS = ['25개씩', '50개씩', '100개씩', '150개씩', '전체'];

export default function AdminWithdrawPage() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({
    username: '',
    name: '',
    startDate: '',
    endDate: '',
    status: ''
  });
  const [enabled, setEnabled] = useState({
    username: false,
    name: false,
    date: false,
    status: false
  });
  const [statusMsg, setStatusMsg] = useState('');
  const [memoEdits, setMemoEdits] = useState({});
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastCursor, setLastCursor] = useState(null);

  // 👇 item per
  const [limit, setLimit] = useState(25);

  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const observer = useRef();
  const bottomRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new window.IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchData(true);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    resetAndFetch();
    // eslint-disable-next-line
  }, [sortField, sortOrder, limit]); // 👈 limit 바뀌면 리셋

  const buildParams = () => {
    const params = {};
    if (enabled.username && filters.username) params.username = filters.username;
    if (enabled.name && filters.name) params.name = filters.name;
    if (enabled.date && filters.startDate && filters.endDate) {
      params.startDate = filters.startDate;
      params.endDate = filters.endDate;
    }
    if (enabled.status && filters.status) params.status = filters.status;
    params.sort = sortField;
    params.order = sortOrder;
    params.limit = limit; // 👈 item per
    return params;
  };

  const resetAndFetch = () => {
    setRequests([]);
    setLastCursor(null);
    setHasMore(true);
    fetchData(false);
  };

  const fetchData = async (isScroll = false) => {
    if (loading || (!isScroll && !hasMore)) return;
    setLoading(true);
    try {
      const params = buildParams();
      if (isScroll && lastCursor) params.cursor = lastCursor;

      const res = await axios.get('/api/ad-da/withdraws', { params });
      const newItems = res.data;

      setRequests((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const uniqueItems = newItems.filter((item) => !ids.has(item.id));
        return [...prev, ...uniqueItems];
      });

      setSelected([]);
      if (newItems.length < limit) setHasMore(false); // 👈 limit
      if (newItems.length > 0) {
        setLastCursor(newItems[newItems.length - 1].created_at);
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    }
    setLoading(false);
  };

  const handleFilter = () => resetAndFetch();

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = requests.map((r) => r.id);
    const allSelected = visibleIds.every((id) => selected.includes(id));
    setSelected(allSelected ? [] : visibleIds);
  };

  const changeStatus = async (action) => {
    if (selected.length === 0) return alert('선택된 항목이 없습니다.');
    try {
      await axios.post(`/api/ad-da/withdraws/${action}`, { ids: selected });
      setResultMessage(action === 'complete' ? '완료 처리되었습니다.' : '취소 처리되었습니다.');
      setShowResultModal(true);
      resetAndFetch();
    } catch (err) {
      console.error(`${action} 처리 실패`, err);
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const saveMemo = async (id, memo) => {
    await axios.post('/api/ad-da/withdraws/update-memo', { id, memo });
    setStatusMsg('비고가 변경되었습니다.');
    resetAndFetch();
  };

  const handleMemoChange = (id, value) => {
    setMemoEdits((prev) => ({ ...prev, [id]: value }));
  };

  const deleteRequest = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    await axios.delete(`/api/ad-da/withdraws/${id}`);
    resetAndFetch();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      requests.map((r) => ({
        등록일: new Date(r.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        아이디: r.username,
        이름: r.name,
        종류: r.type === 'normal' ? '일반' : '센터',
        상태: r.status,
        신청금액: r.amount,
        수수료: r.fee,
        출금액: r.payout ?? r.amount - r.fee,
        쇼핑포인트: r.shopping_point || 0,
        은행: r.bank_name,
        예금주: r.account_holder,
        계좌번호: r.account_number,
        비고: r.memo
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '출금내역');
    XLSX.writeFile(wb, `withdraws_${Date.now()}.xlsx`);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortSymbol = (field) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="p-2 sm:p-6 w-full">
      <h2 className="text-base sm:text-2xl font-bold mb-3 sm:mb-4">출금 신청 목록</h2>

      {statusMsg && <div className="mb-2 text-green-600 dark:text-emerald-400">{statusMsg}</div>}

      {/* 필터+버튼+item per (반응형) */}
      <div className="flex flex-wrap gap-2 items-center mb-3 sm:mb-4">
        {['username', 'name'].map((key) => (
          <div key={key} className="flex items-center gap-1 text-xs sm:text-sm">
            <input
              type="checkbox"
              checked={enabled[key]}
              onChange={(e) => setEnabled((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
            <input
              type="text"
              placeholder={key === 'username' ? '아이디 검색' : '이름 검색'}
              value={filters[key]}
              onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
              className="border px-2 py-1 rounded text-xs sm:text-sm w-20 sm:w-28
                         dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
            />
          </div>
        ))}
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <input
            type="checkbox"
            checked={enabled.date}
            onChange={(e) => setEnabled((prev) => ({ ...prev, date: e.target.checked }))}
          />
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="border px-2 py-1 rounded text-xs sm:text-sm w-24 sm:w-36
                       dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="border px-2 py-1 rounded text-xs sm:text-sm w-24 sm:w-36
                       dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <input
            type="checkbox"
            checked={enabled.status}
            onChange={(e) => setEnabled((prev) => ({ ...prev, status: e.target.checked }))}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="border px-2 py-1 rounded text-xs sm:text-sm w-20 sm:w-28
                       dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
          >
            <option value="">상태 선택</option>
            <option value="요청">요청</option>
            <option value="완료">완료</option>
            <option value="취소">취소</option>
          </select>
        </div>
        {/* 👇 item per select */}
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="border rounded px-2 py-1 text-xs sm:text-sm
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
        >
          {PAGE_SIZE_OPTIONS.map((n, i) => (
            <option key={n} value={n}>
              {PAGE_LABELS[i]}
            </option>
          ))}
        </select>
        {/* 버튼: 모바일에선 2줄 이상 배치 */}
        <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm" onClick={handleFilter}>
            검색
          </button>
          <button className="bg-green-600 text-white px-3 py-1 rounded text-xs sm:text-sm" onClick={exportExcel}>
            내보내기
          </button>
          <button
            className="bg-teal-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
            onClick={() => changeStatus('complete')}
          >
            완료처리
          </button>
          <button
            className="bg-gray-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
            onClick={() => changeStatus('cancel')}
          >
            취소처리
          </button>
        </div>
      </div>

      {/* 테이블 (반응형, 가로 스크롤) */}
      <div className="w-full overflow-x-auto">
        <table
          className="min-w-[1400px] w-full text-xs sm:text-sm text-center
                     border border-gray-200 dark:border-white/10"
        >
          <thead className="bg-gray-100 dark:bg-gray-700 dark:text-white">
            <tr>
              <th className="border border-gray-200 dark:border-white/10 px-2 py-1">
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={requests.length > 0 && requests.every((r) => selected.includes(r.id))}
                />
              </th>
              {[
                ['created_at', '등록일'],
                ['username', '아이디'],
                ['name', '이름'],
                ['type', '종류'],
                ['status', '상태'],
                ['amount', '신청금액'],
                ['fee', '수수료'],
                ['payout', '출금액'],
                ['shopping_point', '쇼핑포인트'],
                ['bank_name', '은행'],
                ['account_holder', '예금주'],
                ['account_number', '계좌번호']
              ].map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  className="cursor-pointer border border-gray-200 dark:border-white/10 px-2 py-1 whitespace-nowrap"
                >
                  {label}
                  {renderSortSymbol(field)}
                </th>
              ))}
              <th className="border border-gray-200 dark:border-white/10 px-2 py-1">비고</th>
              <th className="border border-gray-200 dark:border-white/10 px-2 py-1">저장</th>
              <th className="border border-gray-200 dark:border-white/10 px-2 py-1">삭제</th>
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 dark:text-gray-100">
            {requests.map((r) => {
              const payout = r.payout ?? r.amount - r.fee;
              const shoppingPoint = r.shopping_point ?? 0;
              return (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60">
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1">
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      disabled={r.status !== '요청'}
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 whitespace-nowrap">
                    {r.created_at}
                  </td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 whitespace-nowrap">{r.username}</td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 whitespace-nowrap">{r.name}</td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 whitespace-nowrap">
                    {r.type === 'normal' ? '일반' : '센터'}
                  </td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 whitespace-nowrap">{r.status}</td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 text-right whitespace-nowrap">
                    {r.amount.toLocaleString()}
                  </td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 text-right whitespace-nowrap">
                    {r.fee.toLocaleString()}
                  </td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 text-right whitespace-nowrap">
                    {payout.toLocaleString()}
                  </td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 text-right whitespace-nowrap">
                    {shoppingPoint.toLocaleString()}
                  </td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 whitespace-nowrap">{r.bank_name}</td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 whitespace-nowrap">{r.account_holder}</td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1 whitespace-nowrap">
                    {r.account_number}
                  </td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1">
                    <input
                      type="text"
                      className="w-full border px-1 text-xs sm:text-sm
                                 dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
                      defaultValue={r.memo}
                      onChange={(e) => handleMemoChange(r.id, e.target.value)}
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1">
                    <button
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs sm:text-sm"
                      onClick={() => saveMemo(r.id, memoEdits[r.id] ?? r.memo)}
                    >
                      저장
                    </button>
                  </td>
                  <td className="border border-gray-200 dark:border-white/10 px-2 py-1">
                    <button
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs sm:text-sm"
                      onClick={() => deleteRequest(r.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
            {loading && (
              <tr>
                <td
                  colSpan={16}
                  className="py-4 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10"
                >
                  로딩 중...
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div ref={bottomRef}></div>
      </div>

      {/* 완료/취소 처리 후 모달 */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 dark:text-gray-100 p-6 rounded-lg shadow-xl text-center">
            <p className="text-xl font-semibold mb-4 text-green-700 dark:text-emerald-400">{resultMessage}</p>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => setShowResultModal(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
