// ✅ 파일 경로: src/pages/NoticePage.jsx
import { useEffect, useState } from "react";
import axios from "../axiosConfig";

export default function NoticePage() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await axios.get("/notices");
        setNotices(res.data);
      } catch (err) {
        console.error("❌ 공지사항 불러오기 실패:", err);
      }
    };
    fetchNotices();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">📢 공지사항</h1>
      <ul className="space-y-4">
        {notices.map((notice) => (
          <li key={notice.id} className="p-4 bg-white rounded-xl shadow">
            <h2 className="text-lg font-semibold text-blue-700">{notice.title}</h2>
            <p className="text-gray-700 mt-1 whitespace-pre-line">{notice.content}</p>
            <p className="text-sm text-gray-400 mt-2">{new Date(notice.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
