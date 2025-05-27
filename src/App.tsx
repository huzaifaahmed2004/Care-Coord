import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import LoginForm from './lib/LoginForm';
import ForgotPasswordForm from './lib/ForgotPasswordForm';
import PatientList from './lib/PatientList';
import DoctorsAdmin from './lib/DoctorsAdmin';
import DepartmentsAdmin from './lib/DepartmentsAdmin';
import PatientRegistrationForm from './lib/PatientRegistrationForm';
import PatientDetails from './lib/PatientDetails';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { SettingsProvider } from './lib/SettingsContext';
import HomeContent from './lib/HomeContent';
import AppointmentPage from './lib/AppointmentPage';
import AppointmentsAdmin from './lib/AppointmentsAdmin';
import DepartmentsPage from './lib/DepartmentsPage';
import LaboratoryPage from './lib/LaboratoryPage';
import DoctorsPage from './lib/DoctorsPage';
import ContactPage from './lib/ContactPage';
import ProfilePage from './lib/ProfilePage';
import LabOperatorLogin from './lib/LabOperatorLogin';
import LabOperatorPage from './lib/LabOperatorPage';
import About from './lib/About';
import Footer from './lib/Footer';
import EarningsAdmin from './lib/EarningsAdmin';
import PatientsAdmin from './lib/PatientsAdmin';
import DoctorLogin from './lib/DoctorLogin';
import DoctorDashboard from './lib/DoctorDashboard';
import DoctorProtectedRoute from './lib/DoctorProtectedRoute';
import AdminNotifications from './lib/AdminNotifications';
import AdminDashboardHome from './lib/AdminDashboardHome';
import MigrateLabTests from './lib/MigrateLabTests';

