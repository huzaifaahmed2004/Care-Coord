import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

export default function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps) {
  const { user, loading, isNewUser } = useAuth() ?? {};
  const location = useLocation();
  const [forceCompletion, setForceCompletion] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    // Check if profile completion is required
    const checkProfileCompletionRequired = () => {
      // Check localStorage
      const localStorageFlag = window.localStorage.getItem('forceProfileCompletion');
      
      // Check cookie
      const cookieFlag = document.cookie
        .split('; ')
        .find(row => row.startsWith('forceProfileCompletion='))
        ?.split('=')[1];
      
      return localStorageFlag === 'true' || cookieFlag === 'true';
    };

    if (!loading) {
      const needsCompletion = checkProfileCompletionRequired();
      setForceCompletion(needsCompletion);
      setCheckingStatus(false);
    }
  }, [loading, user, isNewUser]);

  // If still loading or checking status, show nothing
  if (loading || checkingStatus) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If profile completion is forced and we're not already on the complete-profile page
  if (forceCompletion && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" state={{ from: location }} replace />;
  }

  // Otherwise, render children
  return <>{children}</>;
}
