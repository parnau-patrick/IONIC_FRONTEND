import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../config/api';
import { User, AuthContextType, AuthResult } from '../types';
import { 
  getToken, 
  setToken, 
  removeToken, 
  getUser, 
  setUser as saveUser,  
  clearStorage 
} from '../utils/storage';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getToken();
    const savedUser = getUser();
    
    if (token && savedUser) {
      setUserState(savedUser);
    }
    
    setLoading(false);
  }, []);

  const register = async (username: string, email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await api.post('/api/auth/register', {
        username,
        email,
        password
      });
      
      const { token, user } = response.data;
      
      setToken(token);
      saveUser(user); 
      setUserState(user);
      
      return { success: true, user };
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const login = async (username: string, password: string): Promise<AuthResult> => {
    try {
      const response = await api.post('/api/auth/login', {
        username,
        password
      });
      
      const { token, user } = response.data;
      
      setToken(token);
      saveUser(user);
      
      setUserState(user);
      
      return { success: true, user };
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  };

  const logout = (): void => {
    clearStorage();
    setUserState(null);
  };

  const getCurrentUser = async (): Promise<AuthResult> => {
    try {
      const response = await api.get('/api/auth/me');
      const userData = response.data.user;
      
      saveUser(userData);  
      setUserState(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      logout();
      return { success: false, error: 'Failed to get user data' };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    register,
    login,
    logout,
    getCurrentUser,
    isAuthenticated: !!user
  };

  return (
  <AuthContext.Provider value={value}>
    {loading ? null : children}
  </AuthContext.Provider>
);
};

export default AuthContext;