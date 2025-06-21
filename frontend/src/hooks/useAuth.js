// ✅ 파일 위치: src/hooks/useAuth.js

import { useState, useEffect } from "react";

/**
 * 아주 간단한 예제 훅입니다.
 * - 로그인할 때 localStorage.setItem("username", yourUsername) 해두셨다면
 * - 이 훅이 그 값을 꺼내 옵니다.
 */
export function useAuth() {
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("username");
    if (saved) {
      setUsername(saved);
    }
  }, []);

  return { username };
}