// Responsive MainHeader with burger menu
function MainHeader() {
  const { user, logout } = useAuth() ?? {};
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');
  
  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuOpen && !(event.target as Element).closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);
  
  // Fetch user's name from Firestore
  useEffect(() => {
    // Create a function to fetch the user's name
    async function fetchUserName() {
      if (!user) {
        setUserName('');
        return;
      }
      
      try {
        // ALWAYS prioritize the patients collection (registration data) first
        // This ensures we use the name the user provided in their profile
        const patientDocRef = doc(db, 'patients', user.uid);
        const patientDoc = await getDoc(patientDocRef);
        
        if (patientDoc.exists() && patientDoc.data().name) {
          // Use name from patients collection if available
          const profileName = patientDoc.data().name;
          console.log('Using name from patient profile:', profileName);
          setUserName(profileName);
          return;
        }
        
        // Then check users collection (profile data)
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().displayName) {
          // Use displayName from users collection if available
          setUserName(userDoc.data().displayName);
          return;
        }
        
        // Only as a last resort, fall back to email prefix
        // IMPORTANT: We avoid using Google's display name completely
        const fallbackName = user.email?.split('@')[0] || '';
        console.log('No profile name found, using fallback:', fallbackName);
        setUserName(fallbackName);
      } catch (error) {
        console.error('Error fetching user name:', error);
        // Fall back to email prefix as a last resort
        const fallbackName = user.email?.split('@')[0] || '';
        setUserName(fallbackName);
      }
    }
    
    // Call fetchUserName immediately
    fetchUserName();
    
    // Set up a listener for profile changes
    if (user) {
      // Listen for changes to the user's profile in the patients collection
      const unsubscribe = onSnapshot(doc(db, 'patients', user.uid), (doc: DocumentSnapshot) => {
        if (doc.exists() && doc.data().name) {
          const profileName = doc.data().name;
          console.log('Profile updated, new name:', profileName);
          setUserName(profileName);
        } else {
          // If profile was deleted or name removed, fetch name again
          fetchUserName();
        }
      });
      
      // Clean up the listener when component unmounts or user changes
      return unsubscribe;
    }
  }, [user]);

  return (
    <header className="bg-white text-gray-800 w-full shadow-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar with contact info */}
        <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#3373FF]" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span className="text-gray-600 hover:text-[#3373FF] transition-colors">support@carecoord.com</span>
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#3373FF]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-600">H11, near Nescom, Islamabad, Pakistan</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a href="tel:+923706356891" className="flex items-center gap-1 text-gray-600 hover:text-[#3373FF] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>+92 370 6356891</span>
            </a>
          </div>
        </div>
        
        {/* Main navigation bar */}
        <div className="flex items-center justify-between py-4 text-base">
          {/* Logo and desktop navigation */}
          <div className="flex items-center gap-6 lg:gap-10">
            {/* Logo - Clickable to return to home */}
            <Link to="/" className="font-bold text-xl flex items-center gap-2 text-gray-800 hover:text-[#3373FF] transition-colors">
              <div className="bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-full p-1.5 flex items-center justify-center w-10 h-10 shadow-md">
                <span className="text-white text-xl font-bold">CC</span>
              </div>
              <span className="tracking-wide">CARECOORD</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-4 lg:gap-7 ml-4 lg:ml-8">
              <Link to="/" className="font-medium text-gray-700 hover:text-[#3373FF] transition-colors py-2 border-b-2 border-transparent hover:border-[#3373FF]">Home</Link>
              <Link to="/departments" className="font-medium text-gray-700 hover:text-[#3373FF] transition-colors py-2 border-b-2 border-transparent hover:border-[#3373FF]">Departments</Link>
              <Link to="/doctors" className="font-medium text-gray-700 hover:text-[#3373FF] transition-colors py-2 border-b-2 border-transparent hover:border-[#3373FF]">Doctors</Link>
              <Link to="/laboratory" className="font-medium text-gray-700 hover:text-[#3373FF] transition-colors py-2 border-b-2 border-transparent hover:border-[#3373FF]">Laboratory</Link>
              <Link to="/about" className="font-medium text-gray-700 hover:text-[#3373FF] transition-colors py-2 border-b-2 border-transparent hover:border-[#3373FF]">About</Link>
              <Link to="/contact" className="font-medium text-gray-700 hover:text-[#3373FF] transition-colors py-2 border-b-2 border-transparent hover:border-[#3373FF]">Contact</Link>
              {user ? (
                <Link to="/appointment" state={{ showForm: true }} className="bg-[#3373FF] hover:bg-[#2860e0] px-4 py-2 rounded-md text-white font-medium transition-all shadow-sm">
                  Book Appointment
                </Link>
              ) : (
                <button onClick={() => navigate('/login', { state: { from: '/appointment', showForm: true } })} className="bg-[#3373FF] hover:bg-[#2860e0] px-4 py-2 rounded-md text-white font-medium transition-all shadow-sm">
                  Book Appointment
                </button>
              )}
            </nav>
          </div>
          
          {/* Mobile hamburger button */}
          <button onClick={() => setMenuOpen(v => !v)} className="md:hidden focus:outline-none">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          {/* User authentication buttons */}
          <div className="hidden md:flex items-center gap-3 sm:gap-4">
            {!user && (
              <>
                <button 
                  onClick={() => navigate('/login')} 
                  className="text-[#3373FF] hover:text-[#2860e0] px-4 py-2 font-medium text-sm transition-colors"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigate('/register')} 
                  className="bg-[#3373FF] hover:bg-[#2860e0] px-5 py-2 rounded-md text-white font-medium text-sm transition-colors shadow-sm"
                >
                  Sign Up
                </button>
              </>
            )}
            {user && (
              <div className="relative user-menu-container">
                <button 
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setUserMenuOpen((prev: boolean) => !prev)}
                >
                  <div className="w-8 h-8 rounded-full bg-[#3373FF] text-white flex items-center justify-center font-medium text-sm">
                    {userName ? userName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{userName || user.email?.split('@')[0]}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{userName || user.email?.split('@')[0]}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link 
                      to="/profile" 
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </Link>
                    <Link 
                      to="/appointment" 
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      My Appointments
                    </Link>
                    <div className="border-t border-gray-100 mt-1"></div>
                    <button 
                      onClick={() => {
                        logout?.();
                        setUserMenuOpen(false);
                      }} 
                      className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation Drawer - Modern side drawer with backdrop */}
        {menuOpen && (
          <>
            {/* Semi-transparent backdrop */}
            <div 
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setMenuOpen(false)}
            ></div>
            
            {/* Side drawer */}
            <nav className="fixed z-40 top-0 right-0 h-full w-64 bg-white/95 shadow-lg flex flex-col p-6 md:hidden overflow-y-auto transition-all duration-300 ease-in-out">
              {/* Close button */}
              <button 
                onClick={() => setMenuOpen(false)} 
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Logo */}
              <div className="flex items-center mb-8 mt-2">
                <div className="bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-full p-1.5 flex items-center justify-center w-8 h-8 shadow-sm">
                  <span className="text-white text-sm font-bold">CC</span>
                </div>
                <span className="ml-2 font-bold text-gray-800">CARECOORD</span>
              </div>
              
              {/* Navigation links */}
              <div className="flex flex-col space-y-1">
                <Link to="/" onClick={() => setMenuOpen(false)} className="py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200">Home</Link>
                <Link to="/departments" onClick={() => setMenuOpen(false)} className="py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200">Departments</Link>
                <Link to="/doctors" onClick={() => setMenuOpen(false)} className="py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200">Doctors</Link>
                <Link to="/about" onClick={() => setMenuOpen(false)} className="py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200">About</Link>
                <Link to="/contact" onClick={() => setMenuOpen(false)} className="py-2 px-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200">Contact</Link>
              </div>
              
              {/* Appointment button */}
              <div className="mt-6">
                {user ? (
                  <Link to="/appointment" state={{ showForm: true }} onClick={() => setMenuOpen(false)} className="block py-2.5 w-full bg-[#FF3D71] hover:bg-[#ff5996] rounded-md text-white font-medium text-center shadow-sm">
                    Book Appointment
                  </Link>
                ) : (
                  <button onClick={() => { setMenuOpen(false); navigate('/login', { state: { from: '/appointment', showForm: true } }); }} className="py-2.5 w-full bg-[#FF3D71] hover:bg-[#ff5996] rounded-md text-white font-medium text-center shadow-sm">
                    Book Appointment
                  </button>
                )}
              </div>
              
              {/* Auth buttons */}
              <div className="mt-auto pt-6 border-t border-gray-200 w-full flex flex-col gap-2">
                {!user && (
                  <>
                    <button onClick={() => { setMenuOpen(false); navigate('/login'); }} className="py-2 w-full border border-gray-300 hover:bg-gray-50 rounded-md text-gray-700 font-medium text-center">
                      Login
                    </button>
                    <button onClick={() => { setMenuOpen(false); navigate('/register'); }} className="py-2 w-full bg-[#3373FF] hover:bg-[#2860e0] rounded-md text-white font-medium text-center shadow-sm">
                      Sign Up
                    </button>
                  </>
                )}
                {user && (
                  <>
                    <div className="py-2 w-full bg-gray-50 rounded-md text-gray-700 text-center mb-2">
                      Hello{user.displayName ? `, ${user.displayName}` : user.email ? `, ${user.email}` : ''}
                    </div>
                    <button onClick={() => { setMenuOpen(false); logout && logout(); }} className="py-2 w-full border border-red-300 text-red-600 hover:bg-red-50 rounded-md font-medium text-center">
                      Sign Out
                    </button>
                  </>
                )}
              </div>
            </nav>
          </>
        )}
      </div>
    </header>
  );
}

