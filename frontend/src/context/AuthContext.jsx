import { createContext, useContext, useState } from 'react';
import { authAPI } from '../services/api';
import { getDisplayUser } from '../utils/displayNames';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return null;
  });
  const loading = false;

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user: userData } = res.data;
    // Apply display name overrides
    const displayUser = getDisplayUser(userData);
    
    // DEBUG: Log role information
    console.log('[DEBUG] Login successful');
    console.log('[DEBUG] Backend returned user:', userData);
    console.log('[DEBUG] User role:', userData?.role);
    console.log('[DEBUG] User role type:', typeof userData?.role);
    console.log('[DEBUG] After display override:', displayUser);
    console.log('[DEBUG] Display override role:', displayUser?.role);
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(displayUser));
    setUser(displayUser);
    return displayUser;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    const { token, user: userData } = res.data;
    // Apply display name overrides
    const displayUser = getDisplayUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(displayUser));
    setUser(displayUser);
    return displayUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const isAdmin = () => {
    return user && ['dept_admin', 'inst_admin', 'super_admin'].includes(user.role);
  };

  const isProfessor = () => {
    return user && user.role === 'professor';
  };

  const isStudent = () => {
    return user && user.role === 'student';
  };

  const canManageContent = () => {
    return user && ['professor', 'dept_admin', 'inst_admin', 'super_admin'].includes(user.role);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAdmin,
    isProfessor,
    isStudent,
    canManageContent
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
