import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

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

  // ✅ username 또는 member_id를 숫자 member_id로 변환
  const getMemberIdByUsername = async (input) => {
    if (!input) return '';
    if (/^\d+$/.test(input)) return input; // 숫자면 그대로
    try {
      const res = await axios.get(`/api/admin/centers/member-id-by-username/${input}`);
      return res.data.id || '';
    } catch {
      return '';
    }
  };

  // ✅ member_id로 회원 이름 조회
  const getMemberName = async (member_id, setName) => {
    if (!member_id) return setName('');
    if (!/^\d+$/.test(member_id)) {
      // 아이디(문자) 입력시 숫자 ID로 변환
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
    // 숫자 ID로 변환
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
      alert(err.response.data.error);
    }
  };

  const handleEdit = async (center) => {
    setEditId(center.id);
    setEditForm({
      center_name: center.name,
      center_owner: center.center_owner_id, // member_id
      center_recommender: center.center_recommender_id, // member_id
      center_phone: center.center_phone || ''
    });
    getMemberName(center.center_owner_id, setEditLeaderName);
    getMemberName(center.center_recommender_id, setEditRecommenderName);
  };

  const handleEditSave = async (id) => {
    // 숫자 ID로 변환
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
          placeholder="센터장 아이디 또는 member_id"
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
          placeholder="센터추천자 아이디 또는 member_id"
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
        <input
          type="text"
          placeholder="전화번호"
          value={form.center_phone}
          onChange={(e) => setForm({ ...form, center_phone: e.target.value })}
          className="border p-1 text-center"
        />
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
            <th className="border p-2">추천자이름</th>
            <th className="border p-2">전화번호</th>
            <th className="border p-2">관리</th>
          </tr>
        </thead>
        <tbody>
          {centers.map((center, idx) => (
            <tr key={center.id}>
              <td className="border p-2">{idx + 1}</td>
              <td className="border p-2">{center.created_at?.slice(0, 19).replace('T', ' ') || '-'}</td>
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
  );
};

export default AdminCentersPage;
