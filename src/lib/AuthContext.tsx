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
  login: (email: string, password: string) => Promise<void>;
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
      return patientDoc.exists();
    } catch (error) {
      console.error('Error checking user profile:', error);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if the user has a patient profile
        const hasProfile = await checkUserProfile(user.uid);
        setIsNewUser(!hasProfile);
      } else {
        setIsNewUser(false);
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
      // This email belongs to a doctor, don't allow login through the main website
      throw new Error('This email is registered as a doctor. Please use the doctor login page.');
    }
    
    // Set session persistence (will be cleared when browser is closed)
    await setPersistence(auth, browserSessionPersistence);
    
    // Proceed with normal login for patients
    await signInWithEmailAndPassword(auth, email, password);
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
      setIsNewUser(!hasProfile);
    }
    
    return result.user;
  };

  const register = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    setIsNewUser(true); // New user registered, needs to complete profile
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
