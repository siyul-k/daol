// ✅ 파일 경로: frontend/src/pages/TreePage.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './TreeStyle.css';

export default function TreePage() {
  const [treeData, setTreeData] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const isAdmin = currentUser?.is_admin;
        const endpoint = isAdmin
          ? '/api/tree/sponsor'
          : `/api/tree/sponsor?username=${currentUser.username}`;
        const res = await axios.get(endpoint);
        setTreeData(res.data.tree);
      } catch (err) {
        console.error('❌ 조직도 불러오기 실패:', err);
      }
    };

    fetchTree();
  }, []);

  const renderTree = (node) => {
    if (!node) return null;

    return (
      <div className="tree-node" key={node.username}>
        <div className="node-box">
          <div className="username">{node.username}</div>
          <div className="name">{node.name}</div>
          <div className="date">{node.created_at?.slice(2, 10) || ''}</div>
          <div className="sales">({node.sales})</div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="tree-children">
            {node.children.map((child) => renderTree(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tree-page">
      <h2 className="tree-title">후원 계보 조직도</h2>
      <div className="tree-container">
        {treeData ? renderTree(treeData) : <p>로딩 중...</p>}
      </div>
    </div>
  );
}
