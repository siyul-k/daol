// ✅ 파일 경로: src/pages/RecommendTreePage.jsx
import React, { useEffect, useState, useRef } from 'react';
import Tree from 'react-d3-tree';
import axios from '../axiosConfig';

const containerStyles = {
  width: '100%',
  height: '100vh',
};

const RecommendTreePage = ({ username, isAdmin = false }) => {
  const [treeData, setTreeData] = useState(null);
  const treeRef = useRef();

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const endpoint = isAdmin
          ? '/api/tree/recommend'
          : `/api/tree/recommend?username=${username}`;

        const response = await axios.get(endpoint);
        if (response.data.success) {
          setTreeData(response.data.tree);
        } else {
          alert(response.data.message || '트리 로딩 실패');
        }
      } catch (err) {
        console.error('❌ 트리 API 에러:', err);
        alert('트리 데이터를 불러오지 못했습니다.');
      }
    };

    fetchTree();
  }, [username, isAdmin]);

  const renderNode = ({ nodeDatum }) => (
    <g>
      <rect width="180" height="70" x="-90" y="-35" rx="10" ry="10" fill="#e6f0ff" stroke="#333" />
      <text x="0" y="-10" textAnchor="middle" fontWeight="bold" fill="#000">
        {nodeDatum.username}
      </text>
      <text x="0" y="10" textAnchor="middle" fontSize="12" fill="#333">
        {nodeDatum.name}
      </text>
      <text x="0" y="26" textAnchor="middle" fontSize="11" fill="#666">
        {nodeDatum.sales.toLocaleString()} PV
      </text>
    </g>
  );

  return (
    <div style={containerStyles} ref={treeRef}>
      {treeData && (
        <Tree
          data={treeData}
          translate={{ x: 400, y: 100 }}
          nodeSize={{ x: 250, y: 120 }}
          orientation="vertical"
          renderCustomNodeElement={renderNode}
          zoomable
          enableLegacyTransitions
          separation={{ siblings: 1, nonSiblings: 1.5 }}
        />
      )}
    </div>
  );
};

export default RecommendTreePage;
