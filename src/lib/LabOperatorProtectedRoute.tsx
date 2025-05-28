import React from 'react';
import { Navigate } from 'react-router-dom';

interface LabOperatorProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * LabOperatorProtectedRoute component
 * 
 * This component ensures that only authenticated lab operators can access protected routes.
 * If no valid lab operator session is found, it redirects to the lab operator login page.
 */
const LabOperatorProtectedRoute: React.FC<LabOperatorProtectedRouteProps> = ({ children }) => {
  // Check if there's a valid lab operator session in localStorage
  const labOperatorSessionStr = localStorage.getItem('labOperatorSession');
  
  // If no session exists, redirect to login
  if (!labOperatorSessionStr) {
    return <Navigate to="/LabOperator/login" replace />;
  }
  
  // Try to parse the session data
  try {
    const labOperatorSession = JSON.parse(labOperatorSessionStr);
    
    // Check if the session is valid
    if (!labOperatorSession.isAuthenticated) {
      return <Navigate to="/LabOperator/login" replace />;
    }
  } catch (error) {
    // If there's an error parsing the session data, it's invalid
    console.error('Invalid lab operator session:', error);
    localStorage.removeItem('labOperatorSession');
    return <Navigate to="/LabOperator/login" replace />;
  }
  
  // If session exists, render the protected content
  return <>{children}</>;
};

export default LabOperatorProtectedRoute;
