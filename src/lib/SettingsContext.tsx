import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

interface SettingsContextType {
  baseAppointmentFee: number;
  updateBaseAppointmentFee: (fee: number) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => useContext(SettingsContext);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [baseAppointmentFee, setBaseAppointmentFee] = useState<number>(1000);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from Firestore
  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setError(null);
      
      try {
        const settingsRef = doc(collection(db, 'settings'), 'global');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.baseAppointmentFee) {
            setBaseAppointmentFee(data.baseAppointmentFee);
          }
        } else {
          // Initialize settings if they don't exist
          await setDoc(settingsRef, { 
            baseAppointmentFee: 1000,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('Error loading settings:', e);
        setError('Failed to load application settings');
      }
      
      setLoading(false);
    }
    
    loadSettings();
  }, []);
  
  // Update base appointment fee
  const updateBaseAppointmentFee = async (fee: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const settingsRef = doc(collection(db, 'settings'), 'global');
      await setDoc(settingsRef, { 
        baseAppointmentFee: fee,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setBaseAppointmentFee(fee);
    } catch (e) {
      console.error('Error updating base appointment fee:', e);
      setError('Failed to update base appointment fee');
      throw e;
    }
    
    setLoading(false);
  };
  
  const value = {
    baseAppointmentFee,
    updateBaseAppointmentFee,
    loading,
    error
  };
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
