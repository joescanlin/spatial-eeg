import React, { createContext, useContext, useState } from 'react';
import { ptLogin } from '../api/ptApi';

const AuthCtx = createContext<any>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string>(localStorage.getItem('jwt') || '');

  const login = async (email: string, pw: string) => {
    const t = await ptLogin(email, pw);
    localStorage.setItem('jwt', t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    setToken('');
  };

  return (
    <AuthCtx.Provider value={{ token, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx); 