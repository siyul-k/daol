// ✅ 파일 경로: src/pages/NoticePage.jsx
import { useEffect, useState } from "react";
import axios from "../axiosConfig";

export default function NoticePage() {
  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await axios.get("/api/notices");
        setNotices(res.data);
      } catch (err) {
        console.error("❌ 공지사항 불러오기 실패:", err);
      }
    };
    fetchNotices();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">공지사항</h1>
      <ul className="space-y-4">
        {notices.map((notice) => (
          <li
            key={notice.id}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow cursor-pointer 
                       hover:bg-blue-50 dark:hover:bg-gray-700 transition"
            onClick={() => setSelectedNotice(notice)}
          >
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              {notice.title}
            </h2>
            <p className="text-gray-700 dark:text-gray-100 mt-1 whitespace-pre-line">
              {notice.content.length > 80
                ? notice.content.slice(0, 80) + "..."
                : notice.content}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {new Date(notice.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>

      {/* 모달 */}
      {selectedNotice && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 relative animate-fade-in">
            <button
              className="absolute top-2 right-4 text-2xl text-gray-400 dark:text-gray-300 hover:text-pink-400 font-bold"
              onClick={() => setSelectedNotice(null)}
            >
              ×
            </button>
            <h2 className="text-xl font-extrabold text-blue-700 dark:text-blue-400 mb-2">
              {selectedNotice.title}
            </h2>
            <div className="text-gray-700 dark:text-gray-100 whitespace-pre-line mb-4">
              {selectedNotice.content}
            </div>
            <div className="text-right text-xs text-gray-400 dark:text-gray-500">
              {new Date(selectedNotice.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
