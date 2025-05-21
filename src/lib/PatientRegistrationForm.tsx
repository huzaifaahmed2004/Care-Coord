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
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-[#F6F8FB] px-2 sm:px-4 py-2 sm:py-10 w-full">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 max-w-md w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#14396D] mb-4 sm:mb-6 text-center">
          {step === 'credentials' ? 'Create your CareCoord Account' : 'Complete Your Patient Profile'}
        </h1>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {/* Step 1: Account Credentials */}
        {step === 'credentials' && (
          <>
            <form onSubmit={handleEmailPasswordSignup} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block mb-1 font-medium text-sm">Email</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2 sm:px-4 sm:py-2 focus:outline-[#FF3D71]"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-sm">Password</label>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2 sm:px-4 sm:py-2 focus:outline-[#FF3D71]"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-sm">Confirm Password</label>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2 sm:px-4 sm:py-2 focus:outline-[#FF3D71]"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-[#FF3D71] hover:bg-[#ff5996] text-white font-semibold py-2 px-3 sm:px-4 rounded w-full mt-1 sm:mt-2 text-sm sm:text-base"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </form>
            
            <div className="my-3 sm:my-4 text-center text-xs sm:text-sm text-gray-500">OR</div>
            
            <button
              className="w-full bg-white text-[#14396D] border hover:bg-[#F6F8FB] font-semibold py-2 px-3 sm:px-4 rounded flex items-center justify-center gap-2 mb-2 text-sm sm:text-base"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png" className="w-5 h-5" alt="Google logo" />
              Continue with Google
            </button>
            
            <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="text-[#3373FF] hover:underline font-semibold">
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