// Responsive AdminDashboard with new sidebar menu and mobile hamburger
function AdminDashboard() {
  const { logout } = useAuth() ?? {};
  const navigate = useNavigate();
  
  const [currentSection, setCurrentSection] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      return hash || 'dashboard';
    }
    return 'dashboard';
  });

  const [menuOpen, setMenuOpen] = useState(false);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      // Clear admin session from localStorage
      localStorage.removeItem('adminSession');
      localStorage.removeItem('adminSessionExpires');
      
      // Also logout from Firebase if the logout function is available
      if (logout) {
        await logout();
      }
      
      // Redirect to admin login page
      window.location.href = '/admin';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Sync URL hash with section
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = currentSection;
    }
  }, [currentSection]);

  // Close mobile menu when changing sections
  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F6F8FB]">
      {/* Mobile Header - Only visible on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-40 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-[#427DFF] p-1.5">
            <span className="text-white font-bold text-lg">❤</span>
          </div>
          <div className="font-bold text-lg text-[#427DFF]">CARECOORD</div>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded-md hover:bg-gray-100"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Offset for fixed mobile header */}
      <div className="md:hidden h-14"></div>

      {/* Sidebar - transforms to mobile dropdown menu */}
      <div className={`${menuOpen ? 'block' : 'hidden'} md:block w-full md:w-72 bg-gradient-to-b from-white to-[#f8faff] shadow-lg flex-none md:min-h-screen z-30 transition-all duration-300 ease-in-out md:flex md:flex-col ${menuOpen ? 'fixed top-14 left-0 right-0 bottom-0 overflow-auto' : ''}`}>
        {/* Desktop sidebar header - hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 p-6 mb-6 border-b border-blue-50">
          <div className="rounded-full bg-gradient-to-r from-[#427DFF] to-[#3373FF] p-3 shadow-md">
            <span className="text-white font-bold text-2xl">❤</span>
          </div>
          <div>
            <div className="text-md font-thin tracking-widest text-gray-400">Admin Panel</div>
            <div className="font-bold text-xl text-[#427DFF]">CARECOORD</div>
          </div>
        </div>

        <nav className="flex-1 w-full p-4 md:p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 pl-4">Main Navigation</div>
          <ul className="space-y-2 text-gray-700">
            <li
              className={`flex items-center hover:bg-[#E6ECFB] rounded-lg px-4 py-3 cursor-pointer font-medium transition-all ${currentSection === 'dashboard' ? 'bg-[#E6ECFB] text-[#427DFF] shadow-sm' : ''}`}
              onClick={() => handleSectionChange('dashboard')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 ${currentSection === 'dashboard' ? 'text-[#427DFF]' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
              Dashboard
            </li>
            <li
              className={`flex items-center hover:bg-[#E6ECFB] rounded-lg px-4 py-3 cursor-pointer font-medium transition-all ${currentSection === 'doctors' ? 'bg-[#E6ECFB] text-[#427DFF] shadow-sm' : ''}`}
              onClick={() => handleSectionChange('doctors')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 ${currentSection === 'doctors' ? 'text-[#427DFF]' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Doctors
            </li>
            <li
              className={`flex items-center hover:bg-[#E6ECFB] rounded-lg px-4 py-3 cursor-pointer font-medium transition-all ${currentSection === 'patients' ? 'bg-[#E6ECFB] text-[#427DFF] shadow-sm' : ''}`}
              onClick={() => handleSectionChange('patients')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 ${currentSection === 'patients' ? 'text-[#427DFF]' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              Patients
            </li>
            <li
              className={`flex items-center hover:bg-[#E6ECFB] rounded-lg px-4 py-3 cursor-pointer font-medium transition-all ${currentSection === 'departments' ? 'bg-[#E6ECFB] text-[#427DFF] shadow-sm' : ''}`}
              onClick={() => handleSectionChange('departments')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 ${currentSection === 'departments' ? 'text-[#427DFF]' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Departments
            </li>
            <li
              className={`flex items-center hover:bg-[#E6ECFB] rounded-lg px-4 py-3 cursor-pointer font-medium transition-all ${currentSection === 'appointments' ? 'bg-[#E6ECFB] text-[#427DFF] shadow-sm' : ''}`}
              onClick={() => handleSectionChange('appointments')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 ${currentSection === 'appointments' ? 'text-[#427DFF]' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Appointments
            </li>
            <li
              className={`flex items-center hover:bg-[#E6ECFB] rounded-lg px-4 py-3 cursor-pointer font-medium transition-all ${currentSection === 'earnings' ? 'bg-[#E6ECFB] text-[#427DFF] shadow-sm' : ''}`}
              onClick={() => handleSectionChange('earnings')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 ${currentSection === 'earnings' ? 'text-[#427DFF]' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Earnings
            </li>
          </ul>
          <div className="p-4 md:mt-4 space-y-3">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#427DFF] to-[#3373FF] rounded-lg text-white font-medium text-center hover:shadow-md transition-all"
              onClick={() => setMenuOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Main Website
            </Link>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium text-center hover:shadow-md transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm7 5a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L12 12.586V8z" />
              </svg>
              Logout
            </button>
          </div>
        </nav>

       
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        {/* Content based on selected section */}
        {currentSection === 'dashboard' && <AdminDashboardHome />}
        {currentSection === 'doctors' && <DoctorsAdmin />}
        {currentSection === 'patients' && <PatientsAdmin />}
        {currentSection === 'departments' && <DepartmentsAdmin />}
        {currentSection === 'appointments' && <AppointmentsAdmin />}
        {currentSection === 'earnings' && <EarningsAdmin />}
      </div>
    </div>
  );
}

