import React from 'react';
import { useAuth } from './hooks/useAuth';
import { useUserRole } from './hooks/useUserRole';
import Login from './components/Login';
import StudentDashboard from './components/roles/StudentDashboard';
import TutorDashboard from './components/roles/TutorDashboard';
import AdminDashboard from './components/roles/AdminDashboard';
import { auth } from './services/firebase';
import './App.css';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole();

  const getRoleName = (role) => {
    switch(role) {
      case 'admin': return 'Administrador';
      case 'tutor': return 'Tutor';
      case 'student': return 'Pasante';
      default: return 'Usuario';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'tutor': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderDashboard = () => {
    switch(userRole) {
      case 'admin':
        return <AdminDashboard />;
      case 'tutor':
        return <TutorDashboard />;
      case 'student':
        return <StudentDashboard />;
      default:
        return <StudentDashboard />;
    }
  };

  if (authLoading || roleLoading) {
   
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        
      </header>
      <main>
        {renderDashboard()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600 mb-2 md:mb-0">
              © 2024 Trustify - Sistema de Certificación de Pasantías
            </div>
            <div className="flex space-x-4 text-sm text-gray-500">
              <span>Usuario: {user.email}</span>
              <span>•</span>
              <span>Rol: {getRoleName(userRole)}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;