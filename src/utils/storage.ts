import { User, Item } from '../types';

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

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


export interface PendingOperation {
  id: string; 
  type: 'create' | 'update' | 'delete';
  item: Partial<Item>;
  timestamp: number;
}

export const getPendingOperations = (): PendingOperation[] => {
  const pending = localStorage.getItem('pendingOperations');
  return pending ? JSON.parse(pending) : [];
};

export const setPendingOperations = (operations: PendingOperation[]): void => {
  localStorage.setItem('pendingOperations', JSON.stringify(operations));
};

export const addPendingOperation = (operation: PendingOperation): void => {
  const operations = getPendingOperations();
  operations.push(operation);
  setPendingOperations(operations);
};

export const removePendingOperation = (id: string): void => {
  const operations = getPendingOperations();
  const filtered = operations.filter(op => op.id !== id);
  setPendingOperations(filtered);
};

export const clearPendingOperations = (): void => {
  localStorage.removeItem('pendingOperations');
};

export const clearStorage = (): void => {
  removeToken();
  removeUser();
  removeItems();
  clearPendingOperations();
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};