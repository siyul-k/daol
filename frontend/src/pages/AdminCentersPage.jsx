// ✅ 파일 위치: src/pages/AdminCentersPage.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

const AdminCentersPage = () => {
  const [centers, setCenters] = useState([]);
  const [form, setForm] = useState({ center_name: '', center_owner: '', center_recommender: '' });
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

  const getMemberName = async (username, setName) => {
    if (!username) return setName('');
    try {
      const res = await axios.get(`/api/admin/centers/member-name/${username}`);
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
    await axios.post('/api/admin/centers', form);
    setForm({ center_name: '', center_owner: '', center_recommender: '' });
    setLeaderName('');
    setRecommenderName('');
    fetchCenters();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/admin/centers/${id}`);
      fetchCenters();
    } catch (err) {
      alert(err.response.data.error);
    }
  };

  const handleEdit = async (center) => {
    setEditId(center.id);
    setEditForm({
      center_name: center.name,
      center_owner: center.leader_username,
      center_recommender: center.recommender_username,
    });
    getMemberName(center.leader_username, setEditLeaderName);
    getMemberName(center.recommender_username, setEditRecommenderName);
  };

  const handleEditSave = async (id) => {
    if (!editForm.center_name || !editForm.center_owner) {
      alert('센터명과 센터장 ID는 필수입니다');
      return;
    }
    await axios.put(`/api/admin/centers/${id}`, editForm);
    setEditId(null);
    fetchCenters();
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">센터 관리</h2>

      <form onSubmit={handleSubmit} className="space-x-2 mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="센터명"
          value={form.center_name}
          onChange={(e) => setForm({ ...form, center_name: e.target.value })}
          className="border p-1 text-center"
        />
        <input
          type="text"
          placeholder="센터장 ID"
          value={form.center_owner}
          onChange={(e) => setForm({ ...form, center_owner: e.target.value })}
          className="border p-1 text-center"
        />
        <button
          type="button"
          className="px-2 bg-gray-200"
          onClick={() => getMemberName(form.center_owner, setLeaderName)}
        >
          확인
        </button>
        <span className="text-sm">{leaderName}</span>

        <input
          type="text"
          placeholder="센터추천자 ID"
          value={form.center_recommender}
          onChange={(e) => setForm({ ...form, center_recommender: e.target.value })}
          className="border p-1 text-center"
        />
        <button
          type="button"
          className="px-2 bg-gray-200"
          onClick={() => getMemberName(form.center_recommender, setRecommenderName)}
        >
          확인
        </button>
        <span className="text-sm">{recommenderName}</span>

        <button type="submit" className="bg-blue-500 text-white px-2 py-1">
          등록
        </button>
      </form>

      <table className="w-full border text-sm text-center">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">번호</th>
            <th className="border p-2">등록일</th>
            <th className="border p-2">센터명</th>
            <th className="border p-2">센터장ID</th>
            <th className="border p-2">이름</th>
            <th className="border p-2">센터추천자ID</th>
            <th className="border p-2">관리</th>
          </tr>
        </thead>
        <tbody>
          {centers.map((center, idx) => (
            <tr key={center.id}>
              <td className="border p-2">{idx + 1}</td>
              <td className="border p-2">{center.created_at?.slice(0, 10)}</td>

              {editId === center.id ? (
                <>
                  <td className="border p-2">
                    <input
                      value={editForm.center_name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, center_name: e.target.value })
                      }
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      value={editForm.center_owner}
                      onChange={(e) => {
                        setEditForm({ ...editForm, center_owner: e.target.value });
                        getMemberName(e.target.value, setEditLeaderName);
                      }}
                    />
                  </td>
                  <td className="border p-2">{editLeaderName}</td>
                  <td className="border p-2">
                    <input
                      value={editForm.center_recommender}
                      onChange={(e) => {
                        setEditForm({ ...editForm, center_recommender: e.target.value });
                        getMemberName(e.target.value, setEditRecommenderName);
                      }}
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
                  <td className="border p-2">{center.recommender_username}</td>
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
  );
};

export default AdminCentersPage;
