import React from 'react';
import { Navigate } from 'react-router-dom';

interface DoctorProtectedRouteProps {
  children: React.ReactNode;
}

const DoctorProtectedRoute: React.FC<DoctorProtectedRouteProps> = ({ children }) => {
  const doctorSession = localStorage.getItem('doctorSession');
  const doctorId = localStorage.getItem('doctorId');
  
  if (doctorSession !== 'yes' || !doctorId) {
    return <Navigate to="/doctor/login" replace />;
  }
  
  return <>{children}</>;
};

export default DoctorProtectedRoute;
