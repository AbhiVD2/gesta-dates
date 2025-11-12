import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import PatientDashboard from './PatientDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Route based on role
  if (userRole === 'patient') {
    return <PatientDashboard />;
  }

  if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'subadmin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>No role assigned. Please contact administrator.</p>
    </div>
  );
}
