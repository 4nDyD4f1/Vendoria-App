import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true selama cek sesi awal (/me)

  useEffect(() => {
    api('/api/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const u = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    setUser(u);
    return u;
  };

  // Register lalu langsung login (sesuai alur: setelah daftar user langsung masuk).
  const register = async (data) => {
    await api('/api/auth/register', { method: 'POST', body: data });
    return login(data.email, data.password);
  };

  const logout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
