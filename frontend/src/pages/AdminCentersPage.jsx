// ✅ 파일 경로: frontend/src/pages/AdminCentersPage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { formatKST } from '../utils/time'; // ✅ KST 변환 추가

const AdminCentersPage = () => {
  const [centers, setCenters] = useState([]);
  const [form, setForm] = useState({
    center_name: '',
    center_owner: '', // member_id or username
    center_recommender: '', // member_id or username
    center_phone: ''
  });
  const [leaderName, setLeaderName] = useState('');
  const [recommenderName, setRecommenderName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLeaderName, setEditLeaderName] = useState('');
  const [editRecommenderName, setEditRecommenderName] = useState('');

  const fetchCenters = async () => {
    const res = await axios.get('/api/admin/centers');
    setCenters(res.data);
  };

  const checkDuplicate = async () => {
    const res = await axios.post('/api/admin/centers/check-duplicate-name', {
      name: form.center_name,
    });
    return res.data.exists;
  };

  const getMemberIdByUsername = async (input) => {
    if (!input) return '';
    if (/^\d+$/.test(input)) return input;
    try {
      const res = await axios.get(`/api/admin/centers/member-id-by-username/${input}`);
      return res.data.id || '';
    } catch {
      return '';
    }
  };

  const getMemberName = async (member_id, setName) => {
    if (!member_id) return setName('');
    if (!/^\d+$/.test(member_id)) {
      member_id = await getMemberIdByUsername(member_id);
    }
    if (!member_id) {
      setName('회원 없음');
      return;
    }
    try {
      const res = await axios.get(`/api/admin/centers/member-name/${member_id}`);
      setName(res.data.name);
    } catch {
      setName('회원 없음');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isDuplicate = await checkDuplicate();
    if (isDuplicate) {
      alert('이미 존재하는 센터명입니다');
      return;
    }
    const owner_id = await getMemberIdByUsername(form.center_owner);
    const recommender_id = await getMemberIdByUsername(form.center_recommender);

    if (!owner_id) {
      alert('센터장 ID를 올바르게 입력하세요.');
      return;
    }

    await axios.post('/api/admin/centers', {
      ...form,
      center_owner: owner_id,
      center_recommender: recommender_id,
    });
    setForm({ center_name: '', center_owner: '', center_recommender: '', center_phone: '' });
    setLeaderName('');
    setRecommenderName('');
    fetchCenters();
    alert('추가되었습니다');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/admin/centers/${id}`);
      fetchCenters();
      alert('삭제되었습니다');
    } catch (err) {
      alert(err.response?.data?.error || '삭제 실패');
    }
  };

  const handleEdit = async (center) => {
    setEditId(center.id);
    setEditForm({
      center_name: center.name,
      center_owner: center.center_owner_id,
      center_recommender: center.center_recommender_id,
      center_phone: center.center_phone || ''
    });
    getMemberName(center.center_owner_id, setEditLeaderName);
    getMemberName(center.center_recommender_id, setEditRecommenderName);
  };

  const handleEditSave = async (id) => {
    const owner_id = await getMemberIdByUsername(editForm.center_owner);
    const recommender_id = await getMemberIdByUsername(editForm.center_recommender);
    if (!editForm.center_name || !owner_id) {
      alert('센터명과 센터장 ID는 필수입니다');
      return;
    }
    await axios.put(`/api/admin/centers/${id}`, {
      ...editForm,
      center_owner: owner_id,
      center_recommender: recommender_id,
    });
    setEditId(null);
    fetchCenters();
    alert('변경되었습니다');
  };

  useEffect(() => {
    fetchCenters();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="p-2 sm:p-6 w-full">
      <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-4">센터 관리</h2>
      {/* 입력폼 반응형 */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap gap-2 mb-4 items-center"
      >
        <input
          type="text"
          placeholder="센터명"
          value={form.center_name}
          onChange={(e) => setForm({ ...form, center_name: e.target.value })}
          className="border p-1 text-center rounded text-xs sm:text-sm w-20 sm:w-32"
        />
        <input
          type="text"
          placeholder="센터장 아이디 또는 member_id"
          value={form.center_owner}
          onChange={(e) => setForm({ ...form, center_owner: e.target.value })}
          className="border p-1 text-center rounded text-xs sm:text-sm w-28 sm:w-40"
        />
        <button
          type="button"
          className="px-2 py-1 bg-gray-200 rounded text-xs sm:text-sm"
          onClick={() => getMemberName(form.center_owner, setLeaderName)}
        >
          확인
        </button>
        <span className="text-xs sm:text-sm">{leaderName}</span>
        <input
          type="text"
          placeholder="센터추천자 아이디 또는 member_id"
          value={form.center_recommender}
          onChange={(e) => setForm({ ...form, center_recommender: e.target.value })}
          className="border p-1 text-center rounded text-xs sm:text-sm w-28 sm:w-40"
        />
        <button
          type="button"
          className="px-2 py-1 bg-gray-200 rounded text-xs sm:text-sm"
          onClick={() => getMemberName(form.center_recommender, setRecommenderName)}
        >
          확인
        </button>
        <span className="text-xs sm:text-sm">{recommenderName}</span>
        <input
          type="text"
          placeholder="전화번호"
          value={form.center_phone}
          onChange={(e) => setForm({ ...form, center_phone: e.target.value })}
          className="border p-1 text-center rounded text-xs sm:text-sm w-20 sm:w-32"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-2 py-1 rounded text-xs sm:text-sm"
        >
          등록
        </button>
      </form>
      {/* 테이블 반응형 */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-[900px] w-full border text-xs sm:text-sm text-center">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 whitespace-nowrap">번호</th>
              <th className="border p-2 whitespace-nowrap">등록일</th>
              <th className="border p-2 whitespace-nowrap">센터명</th>
              <th className="border p-2 whitespace-nowrap">센터장ID</th>
              <th className="border p-2 whitespace-nowrap">이름</th>
              <th className="border p-2 whitespace-nowrap">센터추천자ID</th>
              <th className="border p-2 whitespace-nowrap">추천자이름</th>
              <th className="border p-2 whitespace-nowrap">전화번호</th>
              <th className="border p-2 whitespace-nowrap">관리</th>
            </tr>
          </thead>
          <tbody>
            {centers.map((center, idx) => (
              <tr key={center.id}>
                <td className="border p-2">{idx + 1}</td>
                {/* ✅ UTC → KST 변환 표시 */}
                <td className="border p-2">{formatKST(center.created_at)}</td>
                {editId === center.id ? (
                  <>
                    <td className="border p-2">
                      <input
                        value={editForm.center_name}
                        className="border p-1 rounded text-xs w-16 sm:w-24"
                        onChange={(e) =>
                          setEditForm({ ...editForm, center_name: e.target.value })
                        }
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        value={editForm.center_owner}
                        className="border p-1 rounded text-xs w-16 sm:w-24"
                        onChange={async (e) => {
                          setEditForm({ ...editForm, center_owner: e.target.value });
                          const id = await getMemberIdByUsername(e.target.value);
                          getMemberName(id, setEditLeaderName);
                        }}
                      />
                    </td>
                    <td className="border p-2">{editLeaderName}</td>
                    <td className="border p-2">
                      <input
                        value={editForm.center_recommender}
                        className="border p-1 rounded text-xs w-16 sm:w-24"
                        onChange={async (e) => {
                          setEditForm({ ...editForm, center_recommender: e.target.value });
                          const id = await getMemberIdByUsername(e.target.value);
                          getMemberName(id, setEditRecommenderName);
                        }}
                      />
                    </td>
                    <td className="border p-2">{editRecommenderName}</td>
                    <td className="border p-2">
                      <input
                        value={editForm.center_phone}
                        className="border p-1 rounded text-xs w-16 sm:w-24"
                        onChange={(e) =>
                          setEditForm({ ...editForm, center_phone: e.target.value })
                        }
                      />
                    </td>
                    <td className="border p-2 space-x-1">
                      <button onClick={() => handleEditSave(center.id)} className="text-blue-600">
                        저장
                      </button>
                      <button onClick={() => setEditId(null)} className="text-gray-600">
                        취소
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border p-2">{center.name}</td>
                    <td className="border p-2">{center.leader_username}</td>
                    <td className="border p-2">{center.leader_name || '-'}</td>
                    <td className="border p-2">{center.recommender_username || '-'}</td>
                    <td className="border p-2">{center.recommender_name || '-'}</td>
                    <td className="border p-2">{center.center_phone || '-'}</td>
                    <td className="border p-2 space-x-1">
                      <button onClick={() => handleEdit(center)} className="text-blue-500">
                        수정
                      </button>
                      <button onClick={() => handleDelete(center.id)} className="text-red-500">
                        삭제
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCentersPage;
