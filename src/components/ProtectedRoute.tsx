import { Redirect } from 'react-router-dom';  // ← SCHIMBAT de la Navigate
import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

// Component pentru rute protejate (necesită autentificare)
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;  // ← SCHIMBAT de la Navigate
  }

  return <>{children}</>;
};

export default ProtectedRoute;