// Enhanced Admin login form with better UI and security features
function AdminLoginForm() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const navigate = useNavigate();
  
  // Check if there's a lockout timestamp in localStorage
  useEffect(() => {
    const storedLockout = localStorage.getItem('adminLockoutUntil');
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
      } else {
        // Lockout period has expired
        localStorage.removeItem('adminLockoutUntil');
      }
    }
    
    // Get stored login attempts
    const storedAttempts = localStorage.getItem('adminLoginAttempts');
    if (storedAttempts) {
      setLoginAttempts(parseInt(storedAttempts, 10));
    }
  }, []);
  
  // Timer to update lockout countdown
  useEffect(() => {
    if (!lockoutUntil) return;
    
    const interval = setInterval(() => {
      if (lockoutUntil <= Date.now()) {
        setLockoutUntil(null);
        localStorage.removeItem('adminLockoutUntil');
        setLoginAttempts(0);
        localStorage.removeItem('adminLoginAttempts');
        clearInterval(interval);
      } else {
        // Force re-render to update countdown
        setLockoutUntil(prevLockout => prevLockout);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lockoutUntil]);
  
  // Only Admin/0900 is allowed. Directly store to localStorage for session.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Check if account is locked out
    if (lockoutUntil && lockoutUntil > Date.now()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Simulate network delay for security
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (id === 'Admin' && password === '0900') {
      // Successful login
      // Store in localStorage with expiration (8 hours)
      const expiresAt = Date.now() + (8 * 60 * 60 * 1000);
      localStorage.setItem('adminSession', 'yes');
      localStorage.setItem('adminSessionExpires', expiresAt.toString());
      localStorage.removeItem('adminLoginAttempts');
      setLoginAttempts(0);
      
      navigate('/admin', { replace: true });
      window.location.reload();
    } else {
      // Failed login attempt
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      localStorage.setItem('adminLoginAttempts', newAttempts.toString());
      
      // After 3 failed attempts, lock the account for 15 minutes
      if (newAttempts >= 3) {
        const lockoutTime = Date.now() + (15 * 60 * 1000); // 15 minutes
        setLockoutUntil(lockoutTime);
        localStorage.setItem('adminLockoutUntil', lockoutTime.toString());
        setError('Too many failed attempts. Account locked for 15 minutes.');
      } else {
        setError(`Invalid admin credentials. ${3 - newAttempts} attempts remaining.`);
      }
    }
    
    setLoading(false);
  };
  
  // Format the remaining lockout time
  const formatLockoutTime = () => {
    if (!lockoutUntil) return '';
    
    const remainingMs = lockoutUntil - Date.now();
    if (remainingMs <= 0) return '';
    
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo and Hospital Name */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-[#14396D] to-[#2C5078] text-white text-2xl font-bold mb-4 shadow-lg">
            <span className="text-white text-3xl">❤</span>
          </div>
          <h1 className="text-2xl font-bold text-[#14396D]">CARECOORD</h1>
          <p className="text-gray-500 mt-1">Hospital Management System</p>
        </div>
        
        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#14396D] to-[#2C5078] px-6 py-4">
            <h2 className="text-xl font-bold text-white">Administrator Login</h2>
            <p className="text-blue-100 text-sm mt-1">Secure access to hospital management</p>
          </div>
          
          {/* Form */}
          <div className="p-6">
            {lockoutUntil && lockoutUntil > Date.now() ? (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-red-700 font-medium">Account Temporarily Locked</p>
                    <p className="text-sm text-red-600 mt-1">
                      Too many failed login attempts. Please try again in {formatLockoutTime()}.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-red-700 text-sm font-medium">{error}</p>
                    </div>
                  </div>
                )}
                
                <div className="mb-6">
                  <label htmlFor="admin-id" className="block text-sm font-medium text-gray-700 mb-1">
                    Administrator ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="admin-id"
                      type="text"
                      value={id}
                      onChange={e => setId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your admin ID"
                      autoFocus
                      autoComplete="username"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full bg-gradient-to-r from-[#14396D] to-[#2C5078] hover:from-[#2C5078] hover:to-[#14396D] text-white rounded-lg py-3 font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Login to Dashboard
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <a href="/" className="text-blue-600 hover:underline">Return to main site</a>
              </div>
              <div className="text-xs text-gray-500">
                &copy; {new Date().getFullYear()} CareCoord
              </div>
            </div>
          </div>
        </div>
        
        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <div className="flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0117.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Secure Login
          </div>
          <p>This area is restricted to authorized personnel only.</p>
          <p>All login attempts are monitored and recorded.</p>
        </div>
      </div>
    </div>
  );
}

// Enhanced Admin route protection with session expiration
function AdminProtectedRoute() {
  const navigate = useNavigate();
  const [isValidSession, setIsValidSession] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if admin session exists and is not expired
    const adminSession = localStorage.getItem('adminSession');
    const adminSessionExpires = localStorage.getItem('adminSessionExpires');
    
    let isValid = false;
    
    if (adminSession === 'yes' && adminSessionExpires) {
      const expiresAt = parseInt(adminSessionExpires, 10);
      
      // Check if session is still valid
      if (Date.now() < expiresAt) {
        isValid = true;
      } else {
        // Session expired, clear it
        localStorage.removeItem('adminSession');
        localStorage.removeItem('adminSessionExpires');
      }
    }
    
    setIsValidSession(isValid);
    setLoading(false);
  }, [navigate]);
  
  if (loading) {
    // Show loading state while checking session
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#14396D]"></div>
      </div>
    );
  }
  
  return isValidSession ? <AdminDashboard /> : <AdminLoginForm />;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Routes>
            {/* Public site gets header */}
            <Route
              path="*"
              element={
                <>
                  <MainHeader />
                  <Routes>
                    <Route path="/" element={<HomeContent />} />
                    <Route path="/login" element={<LoginForm />} />
                    <Route path="/register" element={<PatientRegistrationForm />} />
                    <Route path="/appointment" element={<AppointmentPage />} />
                    <Route path="/laboratory" element={<LaboratoryPage />} />
                    <Route path="/departments" element={<DepartmentsPage />} />
                    <Route path="/doctors" element={<DoctorsPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    {/* Lab Operator routes are moved to a separate route structure below */}
                    {/* Add more public routes here */}
                  </Routes>
                  <Footer />
                </>
              }
            />
            {/* Admin does not get header */}
            <Route path="/admin" element={<AdminProtectedRoute />} />
            
            {/* Doctor routes */}
            <Route path="/doctor/login" element={<DoctorLogin />} />
            <Route 
              path="/doctor/dashboard" 
              element={
                <DoctorProtectedRoute>
                  <DoctorDashboard />
                </DoctorProtectedRoute>
              } 
            />
            
            {/* Lab Operator Portal Routes - No Header/Footer */}
            <Route path="/LabOperator/*" element={
              <Routes>
                <Route path="login" element={<LabOperatorLogin />} />
                <Route path="migrate" element={<MigrateLabTests />} />
                <Route path="/*" element={<LabOperatorPage />} />
              </Routes>
            } />
          </Routes>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}
