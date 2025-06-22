// ✅ 파일 위치: frontend/src/pages/AdminMembersPage.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Trash2, Edit } from 'lucide-react';

export default function AdminMembersPage() {
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    username: '', name: '', recommender: '', center: '', date: ''
  });
  const [enabled, setEnabled] = useState({
    username: true, name: false, recommender: false, center: false, date: false
  });
  const [loading, setLoading] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [centers, setCenters] = useState([]);

  useEffect(() => {
    axios.get(`/admin/centers`)
      .then(r => setCenters(r.data))
      .catch(() => {});
    fetchMembers();
  }, [page]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      Object.keys(enabled).forEach(key => {
        const value = filters[key]?.trim();
        if (enabled[key] && value !== '') {
          params[key] = value;
        }
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

  const handleSearch = () => {
    setPage(1);
    fetchMembers();
  };

  const handleDownloadExcel = () => {
    const params = {};
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

  const handleEditSave = async () => {
    try {
      await axios.put(`/admin/members/${editMember.id}`, {
        name: editMember.name,
        phone: editMember.phone,
        center: editMember.center,
        bank_name: editMember.bank_name,
        account_holder: editMember.account_holder,
        account_number: editMember.account_number,
        password: editMember.password
      });
      if (editMember.recommender) {
        await axios.post(`/admin/members/recommender`, {
          username: editMember.username,
          newRecommender: editMember.recommender
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

  return (
    <div className="p-6 overflow-auto">
      <h2 className="text-2xl mb-4">회원 목록</h2>

      {/* 🔍 검색 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['username','name','recommender','center','date'].map(key => (
          <div key={key} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={enabled[key]}
              onChange={e => setEnabled({ ...enabled, [key]: e.target.checked })}
            />
            {key === 'center' ? (
              <select
                value={filters.center || ''}
                onChange={e => setFilters({ ...filters, center: e.target.value })}
                className="border p-1"
              >
                <option value="">센터 선택</option>
                {centers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            ) : key === 'date' ? (
              <input
                type="date"
                value={filters.date || ''}
                onChange={e => setFilters({ ...filters, date: e.target.value })}
                className="border p-1"
              />
            ) : (
              <input
                type="text"
                placeholder={`${key} 검색`}
                value={filters[key] || ''}
                onChange={e => setFilters({ ...filters, [key]: e.target.value })}
                className="border p-1"
              />
            )}
          </div>
        ))}
        <button onClick={handleSearch} className="bg-blue-600 text-white px-3 py-1">검색</button>
        <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-3 py-1">엑셀 다운로드</button>
      </div>

      {/* 📋 테이블 */}
      {loading ? <p>Loading...</p> : (
        <table className="w-full border-collapse text-sm mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-1 text-center">등록일</th>
              <th className="border p-1 text-center">동작</th>
              <th className="border p-1 text-center">아이디</th>
              <th className="border p-1 text-center">이름</th>
              <th className="border p-1 text-center">핸드폰</th>
              <th className="border p-1 text-center">센터</th>
              <th className="border p-1 text-center">추천인</th>
              <th className="border p-1 text-center">후원인</th>
              <th className="border p-1 text-center">은행</th>
              <th className="border p-1 text-center">예금주</th>
              <th className="border p-1 text-center">계좌번호</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td className="border p-1 text-center">{new Date(m.created_at).toLocaleString()}</td>
                <td className="border p-1 text-center space-x-2">
                  <button onClick={() => setEditMember(m)}><Edit size={16} /></button>
                  <button onClick={() => handleDelete(m.id)}><Trash2 size={16} /></button>
                </td>
                <td className="border p-1 text-center">{m.username}</td>
                <td className="border p-1 text-center">{m.name}</td>
                <td className="border p-1 text-center">{m.phone}</td>
                <td className="border p-1 text-center">{m.center}</td>
                <td className="border p-1 text-center">{m.recommender}</td>
                <td className="border p-1 text-center">{m.sponsor}</td>
                <td className="border p-1 text-center">{m.bank_name}</td>
                <td className="border p-1 text-center">{m.account_holder}</td>
                <td className="border p-1 text-center">{m.account_number}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 페이지네이션 */}
      <div className="space-x-1 mb-4">
        {Array.from({ length: Math.ceil(total/limit) }, (_, i) => (
          <button
            key={i}
            className={`px-2 py-1 border ${page === i+1 ? 'bg-blue-600 text-white' : ''}`}
            onClick={() => setPage(i+1)}
          >
            {i+1}
          </button>
        ))}
      </div>

      {/* ✏️ 수정 모달 */}
      {editMember && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow w-full max-w-md">
            <h3 className="mb-2 font-bold">회원 정보 수정</h3>
            <label className="block mb-1">이름
              <input className="border w-full p-1"
                value={editMember.name || ''}
                onChange={e => setEditMember({ ...editMember, name: e.target.value })}
              />
            </label>
            <label className="block mb-1">전화번호
              <input className="border w-full p-1"
                value={editMember.phone || ''}
                onChange={e => setEditMember({ ...editMember, phone: e.target.value })}
              />
            </label>
            <label className="block mb-1">센터
              <select className="border w-full p-1"
                value={editMember.center || ''}
                onChange={e => setEditMember({ ...editMember, center: e.target.value })}
              >
                <option value="">센터 선택</option>
                {centers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label className="block mb-1">은행
              <select className="border w-full p-1"
                value={editMember.bank_name || ''}
                onChange={e => setEditMember({ ...editMember, bank_name: e.target.value })}
              >
                <option value="">은행 선택</option>
                {bankList.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="block mb-1">예금주
              <input className="border w-full p-1"
                value={editMember.account_holder || ''}
                onChange={e => setEditMember({ ...editMember, account_holder: e.target.value })}
              />
            </label>
            <label className="block mb-1">계좌번호
              <input className="border w-full p-1"
                value={editMember.account_number || ''}
                onChange={e => setEditMember({ ...editMember, account_number: e.target.value })}
              />
            </label>
            <label className="block mb-1">추천인
              <input className="border w-full p-1"
                value={editMember.recommender || ''}
                onChange={e => setEditMember({ ...editMember, recommender: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={handlePasswordReset} className="px-2 py-1 bg-yellow-400">비번 초기화</button>
              <button onClick={() => setEditMember(null)} className="px-2 py-1 bg-gray-300">취소</button>
              <button onClick={handleEditSave} className="px-2 py-1 bg-blue-600 text-white">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
