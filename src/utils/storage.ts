import { User, Item } from '../types';

// Token management
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

// User management
export const getUser = (): User | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user: User): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const removeUser = (): void => {
  localStorage.removeItem('user');
};

// Items management (pentru offline support)
export const getItems = (): Item[] => {
  const items = localStorage.getItem('items');
  return items ? JSON.parse(items) : [];
};

export const setItems = (items: Item[]): void => {
  localStorage.setItem('items', JSON.stringify(items));
};

export const removeItems = (): void => {
  localStorage.removeItem('items');
};

// Logout - curăță tot
export const clearStorage = (): void => {
  removeToken();
  removeUser();
  removeItems();
};

// Check dacă user-ul e autentificat
export const isAuthenticated = (): boolean => {
  return !!getToken();
};