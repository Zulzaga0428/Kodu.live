import { useState, useEffect } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: string;
};

const API = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/^\/kode-live/, "");

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
    window.location.href = "/login";
  };

  return { user, loading, logout };
}
