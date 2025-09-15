// ✅ 파일 위치: src/hooks/useAuth.js

import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedAdmin = localStorage.getItem("admin");

    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedAdmin) setAdmin(JSON.parse(savedAdmin));
  }, []);

  return { user, admin };
}

