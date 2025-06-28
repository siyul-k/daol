// ✅ 파일 위치: src/hooks/useAuth.js

import { useState, useEffect } from "react";

/**
 * 아주 간단한 예제 훅입니다.
 * - 로그인할 때 localStorage.setItem("username", `${member_id}:${username}`) 형태로 저장했다고 가정합니다.
 * - 이 훅은 member_id만 꺼내 반환합니다.
 */
export function useAuth() {
  const [member_id, setMemberId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("username");
    if (saved) {
      // "member_id:username" 형태이므로 앞부분만
      const [id] = saved.split(":");
      setMemberId(id);
    }
  }, []);

  return { member_id };
}
