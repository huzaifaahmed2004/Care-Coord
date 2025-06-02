import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from './firebase';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';

interface UserProfile {
  displayName: string;
  email: string;
  phoneNumber: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  allergies: string;
  medicalHistory: string;
  insuranceInfo: string;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth() ?? {};
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPasswordFields, setShowPasswordFields] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [isGoogleUser, setIsGoogleUser] = useState<boolean>(false);
  const [resetEmailSent, setResetEmailSent] = useState<boolean>(false);

  const [profile, setProfile] = useState<UserProfile>({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    allergies: '',
    medicalHistory: '',
    insuranceInfo: '',
  });

  // Fetch user profile data
  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) {
        navigate('/login');
        return;
      }
      
      // Check if user is authenticated with Google
      const isGoogle = user.providerData.some(provider => provider.providerId === 'google.com');
      setIsGoogleUser(isGoogle);

      setLoading(true);
      try {
        // Check if there's data in the patients collection
        const patientDocRef = doc(db, 'patients', user.uid);
        const patientDoc = await getDoc(patientDocRef);
        
        if (patientDoc.exists()) {
          // If patient data exists, use that
          const patientData = patientDoc.data();
          setProfile(prev => ({
            ...prev,
            displayName: patientData.name || user.displayName || '',
            email: patientData.email || user.email || '',
            phoneNumber: patientData.phone || '',
            address: patientData.address || '',
            dateOfBirth: patientData.dateOfBirth || '',
            gender: patientData.gender || '',
            bloodGroup: patientData.bloodType || '',
            allergies: patientData.allergies || '',
            medicalHistory: patientData.medicalHistory || '',
            insuranceInfo: patientData.insuranceInfo || '',
          }));
        } else {
          // If no patient data exists, create a new patient document with basic info
          const newPatientData = {
            name: user.displayName || '',
            email: user.email || '',
            phone: '',
            address: '',
            dateOfBirth: '',
            gender: '',
            bloodType: '',
            allergies: '',
            medicalHistory: '',
            insuranceInfo: '',
            createdAt: new Date().toISOString(),
          };
          
          await setDoc(patientDocRef, newPatientData);
          
          // Set profile with the new data
          setProfile(prev => ({
            ...prev,
            displayName: user.displayName || '',
            email: user.email || '',
            phoneNumber: '',
            address: '',
            dateOfBirth: '',
            gender: '',
            bloodGroup: '',
            allergies: '',
            medicalHistory: '',
            insuranceInfo: '',
          }));
          
          console.log('Created new patient profile for user:', user.uid);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load your profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for date of birth to prevent future dates
    if (name === 'dateOfBirth') {
      const selectedDate = new Date(value);
      const today = new Date();
      
      // Reset time parts to compare just the dates
      selectedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      // Only update if date is not in the future
      if (selectedDate > today) {
        setError('Date of birth cannot be in the future.');
        // Optional: Set to today's date instead
        const todayStr = today.toISOString().split('T')[0];
        setProfile(prev => ({
          ...prev,
          dateOfBirth: todayStr
        }));
        return;
      }
    }
    
    // Validation for phone number
    if (name === 'phoneNumber') {
      // Only allow digits in the input
      if (!/^\d*$/.test(value)) {
        setError('Phone number must contain only digits.');
        return;
      }
      
      // Remove any non-digit characters for validation
      const digitsOnly = value.replace(/\D/g, '');
      
      // Check if the length exceeds 11 digits
      if (digitsOnly.length > 11) {
        setError('Phone number must be exactly 11 digits.');
        return;
      }
    }
    
    // Normal handling for other fields
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update display name in Firebase Auth
      if (user.displayName !== profile.displayName) {
        await updateProfile(user, {
          displayName: profile.displayName
        });
      }
      
      // Update email in Firebase Auth if changed
      if (user.email !== profile.email && currentPassword) {
        try {
          // Re-authenticate user before changing email
          if (user.email) {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updateEmail(user, profile.email);
          }
        } catch (err) {
          throw new Error('Failed to update email. Please check your current password and try again.');
        }
      }
      
      // Get the patient document to preserve existing fields
      const patientDocRef = doc(db, 'patients', user.uid);
      const patientDoc = await getDoc(patientDocRef);
      
      // Get existing emergency contact if available
      const existingData = patientDoc.exists() ? patientDoc.data() : {};
      const emergencyContact = existingData.emergencyContact || '';
      const createdAt = existingData.createdAt || new Date().toISOString();
      
      // Update patient document with the new profile data
      await setDoc(patientDocRef, {
        name: profile.displayName,
        email: profile.email,
        phone: profile.phoneNumber,
        address: profile.address,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        bloodType: profile.bloodGroup,
        allergies: profile.allergies,
        medicalHistory: profile.medicalHistory,
        insuranceInfo: profile.insuranceInfo,
        emergencyContact: emergencyContact,
        createdAt: createdAt,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      console.log('Updated patient profile with insurance info:', profile.insuranceInfo);
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate passwords
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match.');
      }
      
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long.');
      }
      
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password. Please check your current password and try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle password reset email
  const handleSendPasswordResetEmail = async () => {
    if (!user || !user.email) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailSent(true);
      setSuccess(`Password reset email sent to ${user.email}. Please check your inbox.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error sending password reset email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send password reset email. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#14396D]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#14396D] to-[#2C5078] px-6 py-4">
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={`px-6 py-3 font-medium text-sm ${activeTab === 'profile' ? 'text-[#14396D] border-b-2 border-[#14396D]' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('profile')}
            >
              Personal Information
            </button>
            <button
              className={`px-6 py-3 font-medium text-sm ${activeTab === 'security' ? 'text-[#14396D] border-b-2 border-[#14396D]' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('security')}
            >
              Security Settings
            </button>
          </div>
          
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 rounded-md">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 m-6 rounded-md">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-700 text-sm font-medium">{success}</p>
              </div>
            </div>
          )}
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name*
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={profile.displayName}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address*
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profile.email}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  {profile.email !== user?.email && (
                    <div className="mt-2">
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password (required to change email)
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number*
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={profile.phoneNumber}
                    onChange={handleChange}
                    pattern="\d{11}"
                    maxLength={11}
                    title="Phone number must be exactly 11 digits"
                    placeholder="11 digits phone number"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth*
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={profile.dateOfBirth}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]} // Prevent future dates in date picker
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender*
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={profile.gender}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    id="bloodGroup"
                    name="bloodGroup"
                    value={profile.bloodGroup}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={profile.address}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
                    Allergies
                  </label>
                  <textarea
                    id="allergies"
                    name="allergies"
                    value={profile.allergies}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="List any allergies you have"
                  ></textarea>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="insuranceInfo" className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Information
                  </label>
                  <textarea
                    id="insuranceInfo"
                    name="insuranceInfo"
                    value={profile.insuranceInfo}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Insurance provider, policy number, and other relevant details"
                  ></textarea>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 mb-1">
                    Medical History
                  </label>
                  <textarea
                    id="medicalHistory"
                    name="medicalHistory"
                    value={profile.medicalHistory}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any relevant medical history or conditions"
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className={`bg-gradient-to-r from-[#14396D] to-[#2C5078] hover:from-[#2C5078] hover:to-[#14396D] text-white rounded-lg px-6 py-3 font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          )}
          
          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="p-6">
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-[#14396D] mb-2">Password Management</h3>
                <p className="text-gray-600 text-sm">
                  {isGoogleUser 
                    ? 'You signed up with Google. To change your password, you need to set up an email/password account first.' 
                    : 'Change your password to keep your account secure. We recommend using a strong password that you don\'t use elsewhere.'}
                </p>
              </div>
              
              {isGoogleUser ? (
                <div className="space-y-6">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm text-yellow-700 font-medium">Google Account Notice</p>
                        <p className="text-sm text-yellow-600 mt-1">
                          Your account is currently linked to Google. Password management is handled through your Google account settings.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h4 className="font-medium text-gray-800 mb-3">Options for Google Users</h4>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>To change your Google account password, visit <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Account Security</a></span>
                      </li>
                      <li className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>You can also create a separate email/password login by signing out and registering with the same email address</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : !showPasswordFields ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => setShowPasswordFields(true)}
                      className="bg-gradient-to-r from-[#14396D] to-[#2C5078] hover:from-[#2C5078] hover:to-[#14396D] text-white rounded-lg px-6 py-3 font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Change Password
                    </button>
                    
                    <button
                      onClick={handleSendPasswordResetEmail}
                      disabled={saving || resetEmailSent}
                      className={`bg-white border border-[#14396D] text-[#14396D] hover:bg-gray-50 rounded-lg px-6 py-3 font-medium transition-all duration-300 flex items-center justify-center ${(saving || resetEmailSent) ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Reset Email
                    </button>
                  </div>
                  
                  <div className="text-center text-sm text-gray-500">
                    <p>Forgot your password? Click "Send Reset Email" to receive a password reset link.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="password-current" className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="password-current"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="password-new" className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="password-new"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        minLength={6}
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="password-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        id="password-confirm"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        minLength={6}
                        required
                      />
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md mt-2">
                      <p className="text-xs text-gray-500">Password must be at least 6 characters long and should include a mix of letters, numbers, and special characters for better security.</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordFields(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-6 py-3 font-medium transition-all duration-300"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      disabled={saving}
                      className={`bg-gradient-to-r from-[#14396D] to-[#2C5078] hover:from-[#2C5078] hover:to-[#14396D] text-white rounded-lg px-6 py-3 font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowPasswordFields(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Forgot your password? Use the reset option instead
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
