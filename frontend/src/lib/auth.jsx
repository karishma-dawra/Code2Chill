import React, {createContext, useContext, useEffect, useState} from 'react';
import {api} from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({children}) {
  const [token, setToken] = useState(() => localStorage.getItem('c2c_token') || '');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('c2c_user') || 'null'));

  function login(newToken, newUser) {
    localStorage.setItem('c2c_token', newToken);
    localStorage.setItem('c2c_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('c2c_token');
    localStorage.removeItem('c2c_user');
    setToken('');
    setUser(null);
  }

  // Refreshes the stored profile; signs the user out if the account is suspended or the token expired.
  async function refresh() {
    if (!token) return;
    try {
      const fresh = await api('/me', {token});
      localStorage.setItem('c2c_user', JSON.stringify(fresh));
      setUser(fresh);
    } catch (error) {
      if (error.status === 401 || error.status === 403) logout();
    }
  }

  useEffect(() => { refresh(); }, [token]);

  return (
    <AuthContext.Provider value={{token, user, login, logout, refresh}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
