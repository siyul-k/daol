// ✅ 파일 경로: src/pages/RecommendTreePage.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import TreeNode from '../components/TreeNode';
import '../styles/TreeStyle.css';

export default function RecommendTreePage() {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await axios.get(`/api/tree/recommend?username=${currentUser.username}`);
        setTreeData(res.data);
      } catch (err) {
        console.error('추천 트리 조회 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, []);

  return (
    <div className="admin-container">
      <h2 className="tree-title">추천 계보 조직도</h2>
      {loading ? (
        <p>불러오는 중...</p>
      ) : treeData ? (
        <div className="tree-wrapper">
          <TreeNode node={treeData} />
        </div>
      ) : (
        <p className="no-data">조직도 데이터가 없습니다.</p>
      )}
    </div>
  );
}
