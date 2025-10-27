export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Item {
  id: number;
  text: string;
  completed: boolean;
  version: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItemsResponse {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateItemData {
  text: string;
  completed: boolean;
}

export interface UpdateItemData {
  text: string;
  completed: boolean;
  version: number;
}

export interface WebSocketMessage {
  event: 'authenticated' | 'created' | 'updated' | 'deleted' | 'error';
  payload: {
    userId?: number;
    connectionId?: string; 
    item?: Item;
    message?: string;
  };
}

export interface WebSocketAuthMessage {
  type: 'auth';
  token: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (username: string, email: string, password: string) => Promise<AuthResult>;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  getCurrentUser: () => Promise<AuthResult>;
  isAuthenticated: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}