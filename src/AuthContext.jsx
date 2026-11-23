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
    setUser(u.two_factor_required ? null : u);
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

  const updateProfile = async (data) => {
    const updated = await api('/api/account/profile', { method: 'PUT', body: data });
    setUser(updated);
    return updated;
  };

  const verifyTwoFactor = async (otp) => {
    const result = await api('/api/auth/two-factor/verify', { method: 'POST', body: { otp } });
    if (result.user) setUser(result.user);
    return result;
  };

  const refreshUser = async () => {
    const updated = await api('/api/auth/me');
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, verifyTwoFactor, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
