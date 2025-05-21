import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
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
import DoctorsPage from './lib/DoctorsPage';
import ContactPage from './lib/ContactPage';
import ProfilePage from './lib/ProfilePage';
import Footer from './lib/Footer';
import EarningsAdmin from './lib/EarningsAdmin';
import PatientsAdmin from './lib/PatientsAdmin';

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
    async function fetchUserName() {
      if (!user) {
        setUserName('');
        return;
      }
      
      try {
        // First check patients collection (registration data)
        const patientDocRef = doc(db, 'patients', user.uid);
        const patientDoc = await getDoc(patientDocRef);
        
        if (patientDoc.exists() && patientDoc.data().name) {
          // Use name from patients collection if available
          setUserName(patientDoc.data().name);
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
        
        // Fall back to Firebase Auth display name or email
        setUserName(user.displayName || user.email?.split('@')[0] || '');
      } catch (error) {
        console.error('Error fetching user name:', error);
        // Fall back to Firebase Auth display name or email
        setUserName(user.displayName || user.email?.split('@')[0] || '');
      }
    }
    
    fetchUserName();
  }, [user]);

  return (
    <header className="bg-gradient-to-r from-[#14396D] to-[#2C5078] text-white w-full shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar with contact info */}
        <div className="flex justify-between py-2 border-b border-white/10 text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#FF3D71]" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span>support@carecoord.com</span>
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#FF3D71]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span>H11, near Nescom, Islamabad, Pakistan</span>
            </div>
          </div>
        </div>
        
        {/* Main navigation bar */}
        <div className="flex items-center justify-between py-4 text-base">
          {/* Logo and desktop navigation */}
          <div className="flex items-center gap-6 lg:gap-10">
            {/* Logo - Clickable to return to home */}
            <Link to="/" className="font-bold text-xl flex items-center gap-2 text-white hover:text-white/90 transition-colors">
              <div className="bg-white rounded-full p-1.5 flex items-center justify-center w-8 h-8">
                <span className="text-[#FF3D71] text-xl">❤</span>
              </div>
              <span className="tracking-wide">CARECOORD</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-4 lg:gap-7 ml-4 lg:ml-8">
              <Link to="/" className="hover:text-[#FF3D71] transition">Home</Link>
              <Link to="/departments" className="hover:text-[#FF3D71] transition">Departments</Link>
              <Link to="/doctors" className="hover:text-[#FF3D71] transition">Doctors</Link>
              <Link to="/contact" className="hover:text-[#FF3D71] transition">Contact</Link>
              {user ? (
                <Link to="/appointment" state={{ showForm: true }} className="bg-[#FF3D71] hover:bg-[#ff5996] px-4 py-1 rounded-full text-white font-semibold transition-all">
                  Appointment
                </Link>
              ) : (
                <button onClick={() => navigate('/login', { state: { from: '/appointment', showForm: true } })} className="bg-[#FF3D71] hover:bg-[#ff5996] px-4 py-1 rounded-full text-white font-semibold transition-all">
                  Appointment
                </button>
              )}
            </nav>
          </div>
          
          {/* Mobile hamburger button */}
          <button onClick={() => setMenuOpen(v => !v)} className="md:hidden focus:outline-none">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          {/* User authentication buttons */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {!user && (
              <>
                <button 
                  onClick={() => navigate('/login')} 
                  className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-semibold text-sm transition-all border border-white/20"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigate('/register')} 
                  className="bg-[#FF3D71] hover:bg-[#ff5996] px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                >
                  Sign Up
                </button>
              </>
            )}
            {user && (
              <div className="relative user-menu-container">
                <button 
                  className="bg-white/10 px-4 py-2 rounded-lg text-sm border border-white/20 flex items-center gap-2"
                  onClick={() => setUserMenuOpen((prev: boolean) => !prev)}
                >
                  <span>Hello{userName ? `, ${userName}` : ''}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                    <Link 
                      to="/profile" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-[#14396D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </Link>
                    <Link 
                      to="/appointment" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-[#14396D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      My Appointments
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button 
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout && logout();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-[#FF3D71]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <nav className="absolute z-30 top-24 left-0 right-0 bg-gradient-to-r from-[#14396D] to-[#2C5078] border-y border-white/10 w-full flex flex-col items-start p-6 md:hidden drop-shadow-md">
            <Link to="/" onClick={() => setMenuOpen(false)} className="py-2 w-full hover:text-[#FF3D71]">Home</Link>
            <Link to="/departments" onClick={() => setMenuOpen(false)} className="py-2 w-full hover:text-[#FF3D71]">Departments</Link>
            <Link to="/doctors" onClick={() => setMenuOpen(false)} className="py-2 w-full hover:text-[#FF3D71]">Doctors</Link>
            <Link to="/contact" onClick={() => setMenuOpen(false)} className="py-2 w-full hover:text-[#FF3D71]">Contact</Link>
            {user ? (
              <Link to="/appointment" state={{ showForm: true }} onClick={() => setMenuOpen(false)} className="mt-2 py-2 w-full bg-[#FF3D71] hover:bg-[#ff5996] rounded-md text-white font-semibold text-center">
                Appointment
              </Link>
            ) : (
              <button onClick={() => { setMenuOpen(false); navigate('/login', { state: { from: '/appointment', showForm: true } }); }} className="mt-2 py-2 w-full bg-[#FF3D71] hover:bg-[#ff5996] rounded-md text-white font-semibold text-center">
                Appointment
              </button>
            )}
            
            {/* Mobile auth buttons */}
            <div className="mt-4 pt-4 border-t border-white/10 w-full flex flex-col gap-2">
              {!user && (
                <>
                  <button onClick={() => { setMenuOpen(false); navigate('/login'); }} className="py-2 w-full bg-white/10 hover:bg-white/20 rounded-md text-white font-semibold text-center">
                    Login
                  </button>
                  <button onClick={() => { setMenuOpen(false); navigate('/register'); }} className="py-2 w-full bg-[#FF3D71] hover:bg-[#ff5996] rounded-md text-white font-semibold text-center">
                    Sign Up
                  </button>
                </>
              )}
              {user && (
                <>
                  <div className="py-2 w-full bg-white/10 rounded-md text-white text-center mb-2">
                    Hello{user.displayName ? `, ${user.displayName}` : user.email ? `, ${user.email}` : ''}
                  </div>
                  <button onClick={() => { setMenuOpen(false); logout && logout(); }} className="py-2 w-full bg-[#FF3D71] hover:bg-[#ff5996] rounded-md text-white font-semibold text-center">
                    Logout
                  </button>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

// HomeContent is now imported from './lib/HomeContent'

// Responsive AdminDashboard with new sidebar menu and mobile hamburger
function AdminDashboard() {
  const [currentSection, setCurrentSection] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      return hash || 'doctors';
    }
    return 'doctors';
  });

  const [menuOpen, setMenuOpen] = useState(false);

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
          <div className="p-4 md:mt-4">
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
        </div>
        </nav>

       
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 sm:p-4 md:p-6 w-full max-w-full overflow-auto">
        {/* Render section by menu selection */}
        {currentSection === 'doctors' && <DoctorsAdmin />}
        {currentSection === 'patients' && <PatientsAdmin />}
        {currentSection === 'departments' && <DepartmentsAdmin />}
        {currentSection === 'appointments' && <AppointmentsAdmin />}
        {currentSection === 'earnings' && <EarningsAdmin />}
      </div>
    </div>
  );
}

// Admin login form for /admin if not logged in as admin
function AdminLoginForm() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  // Only Admin/0900 is allowed. Directly store to localStorage for session.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (id === 'Admin' && password === '0900') {
      // Store in localStorage
      localStorage.setItem('adminSession', 'yes');
      navigate('/admin', { replace: true });
      window.location.reload();
    } else {
      setError('Invalid admin credentials');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-8 w-full max-w-xs">
        <h2 className="text-xl font-bold mb-4 text-[#14396D]">Admin Login</h2>
        {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
        <div className="mb-4">
          <label className="block mb-1 text-sm font-semibold">Admin ID</label>
          <input
            type="text"
            value={id}
            onChange={e => setId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            autoFocus
            autoComplete="username"
            placeholder="Enter ID (Admin)"
          />
        </div>
        <div className="mb-6">
          <label className="block mb-1 text-sm font-semibold">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            autoComplete="current-password"
            placeholder="Enter Password"
          />
        </div>
        <button type="submit" className="w-full bg-[#427DFF] text-white font-semibold py-2 rounded hover:bg-[#285ccc]">Login</button>
      </form>
    </div>
  );
}

// Admin route protection
function AdminProtectedRoute() {
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('adminSession') === 'yes';
  if (isAdmin) return <AdminDashboard />;
  return <AdminLoginForm />;
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
                    <Route path="/departments" element={<DepartmentsPage />} />
                    <Route path="/doctors" element={<DoctorsPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    {/* Add more public routes here */}
                  </Routes>
                  <Footer />
                </>
              }
            />
            {/* Admin does not get header */}
            <Route path="/admin" element={<AdminProtectedRoute />} />
          </Routes>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}
