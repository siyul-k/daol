// ✅ 파일 경로: frontend/src/pages/AdminDepositPage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Trash2 } from 'lucide-react';

export default function AdminDepositPage() {
  const [deposits, setDeposits] = useState([]);
  const [filters, setFilters] = useState({ username: '', status: '', date: '' });
  const [enabled, setEnabled] = useState({ username: false, status: false, date: false });
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapStatus = (s) => {
    if (s === '요청') return 'Request';
    if (s === '완료') return 'Complete';
    return s || '-';
  };

  // ✅ 입금 내역 조회
  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (enabled.username && filters.username) params.append('username', filters.username);
      if (enabled.status && filters.status)     params.append('status', filters.status);
      if (enabled.date && filters.date)         params.append('date', filters.date);

      const res = await axios.get(`/api/admin/deposits?${params.toString()}`);
      setDeposits(res.data);
    } catch (err) {
      console.error('입금 내역 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  // ✅ 체크박스 토글
  const toggleSelect = (id, status) => {
    if (status === '완료') return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ✅ 완료 처리
  const handleComplete = async () => {
    if (!selected.length) return;
    try {
      await axios.post('/api/admin/deposits/complete', { ids: selected });
      setSelected([]);
      fetchDeposits();
    } catch (err) {
      console.error('완료 처리 실패:', err);
    }
  };

  // ✅ 삭제
  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/admin/deposits/${id}`);
      fetchDeposits();
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  };

  // ✅ 엑셀 다운로드
  const handleExport = () => {
    const params = new URLSearchParams();
    if (enabled.username && filters.username) params.append('username', filters.username);
    if (enabled.status && filters.status)     params.append('status', filters.status);
    if (enabled.date && filters.date)         params.append('date', filters.date);
    window.open(`/api/admin/deposits/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="p-6 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-6">입금 관리</h2>

      {/* ✅ 필터 및 버튼 */}
      <div className="flex flex-wrap items-center gap-2 mb-4 min-w-[900px]">
        <div className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={enabled.username}
            onChange={(e) => setEnabled({ ...enabled, username: e.target.checked })}
          />
          <input
            type="text"
            placeholder="username 검색"
            value={filters.username}
            onChange={(e) => setFilters({ ...filters, username: e.target.value })}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={enabled.status}
            onChange={(e) => setEnabled({ ...enabled, status: e.target.checked })}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded px-2 py-1"
          >
            <option value="">상태 선택</option>
            <option value="요청">Request</option>
            <option value="완료">Complete</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={enabled.date}
            onChange={(e) => setEnabled({ ...enabled, date: e.target.checked })}
          />
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            className="border rounded px-2 py-1"
          />
        </div>
        <button
          onClick={fetchDeposits}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          검색
        </button>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          엑셀 다운로드
        </button>
        <button
          onClick={handleComplete}
          disabled={!selected.length}
          className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          완료 처리
        </button>
      </div>

      {/* ✅ 테이블 */}
      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <table className="min-w-[1200px] border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1"></th>
              <th className="border px-2 py-1">삭제</th>
              <th className="border px-2 py-1">등록일</th>
              <th className="border px-2 py-1">아이디</th>
              <th className="border px-2 py-1">이름</th>
              <th className="border px-2 py-1">상태</th>
              <th className="border px-2 py-1">입금자명</th>
              <th className="border px-2 py-1">신청금액</th>
              <th className="border px-2 py-1">입금확인일</th>
              <th className="border px-2 py-1">비고</th>
            </tr>
          </thead>
          <tbody>
            {deposits.length === 0 ? (
              <tr>
                <td colSpan={10} className="border px-2 py-4 text-center text-gray-500">
                  조회된 내역이 없습니다.
                </td>
              </tr>
            ) : (
              deposits.map((r) => (
                <tr key={r.id} className="text-center">
                  <td className="border px-2 py-1">
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={() => toggleSelect(r.id, r.status)}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <button onClick={() => handleDelete(r.id)}>
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </td>
                  <td className="border px-2 py-1">
                    {new Date(r.created_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="border px-2 py-1">{r.username}</td>
                  <td className="border px-2 py-1">{r.name}</td>
                  <td className="border px-2 py-1">{mapStatus(r.status)}</td>
                  <td className="border px-2 py-1">{r.account_holder}</td>
                  <td className="border px-2 py-1 text-right">
                    {r.amount.toLocaleString()}
                  </td>
                  <td className="border px-2 py-1">
                    {r.completed_at
                      ? new Date(r.completed_at).toLocaleString('ko-KR')
                      : '-'}
                  </td>
                  <td className="border px-2 py-1">{r.memo}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
