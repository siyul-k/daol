// ✅ 파일 경로: frontend/src/pages/AdminCentersPage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { formatKST } from '../utils/time'; // ✅ KST 변환

const AdminCentersPage = () => {
  const [centers, setCenters] = useState([]);
  const [form, setForm] = useState({
    center_name: '',
    center_owner: '',          // member_id 또는 username
    center_recommender: '',    // member_id 또는 username
    center_phone: '',
  });
  const [leaderName, setLeaderName] = useState('');
  const [recommenderName, setRecommenderName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLeaderName, setEditLeaderName] = useState('');
  const [editRecommenderName, setEditRecommenderName] = useState('');

  const fetchCenters = async () => {
    const res = await axios.get('/api/ad-da/centers');
    setCenters(res.data);
  };

  const checkDuplicate = async () => {
    const res = await axios.post('/api/ad-da/centers/check-duplicate-name', {
      name: form.center_name,
    });
    return res.data.exists;
  };

  const getMemberIdByUsername = async (input) => {
    if (!input) return '';
    if (/^\d+$/.test(input)) return input; // 숫자면 이미 member_id
    try {
      const res = await axios.get(`/api/ad-da/centers/member-id-by-username/${input}`);
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
      const res = await axios.get(`/api/ad-da/centers/member-name/${member_id}`);
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

    await axios.post('/api/ad-da/centers', {
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
      await axios.delete(`/api/ad-da/centers/${id}`);
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
      center_phone: center.center_phone || '',
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
    await axios.put(`/api/ad-da/centers/${id}`, {
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

      {/* 입력폼 (라이트/다크 모두 선명) */}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          type="text"
          placeholder="센터명"
          value={form.center_name}
          onChange={(e) => setForm({ ...form, center_name: e.target.value })}
          className="border p-1 text-center rounded text-xs sm:text-sm w-20 sm:w-32
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
        />
        <input
          type="text"
          placeholder="센터장 아이디 또는 member_id"
          value={form.center_owner}
          onChange={(e) => setForm({ ...form, center_owner: e.target.value })}
          className="border p-1 text-center rounded text-xs sm:text-sm w-28 sm:w-40
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
        />
        <button
          type="button"
          className="px-2 py-1 bg-gray-200 rounded text-xs sm:text-sm
                     dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/20"
          onClick={() => getMemberName(form.center_owner, setLeaderName)}
        >
          확인
        </button>
        <span className="text-xs sm:text-sm dark:text-gray-300">{leaderName}</span>

        <input
          type="text"
          placeholder="센터추천자 아이디 또는 member_id"
          value={form.center_recommender}
          onChange={(e) => setForm({ ...form, center_recommender: e.target.value })}
          className="border p-1 text-center rounded text-xs sm:text-sm w-28 sm:w-40
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
        />
        <button
          type="button"
          className="px-2 py-1 bg-gray-200 rounded text-xs sm:text-sm
                     dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/20"
          onClick={() => getMemberName(form.center_recommender, setRecommenderName)}
        >
          확인
        </button>
        <span className="text-xs sm:text-sm dark:text-gray-300">{recommenderName}</span>

        <input
          type="text"
          placeholder="전화번호"
          value={form.center_phone}
          onChange={(e) => setForm({ ...form, center_phone: e.target.value })}
          className="border p-1 text-center rounded text-xs sm:text-sm w-20 sm:w-32
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-2 py-1 rounded text-xs sm:text-sm"
        >
          등록
        </button>
      </form>

      {/* 테이블 */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-[900px] w-full text-xs sm:text-sm text-center
                           border border-gray-200 dark:border-white/10">
          <thead className="bg-gray-100 dark:bg-gray-700 dark:text-white">
            <tr>
              {[
                '번호','등록일','센터명','센터장ID','이름',
                '센터추천자ID','추천자이름','전화번호','관리',
              ].map((h) => (
                <th key={h} className="border p-2 whitespace-nowrap dark:border-white/10">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 dark:text-gray-100">
            {centers.map((center, idx) => (
              <tr
                key={center.id}
                className="border-t border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700/60"
              >
                <td className="border p-2 dark:border-white/10">{idx + 1}</td>
                {/* ✅ UTC → KST 변환 */}
                <td className="border p-2 dark:border-white/10">{formatKST(center.created_at)}</td>

                {editId === center.id ? (
                  <>
                    <td className="border p-2 dark:border-white/10">
                      <input
                        value={editForm.center_name}
                        className="border p-1 rounded text-xs w-16 sm:w-24
                                   dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
                        onChange={(e) =>
                          setEditForm({ ...editForm, center_name: e.target.value })
                        }
                      />
                    </td>

                    <td className="border p-2 dark:border-white/10">
                      <input
                        value={editForm.center_owner}
                        className="border p-1 rounded text-xs w-16 sm:w-24
                                   dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
                        onChange={async (e) => {
                          setEditForm({ ...editForm, center_owner: e.target.value });
                          const id = await getMemberIdByUsername(e.target.value);
                          getMemberName(id, setEditLeaderName);
                        }}
                      />
                    </td>
                    <td className="border p-2 dark:border-white/10">{editLeaderName}</td>

                    <td className="border p-2 dark:border-white/10">
                      <input
                        value={editForm.center_recommender}
                        className="border p-1 rounded text-xs w-16 sm:w-24
                                   dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
                        onChange={async (e) => {
                          setEditForm({ ...editForm, center_recommender: e.target.value });
                          const id = await getMemberIdByUsername(e.target.value);
                          getMemberName(id, setEditRecommenderName);
                        }}
                      />
                    </td>
                    <td className="border p-2 dark:border-white/10">{editRecommenderName}</td>

                    <td className="border p-2 dark:border-white/10">
                      <input
                        value={editForm.center_phone}
                        className="border p-1 rounded text-xs w-16 sm:w-24
                                   dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
                        onChange={(e) =>
                          setEditForm({ ...editForm, center_phone: e.target.value })
                        }
                      />
                    </td>

                    <td className="border p-2 space-x-1 dark:border-white/10">
                      <button onClick={() => handleEditSave(center.id)} className="text-blue-600">
                        저장
                      </button>
                      <button onClick={() => setEditId(null)} className="text-gray-600 dark:text-gray-300">
                        취소
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border p-2 dark:border-white/10">{center.name}</td>
                    <td className="border p-2 dark:border-white/10">{center.leader_username}</td>
                    <td className="border p-2 dark:border-white/10">{center.leader_name || '-'}</td>
                    <td className="border p-2 dark:border-white/10">{center.recommender_username || '-'}</td>
                    <td className="border p-2 dark:border-white/10">{center.recommender_name || '-'}</td>
                    <td className="border p-2 dark:border-white/10">{center.center_phone || '-'}</td>
                    <td className="border p-2 space-x-1 dark:border-white/10">
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
