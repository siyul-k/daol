// ✅ 파일 경로: frontend/src/pages/AdminAdminsPage.jsx
import React, { useState, useEffect } from "react";
import axios from "../axiosConfig";

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", password: "" });

  const fetchAdmins = async () => {
    const res = await axios.get("/api/ad-da/settings/admins");
    setAdmins(res.data);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    await axios.delete(`/api/ad-da/settings/admins/${id}`);
    fetchAdmins();
  };

  const handleSubmit = async () => {
    if (!form.username || !form.name || !form.password) {
      return alert("아이디, 이름, 비밀번호를 모두 입력해주세요.");
    }
    try {
      await axios.post("/api/ad-da/settings/admins", form);
      setForm({ username: "", name: "", password: "" });
      setShowModal(false);
      fetchAdmins();
    } catch {
      alert("관리자 추가 실패");
    }
  };

  const filtered = admins.filter(
    (a) =>
      a.username.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      <h1 className="text-xl font-bold mb-4">👤 관리자 계정 설정</h1>

      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          placeholder="아이디 또는 이름 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-1 rounded w-64
                     dark:bg-gray-800 dark:border-white/10 dark:text-gray-100"
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          onClick={() => setShowModal(true)}
        >
          + 관리자 추가
        </button>
      </div>

      <table className="w-full border border-gray-300 text-center dark:border-white/10">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="border px-3 py-2 dark:border-white/10">아이디</th>
            <th className="border px-3 py-2 dark:border-white/10">이름</th>
            <th className="border px-3 py-2 dark:border-white/10">삭제</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length > 0 ? (
            filtered.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="border px-3 py-2 dark:border-white/10">{admin.username}</td>
                <td className="border px-3 py-2 dark:border-white/10">{admin.name}</td>
                <td className="border px-3 py-2 dark:border-white/10">
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => handleDelete(admin.id)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-gray-500 dark:text-gray-400 py-4">
                결과가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 관리자 추가 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md dark:text-gray-100">
            <h2 className="text-lg font-bold mb-4">관리자 추가</h2>
            <input
              type="text"
              name="username"
              placeholder="아이디"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3
                         dark:bg-gray-700 dark:border-white/10 dark:text-gray-100"
            />
            <input
              type="text"
              name="name"
              placeholder="이름"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-3
                         dark:bg-gray-700 dark:border-white/10 dark:text-gray-100"
            />
            <input
              type="password"
              name="password"
              placeholder="비밀번호"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border px-3 py-2 rounded w-full mb-4
                         dark:bg-gray-700 dark:border-white/10 dark:text-gray-100"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded border dark:border-white/10"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
