import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { AlertCircle } from 'lucide-react';

export default function ForceProfileCompletion() {
  const { user, logout, checkUserProfile } = useAuth() ?? {};
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      
      try {
        const patientDoc = await getDoc(doc(db, 'patients', user.uid));
        if (patientDoc.exists()) {
          const data = patientDoc.data();
          setProfile({
            name: data.name || '',
            email: data.email || user.email || '',
            phoneNumber: data.phone || '',
            dateOfBirth: data.dateOfBirth || '',
            gender: data.gender || ''
          });
        } else {
          // Initialize with user's email if available
          setProfile(prev => ({
            ...prev,
            email: user.email || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
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
        // Set to today's date instead
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate all required fields
    if (!profile.name || !profile.email || !profile.phoneNumber || !profile.dateOfBirth || !profile.gender) {
      setError('All fields marked with * are required.');
      return;
    }
    
    // Validate phone number is exactly 11 digits
    if (profile.phoneNumber.replace(/\D/g, '').length !== 11) {
      setError('Phone number must be exactly 11 digits.');
      return;
    }
    
    if (!user) {
      setError('You must be logged in to update your profile.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Update the patient document
      await updateDoc(doc(db, 'patients', user.uid), {
        name: profile.name,
        email: profile.email,
        phone: profile.phoneNumber,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        updatedAt: new Date().toISOString()
      });
      
      // Clear the profile completion flags
      window.localStorage.removeItem('forceProfileCompletion');
      document.cookie = 'forceProfileCompletion=; path=/; max-age=0';
      
      setSuccess(true);
      
      // Verify profile is now complete
      if (checkUserProfile && user) {
        const isComplete = await checkUserProfile(user.uid);
        if (isComplete) {
          // Redirect to home after a brief delay to show success message
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          setError('Some required information is still missing. Please check all fields.');
          setLoading(false);
        }
      } else {
        setError('Unable to verify profile completion. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
        navigate('/login');
      } else {
        // Fallback if logout function is not available
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please complete your profile information to continue using Care-Coord.
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            Profile updated successfully! Redirecting...
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name*
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={profile.name}
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
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100"
              disabled
              required
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed here.</p>
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
          
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
            
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
