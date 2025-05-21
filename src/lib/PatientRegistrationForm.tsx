import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

interface PatientData {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  allergies: string;
  medicalHistory: string;
  emergencyContact: string;
  insuranceInfo: string;
}

export default function PatientRegistrationForm() {
  const navigate = useNavigate();
  const { user, register, loginWithGoogle, isNewUser } = useAuth() ?? {};
  
  // Registration step state
  const [step, setStep] = useState<'credentials' | 'patient-info'>(user ? 'patient-info' : 'credentials');
  
  // Auth credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  
  // Patient information
  const [patientData, setPatientData] = useState<PatientData>({
    name: '',
    email: user?.email || '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    allergies: '',
    medicalHistory: '',
    emergencyContact: '',
    insuranceInfo: ''
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if user is already logged in but needs to complete profile
  useEffect(() => {
    if (user) {
      setPatientData(prev => ({
        ...prev,
        email: user.email || ''
      }));
      setStep('patient-info');
    }
  }, [user]);
  
  // Redirect to home if user is logged in and has completed profile
  useEffect(() => {
    if (user && !isNewUser) {
      navigate('/');
    }
  }, [user, isNewUser, navigate]);
  
  // Handle email/password registration
  const handleEmailPasswordSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create the user account using the AuthContext register function
      await register?.(email, password);
      
      // Move to patient info step
      setPatientData(prev => ({
        ...prev,
        email: email
      }));
      setStep('patient-info');
    } catch (err: unknown) {
      const errorMessage = err instanceof FirebaseError 
        ? err.message 
        : 'Registration failed.';
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  // Handle Google sign-in
  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the AuthContext loginWithGoogle function
      const user = await loginWithGoogle?.();
      
      // If successful, update the email in patient data
      if (user && user.email) {
        setPatientData(prev => ({
          ...prev,
          email: user.email || ''
        }));
        setStep('patient-info');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof FirebaseError 
        ? err.message 
        : 'Google sign up failed.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle patient data changes
  const handlePatientDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPatientData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Submit patient information
  const handlePatientInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Authentication error. Please try again.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Save patient data to Firestore
      await setDoc(doc(collection(db, 'patients'), user.uid), {
        ...patientData,
        createdAt: new Date().toISOString()
      });
      
      // Navigate to home page
      navigate('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof FirebaseError 
        ? err.message 
        : 'Failed to save patient information.';
      setError(errorMessage);
    } finally {
      setLoading(false); // Ensure loading state is reset even if there's an error
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50 px-4 sm:px-6 py-4 sm:py-12 w-full">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-10 max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-full p-2 mb-4 shadow-md">
            {step === 'credentials' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            {step === 'credentials' ? 'Create Account' : 'Complete Your Profile'}
          </h1>
          <p className="text-gray-500 text-sm">
            {step === 'credentials' ? 'Sign up to get started with CareCoord' : 'Tell us more about yourself to personalize your experience'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {/* Step 1: Account Credentials */}
        {step === 'credentials' && (
          <>
            <form onSubmit={handleEmailPasswordSignup} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block mb-1.5 font-medium text-gray-700 text-sm">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] outline-none transition-colors"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block mb-1.5 font-medium text-gray-700 text-sm">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] outline-none transition-colors"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
              </div>
              
              <div>
                <label className="block mb-1.5 font-medium text-gray-700 text-sm">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] outline-none transition-colors"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-[#3373FF] hover:bg-[#2860e0] text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-[#3373FF] focus:outline-none mt-2"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : 'Continue'}
              </button>
            </form>
            
            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-gray-200 w-full"></div>
              <div className="absolute bg-white px-4 text-sm text-gray-500">OR</div>
            </div>
            
            <button
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 border border-gray-300 rounded-lg flex items-center justify-center gap-3 transition-colors shadow-sm"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            
            <div className="text-center mt-6 text-sm text-gray-600">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="text-[#3373FF] hover:text-[#2860e0] font-medium transition-colors ml-1">
                Sign in
              </button>
            </div>
          </>
        )}
        
        {/* Step 2: Patient Information */}
        {step === 'patient-info' && (
          <form onSubmit={handlePatientInfoSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block mb-1 font-medium text-sm">Full Name*</label>
                <input
                  type="text"
                  name="name"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71]"
                  value={patientData.name}
                  onChange={handlePatientDataChange}
                  required
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block mb-1 font-medium text-sm">Email*</label>
                <input
                  type="email"
                  name="email"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71] bg-gray-100"
                  value={patientData.email}
                  readOnly
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium text-sm">Phone Number*</label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71]"
                  value={patientData.phone}
                  onChange={handlePatientDataChange}
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium text-sm">Date of Birth*</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71]"
                  value={patientData.dateOfBirth}
                  onChange={handlePatientDataChange}
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium text-sm">Gender*</label>
                <select
                  name="gender"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71]"
                  value={patientData.gender}
                  onChange={handlePatientDataChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-1 font-medium text-sm">Blood Type</label>
                <select
                  name="bloodType"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71]"
                  value={patientData.bloodType}
                  onChange={handlePatientDataChange}
                >
                  <option value="">Select Blood Type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block mb-1 font-medium text-sm">Address*</label>
                <input
                  type="text"
                  name="address"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71]"
                  value={patientData.address}
                  onChange={handlePatientDataChange}
                  required
                  placeholder="Street address, city, state, zip code"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block mb-1 font-medium text-sm">Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71]"
                  value={patientData.allergies}
                  onChange={handlePatientDataChange}
                  placeholder="List any allergies (if none, leave blank)"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block mb-1 font-medium text-sm">Medical History</label>
                <textarea
                  name="medicalHistory"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71]"
                  value={patientData.medicalHistory}
                  onChange={handlePatientDataChange}
                  rows={3}
                  placeholder="Briefly describe any significant medical history"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block mb-1 font-medium text-sm">Emergency Contact*</label>
                <input
                  type="text"
                  name="emergencyContact"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71]"
                  value={patientData.emergencyContact}
                  onChange={handlePatientDataChange}
                  required
                  placeholder="Name, relationship, and phone number"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block mb-1 font-medium text-sm">Insurance Information</label>
                <input
                  type="text"
                  name="insuranceInfo"
                  className="w-full border rounded px-3 py-2 focus:outline-[#FF3D71]"
                  value={patientData.insuranceInfo}
                  onChange={handlePatientDataChange}
                  placeholder="Insurance provider and policy number"
                />
              </div>
            </div>
            
            <div className="flex justify-between gap-4 pt-4">
              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="bg-[#FF3D71] hover:bg-[#ff5996] text-white font-semibold py-2 px-6 rounded"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
