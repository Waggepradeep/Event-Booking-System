import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check session on mount and periodically
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }

    // Check session every 5 minutes
    const interval = setInterval(() => {
      const token = localStorage.getItem('authToken');
      if (token && !user) {
        fetchCurrentUser();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      // Backend returns { user: {...} }
      const userData = response.user || response;
      setUser(userData);
      setError(null);
      console.log('✓ User session restored:', userData?.email);
    } catch (err) {
      console.error('✗ Failed to fetch user:', err.message);
      localStorage.removeItem('authToken');
      setUser(null);
      setError('Session expired. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const userData = response.user || response;
      setUser(userData);
      setError(null);
      console.log('✓ Login successful:', userData?.email);
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      console.error('✗ Login failed:', errorMessage);
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      const user = response.user || response;
      setUser(user);
      setError(null);
      console.log('✓ Registration successful:', user?.email);
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      console.error('✗ Registration failed:', errorMessage);
      throw err;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setError(null);
    console.log('✓ Logout successful');
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
