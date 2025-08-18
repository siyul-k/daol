// ✅ 파일 경로: frontend/src/pages/AdminMembersPage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Trash2, Edit } from 'lucide-react';
import { formatKST } from '../utils/time';

const SORTABLE_FIELDS = [
  { key: 'created_at', label: '등록일' },
  { key: 'username', label: '아이디' },
  { key: 'name', label: '이름' },
  { key: 'center_name', label: '센터' },
  { key: 'is_withdraw_blocked', label: '출금금지' },
  { key: 'is_reward_blocked', label: '수당금지' },
];

export default function AdminMembersPage() {
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    username: '', name: '', recommender: '', center: '', date: ''
  });
  const [enabled, setEnabled] = useState({
    username: true, name: false, recommender: false, center: false, date: false
  });
  const [loading, setLoading] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [centers, setCenters] = useState([]);
  const [allMembers, setAllMembers] = useState([]);

  // 정렬 상태
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    axios.get(`/admin/centers`).then(r => setCenters(r.data)).catch(() => {});
    axios.get('/admin/members', { params: { page: 1, limit: 9999 } })
      .then(r => setAllMembers(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line
  }, [page, limit, sortField, sortOrder]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = { page, limit, sort: sortField, order: sortOrder };
      Object.keys(enabled).forEach(key => {
        const value = filters[key]?.trim();
        if (enabled[key] && value !== '') params[key] = value;
      });
      const { data } = await axios.get(`/admin/members`, { params });
      setMembers(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error('회원 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  const handleFilterToggle = (key) => {
    setEnabled(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const handleSearch = () => {
    setPage(1);
    fetchMembers();
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleDownloadExcel = () => {
    const params = { sort: sortField, order: sortOrder };
    Object.keys(enabled).forEach(k => {
      const value = filters[k]?.trim();
      if (enabled[k] && value !== '') params[k] = value;
    });
    axios.get(`/admin/members/export`, { params, responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `members_${Date.now()}.xlsx`;
        link.click();
      })
      .catch(() => console.error('엑셀 다운로드 실패'));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      const res = await axios.delete(`/admin/members/${id}`);
      if (res.data.success) {
        window.alert('삭제되었습니다');
        fetchMembers();
      } else {
        window.alert(res.data.message || '삭제에 실패했습니다');
      }
    } catch (err) {
      console.error('삭제 실패:', err);
      window.alert('삭제에 실패했습니다');
    }
  };

  const handlePasswordReset = () => {
    setEditMember(prev => ({ ...prev, password: '1234' }));
    window.alert('비밀번호가 1234로 초기화되었습니다');
  };

  function getUsernameById(id) {
    if (!id) return '';
    const found = allMembers.find(m => m.id === id);
    return found ? found.username : '';
  }

  const handleEditClick = (m) => {
    setEditMember({
      ...m,
      center_id: m.center_id || '',
      recommender: getUsernameById(m.recommender_id) || '',
    });
  };

  const handleEditSave = async () => {
    try {
      const body = {
        name: editMember.name,
        phone: editMember.phone,
        center_id: editMember.center_id,
        bank_name: editMember.bank_name,
        account_holder: editMember.account_holder,
        account_number: editMember.account_number,
        password: editMember.password,
        is_withdraw_blocked: editMember.is_withdraw_blocked ? 1 : 0,
        is_reward_blocked: editMember.is_reward_blocked ? 1 : 0,
        recommender: editMember.recommender?.trim() || "",
      };
      await axios.put(`/admin/members/${editMember.id}`, body);
      if (editMember.recommender?.trim()) {
        await axios.post('/api/updateRecommender', {
          username: editMember.username,
          newRecommender: editMember.recommender?.trim(),
        });
      }
      setEditMember(null);
      fetchMembers();
      window.alert('변경되었습니다');
    } catch (err) {
      console.error('회원 수정 실패:', err);
      window.alert('저장 실패');
    }
  };

  const bankList = [
    'KB국민','NH농협','IBK기업','우리','신한','KEB하나','KDB산업','BNK경남',
    'BNK부산','SC제일','광주','전북','제주','HSBC','아이엠뱅크','우체국',
    '새마을금고','수협','신협','SBI저축','씨티은행','케이뱅크','카카오뱅크','토스뱅크'
  ];

  // 정렬 UI 핸들러
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };
  const renderSortSymbol = (field) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="p-2 sm:p-6 overflow-auto bg-white dark:bg-[#0f1120] text-black dark:text-gray-100 min-h-screen transition-colors">
      <h2 className="text-xl sm:text-2xl mb-2 sm:mb-4 font-bold">회원 목록</h2>

      {/* 🔍 검색 필터 */}
      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 items-center">
        {['username', 'name', 'recommender', 'center', 'date'].map(key => (
          <div key={key} className="flex items-center gap-1 text-xs sm:text-sm">
            <input
              type="checkbox"
              checked={enabled[key]}
              onChange={() => handleFilterToggle(key)}
            />
            {key === 'center' ? (
              <select
                value={filters.center || ''}
                onChange={e => handleFilterChange('center', e.target.value)}
                className="border p-1 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              >
                <option value="">센터명 검색</option>
                {centers.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            ) : key === 'date' ? (
              <input
                type="date"
                value={filters.date || ''}
                onChange={e => handleFilterChange(key, e.target.value)}
                className="border p-1 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                onKeyDown={handleKeyDown}
              />
            ) : (
              <input
                type="text"
                placeholder={
                  key === 'username' ? '아이디 검색' :
                  key === 'name' ? '이름 검색' :
                  key === 'recommender' ? '추천인 검색' : ''
                }
                value={filters[key] || ''}
                onChange={e => handleFilterChange(key, e.target.value)}
                className="border p-1 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                onKeyDown={handleKeyDown}
              />
            )}
          </div>
        ))}
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs sm:text-sm"
        >
          검색
        </button>
        <button
          onClick={handleDownloadExcel}
          className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs sm:text-sm"
        >
          엑셀 다운로드
        </button>
        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          className="border p-1 rounded text-xs sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
        >
          {[10, 20, 30, 50, 100].map(n => (
            <option key={n} value={n}>{n}개씩 보기</option>
          ))}
        </select>
      </div>

      {/* 📋 테이블 */}
      {loading ? <p>Loading...</p> : (
        <div className="w-full overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse text-xs sm:text-sm mb-4">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              <tr>
                {/* 정렬 가능 컬럼 */}
                <th
                  className="border dark:border-gray-700 p-1 text-center whitespace-nowrap cursor-pointer select-none"
                  onClick={() => handleSort('created_at')}
                >
                  등록일<span className="text-blue-500">{renderSortSymbol('created_at')}</span>
                </th>
                <th className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">동작</th>
                <th
                  className="border dark:border-gray-700 p-1 text-center whitespace-nowrap cursor-pointer select-none"
                  onClick={() => handleSort('username')}
                >
                  아이디<span className="text-blue-500">{renderSortSymbol('username')}</span>
                </th>
                <th
                  className="border dark:border-gray-700 p-1 text-center whitespace-nowrap cursor-pointer select-none"
                  onClick={() => handleSort('name')}
                >
                  이름<span className="text-blue-500">{renderSortSymbol('name')}</span>
                </th>
                <th className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">핸드폰</th>
                <th
                  className="border dark:border-gray-700 p-1 text-center whitespace-nowrap cursor-pointer select-none"
                  onClick={() => handleSort('center_name')}
                >
                  센터<span className="text-blue-500">{renderSortSymbol('center_name')}</span>
                </th>
                <th className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">추천인</th>
                <th
                  className="border dark:border-gray-700 p-1 text-center whitespace-nowrap cursor-pointer select-none"
                  onClick={() => handleSort('is_withdraw_blocked')}
                >
                  출금금지<span className="text-blue-500">{renderSortSymbol('is_withdraw_blocked')}</span>
                </th>
                <th
                  className="border dark:border-gray-700 p-1 text-center whitespace-nowrap cursor-pointer select-none"
                  onClick={() => handleSort('is_reward_blocked')}
                >
                  수당금지<span className="text-blue-500">{renderSortSymbol('is_reward_blocked')}</span>
                </th>
                <th className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">은행</th>
                <th className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">예금주</th>
                <th className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">계좌번호</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{formatKST(m.created_at)}</td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">
                    <button onClick={() => handleEditClick(m)} className="p-1">
                      <Edit size={16} className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white" />
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="p-1">
                      <Trash2 size={16} className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white" />
                    </button>
                  </td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{m.username}</td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{m.name}</td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{m.phone}</td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{m.center_name || ''}</td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{getUsernameById(m.recommender_id) || ''}</td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{m.is_withdraw_blocked ? '✅' : ''}</td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{m.is_reward_blocked ? '✅' : ''}</td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{m.bank_name}</td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{m.account_holder}</td>
                  <td className="border dark:border-gray-700 p-1 text-center whitespace-nowrap">{m.account_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      <div className="space-x-1 mb-4">
        {Array.from({ length: Math.ceil(total / limit) }, (_, i) => (
          <button
            key={i}
            className={`px-2 py-1 border dark:border-gray-700 rounded ${page === i + 1 ? 'bg-blue-600 text-white dark:bg-blue-500' : 'bg-transparent'}`}
            onClick={() => setPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* ✅ 수정 모달 */}
      {editMember && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div
            className="bg-white dark:bg-gray-900 text-black dark:text-gray-100 p-3 sm:p-5 rounded-xl shadow-lg w-full max-w-xs sm:max-w-md"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h3 className="mb-3 font-bold text-base sm:text-lg">
              회원 정보 수정 <span className="text-blue-600">({editMember.username})</span>
            </h3>
            <form
              className="flex flex-col gap-2"
              onSubmit={e => { e.preventDefault(); handleEditSave(); }}
            >
              <label className="text-xs font-semibold">이름
                <input
                  className="border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 w-full p-1 rounded mt-1"
                  value={editMember.name || ''}
                  onChange={e => setEditMember({ ...editMember, name: e.target.value })}
                />
              </label>
              <label className="text-xs font-semibold">전화번호
                <input
                  className="border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 w-full p-1 rounded mt-1"
                  value={editMember.phone || ''}
                  onChange={e => setEditMember({ ...editMember, phone: e.target.value })}
                />
              </label>
              <label className="text-xs font-semibold">센터
                <select
                  value={editMember.center_id || ''}
                  onChange={e => setEditMember({ ...editMember, center_id: e.target.value })}
                  className="border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-1 rounded w-full mt-1"
                >
                  <option value="">센터 선택</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold">은행
                <select
                  className="border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 w-full p-1 rounded mt-1"
                  value={editMember.bank_name || ''}
                  onChange={e => setEditMember({ ...editMember, bank_name: e.target.value })}
                >
                  <option value="">은행 선택</option>
                  {bankList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold">예금주
                <input
                  className="border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 w-full p-1 rounded mt-1"
                  value={editMember.account_holder || ''}
                  onChange={e => setEditMember({ ...editMember, account_holder: e.target.value })}
                />
              </label>
              <label className="text-xs font-semibold">계좌번호
                <input
                  className="border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 w-full p-1 rounded mt-1"
                  value={editMember.account_number || ''}
                  onChange={e => setEditMember({ ...editMember, account_number: e.target.value })}
                />
              </label>
              <label className="text-xs font-semibold">추천인
                <input
                  className="border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 w-full p-1 rounded mt-1"
                  value={editMember.recommender || ''}
                  onChange={e => setEditMember({ ...editMember, recommender: e.target.value })}
                  placeholder="추천인 아이디(username) 입력"
                />
              </label>
              <div className="flex flex-wrap gap-4 mt-2">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={!!editMember.is_withdraw_blocked}
                    onChange={e =>
                      setEditMember({ ...editMember, is_withdraw_blocked: e.target.checked ? 1 : 0 })
                    }
                  />
                  출금 금지
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={!!editMember.is_reward_blocked}
                    onChange={e =>
                      setEditMember({ ...editMember, is_reward_blocked: e.target.checked ? 1 : 0 })
                    }
                  />
                  수당 금지
                </label>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="px-2 py-1 bg-yellow-400 hover:bg-yellow-300 rounded text-xs font-semibold"
                >
                  비번 초기화
                </button>
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="px-2 py-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-xs font-semibold dark:text-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
