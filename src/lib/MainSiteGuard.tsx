import React, { useEffect } from 'react';
import { auth } from './firebase';

interface MainSiteGuardProps {
  children: React.ReactNode;
}

/**
 * MainSiteGuard component
 * 
 * This component ensures that doctor, admin, and lab operator authentication sessions 
 * don't leak into the main website. It checks if there's a specialized session in localStorage 
 * but the user is trying to access the main site, and if so, it clears the session data 
 * and signs out from Firebase auth.
 */
const MainSiteGuard: React.FC<MainSiteGuardProps> = ({ children }) => {
  useEffect(() => {
    // Check for various session types in localStorage
    const doctorSession = localStorage.getItem('doctorSession');
    const doctorId = localStorage.getItem('doctorId');
    const adminSession = localStorage.getItem('adminSession');
    const labOperatorSession = localStorage.getItem('labOperatorSession');
    const labOperatorId = localStorage.getItem('labOperatorId');
    
    // Check if any specialized session exists
    const hasSpecializedSession = 
      doctorSession === 'yes' || 
      doctorId || 
      adminSession === 'yes' || 
      labOperatorSession || 
      labOperatorId;
    
    if (hasSpecializedSession) {
      console.log('Specialized session detected on main site, clearing all sessions...');
      
      // Clear doctor session data
      localStorage.removeItem('doctorSession');
      localStorage.removeItem('doctorId');
      localStorage.removeItem('doctorEmail');
      
      // Clear admin session data
      localStorage.removeItem('adminSession');
      localStorage.removeItem('adminSessionExpires');
      
      // Clear lab operator session data
      localStorage.removeItem('labOperatorSession');
      localStorage.removeItem('labOperatorId');
      localStorage.removeItem('labOperatorEmail');
      
      // Sign out from Firebase auth to ensure a clean state
      auth.signOut().then(() => {
        console.log('Successfully signed out from specialized portal');
      }).catch(error => {
        console.error('Error signing out:', error);
      });
    }
  }, []);
  
  return <>{children}</>;
};

export default MainSiteGuard;
