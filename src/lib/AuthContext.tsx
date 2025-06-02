import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  checkUserProfile: (uid: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Check if a user has completed their profile
  const checkUserProfile = async (uid: string): Promise<boolean> => {
    try {
      const patientDoc = await getDoc(doc(db, 'patients', uid));
      if (!patientDoc.exists()) {
        return false;
      }
      
      // Check if all required fields are filled
      const data = patientDoc.data();
      const requiredFields = ['name', 'email', 'phone', 'dateOfBirth', 'gender'];
      
      for (const field of requiredFields) {
        if (!data[field] || data[field].trim() === '') {
          console.log(`User profile incomplete: missing ${field}`);
          return false;
        }
      }
      
      // For phone number, check if it's exactly 11 digits
      if (data.phone && data.phone.replace(/\D/g, '').length !== 11) {
        console.log('User profile incomplete: phone number not 11 digits');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking user profile:', error);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if the user has a complete patient profile
        const hasCompleteProfile = await checkUserProfile(user.uid);
        console.log('Auth state changed - User:', user.uid, 'Has complete profile:', hasCompleteProfile);
        
        // If user doesn't have a complete profile, mark as new user and set localStorage flag
        if (!hasCompleteProfile) {
          console.log('User needs to complete profile - setting isNewUser flag');
          setIsNewUser(true);
          // Use localStorage for persistence
          window.localStorage.setItem('forceProfileCompletion', 'true');
          // Also set a session cookie for better mobile support
          document.cookie = 'forceProfileCompletion=true; path=/; max-age=86400'; // 24 hours
        } else {
          setIsNewUser(false);
          window.localStorage.removeItem('forceProfileCompletion');
          // Clear the cookie as well
          document.cookie = 'forceProfileCompletion=; path=/; max-age=0';
        }
      } else {
        setIsNewUser(false);
        window.localStorage.removeItem('forceProfileCompletion');
        // Clear the cookie as well
        document.cookie = 'forceProfileCompletion=; path=/; max-age=0';
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    // Check if this email belongs to a doctor
    const doctorsQuery = query(
      collection(db, 'doctors'),
      where('email', '==', email)
    );
    
    const doctorSnapshot = await getDocs(doctorsQuery);
    
    if (!doctorSnapshot.empty) {
      // This email belongs to a doctor, redirect to doctor login
      throw new Error('This email is registered as a doctor. Please use the doctor login page.');
    }
    
    // Set session persistence (will be cleared when browser is closed)
    await setPersistence(auth, browserSessionPersistence);
    
    // Proceed with normal login for patients
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if the user has a complete profile
    const hasCompleteProfile = await checkUserProfile(userCredential.user.uid);
    if (!hasCompleteProfile) {
      console.log('Login: User profile incomplete - forcing profile completion');
      setIsNewUser(true);
      window.localStorage.setItem('forceProfileCompletion', 'true');
      document.cookie = 'forceProfileCompletion=true; path=/; max-age=86400'; // 24 hours
    }
    
    return userCredential.user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    // Set session persistence (will be cleared when browser is closed)
    await setPersistence(auth, browserSessionPersistence);
    
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if this email belongs to a doctor
    if (result.user && result.user.email) {
      const doctorsQuery = query(
        collection(db, 'doctors'),
        where('email', '==', result.user.email)
      );
      
      const doctorSnapshot = await getDocs(doctorsQuery);
      
      if (!doctorSnapshot.empty) {
        // This email belongs to a doctor, sign out and throw error
        await signOut(auth);
        throw new Error('This email is registered as a doctor. Please use the doctor login page.');
      }
      
      // Check if this is a new user (for patients)
      const hasProfile = await checkUserProfile(result.user.uid);
      
      // IMPORTANT: Force isNewUser to true for Google sign-ins without a profile
      // This ensures Google sign-in users are properly directed to complete their profile
      if (!hasProfile) {
        setIsNewUser(true);
        // Store flags to indicate this is a new user that needs to complete profile
        window.localStorage.setItem('forceProfileCompletion', 'true');
        // Also set a session cookie for better mobile support
        document.cookie = 'forceProfileCompletion=true; path=/; max-age=3600';
        console.log('Google login - New user detected, profile needed');
      } else {
        setIsNewUser(false);
        window.localStorage.removeItem('forceProfileCompletion');
        // Clear the cookie as well
        document.cookie = 'forceProfileCompletion=; path=/; max-age=0';
        console.log('Google login - Existing user with profile');
      }
    }
    
    return result.user;
  };

  const register = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    setIsNewUser(true); // New user registered, needs to complete profile
    
    // Explicitly set flags to force profile completion
    window.localStorage.setItem('forceProfileCompletion', 'true');
    document.cookie = 'forceProfileCompletion=true; path=/; max-age=3600';
    console.log('Email registration - New user created, profile needed');
    
    return userCredential.user;
  };

  const logout = async () => {
    await signOut(auth);
    setIsNewUser(false);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value = {
    user,
    loading,
    isNewUser,
    login,
    loginWithGoogle,
    register,
    logout,
    resetPassword,
    checkUserProfile,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
