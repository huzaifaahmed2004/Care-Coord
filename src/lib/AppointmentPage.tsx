import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import BookAppointmentForm from './BookAppointmentForm';
import UserAppointments from './UserAppointments';

export default function AppointmentPage() {
  const { user } = useAuth() ?? {};
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' or 'new'
  
  // Check if we should show the appointment form directly
  useEffect(() => {
    // If coming from a "Make an Appointment" button click, show the form
    const showForm = location.state?.showForm === true;
    if (showForm) {
      setActiveTab('new');
    }
  }, [location]);

  return (
    <main className="bg-[#F8FAFF] min-h-screen pt-10 pb-20">
      {/* Appointment Section - Enhanced with modern design */}
      <section className="py-20 bg-gradient-to-r from-[#14396D] to-[#2C5078] relative overflow-hidden">
        {/* Abstract shapes for visual interest */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#3373FF] opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-24 w-80 h-80 bg-[#FF3D71] opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 right-1/3 w-64 h-64 bg-[#3373FF] opacity-10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-[#FF3D71] font-semibold text-sm mb-5 shadow-lg">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                HEALTHCARE MADE EASY
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
              Manage Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF3D71] to-[#ff7da7]">Appointments</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-[#3373FF] to-[#FF3D71] mx-auto mb-6 rounded-full"></div>
            <p className="text-gray-200 max-w-2xl mx-auto text-lg leading-relaxed">
              View your scheduled appointments, request changes, or book a new appointment with our healthcare professionals.
            </p>
          </div>
          
          {user ? (
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/20 max-w-6xl mx-auto">
              {/* Enhanced Tabs */}
              <div className="flex flex-wrap border-b border-white/20 mb-8 gap-2">
                <button
                  className={`px-6 py-3 font-semibold text-sm transition-all rounded-t-lg ${activeTab === 'appointments' ? 'text-white bg-white/10 border-b-2 border-[#FF3D71]' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                  onClick={() => setActiveTab('appointments')}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    My Appointments
                  </div>
                </button>
                <button
                  className={`px-6 py-3 font-semibold text-sm transition-all rounded-t-lg ${activeTab === 'new' ? 'text-white bg-white/10 border-b-2 border-[#FF3D71]' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                  onClick={() => setActiveTab('new')}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Appointment
                  </div>
                </button>
              </div>
              
              {/* Enhanced Tab Content */}
              {activeTab === 'appointments' ? (
                <UserAppointments onNewAppointment={() => setActiveTab('new')} />
              ) : (
                <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-xl overflow-hidden border border-white/10">
                  <div className="p-6 bg-gradient-to-r from-[#14396D]/40 to-[#2C5078]/40 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#FF3D71]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Book a New Appointment
                    </h3>
                    <p className="text-gray-300 mt-1">Complete the form below to schedule your appointment with one of our healthcare professionals.</p>
                  </div>
                  <div className="p-6">
                    <BookAppointmentForm />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-10 max-w-xl mx-auto text-center border border-white/20">
              <div className="w-24 h-24 bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Login Required</h3>
              <p className="text-gray-300 mb-8">Please login to your account to view or book appointments. Your secure account helps us provide you with the best care possible.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 flex-1 flex items-center justify-center shadow-lg"
                  onClick={() => navigate('/login', { state: { from: '/appointment', showForm: true } })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Login
                </button>
                <button 
                  className="bg-gradient-to-r from-[#FF3D71] to-[#ff5996] hover:from-[#ff5996] hover:to-[#FF3D71] text-white px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 flex-1 flex items-center justify-center shadow-lg"
                  onClick={() => navigate('/register')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                  Register
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Enhanced Information Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Why Choose Our Appointment System</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-[#3373FF] to-[#FF3D71] mx-auto mb-4 rounded-full"></div>
            <p className="text-gray-600 max-w-3xl mx-auto">We've designed our appointment system with your convenience and care in mind.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-b from-white to-blue-50 p-8 rounded-2xl shadow-lg border border-blue-100 transform transition-transform duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-2xl flex items-center justify-center mb-6 shadow-md transform -rotate-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Appointments</h3>
              <p className="text-gray-600">Our streamlined booking process ensures you can schedule appointments quickly and easily, with minimal wait times.</p>
            </div>

            <div className="bg-gradient-to-b from-white to-blue-50 p-8 rounded-2xl shadow-lg border border-blue-100 transform transition-transform duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-2xl flex items-center justify-center mb-6 shadow-md transform -rotate-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Secure & Private</h3>
              <p className="text-gray-600">Your personal and medical information is always protected with the highest level of security and privacy standards.</p>
            </div>

            <div className="bg-gradient-to-b from-white to-blue-50 p-8 rounded-2xl shadow-lg border border-blue-100 transform transition-transform duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-2xl flex items-center justify-center mb-6 shadow-md transform -rotate-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">24/7 Support</h3>
              <p className="text-gray-600">Our customer support team is available around the clock to assist you with any questions or concerns about your appointment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-[#F6F8FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-white rounded-full text-[#FF3D71] font-semibold text-sm mb-4">FREQUENTLY ASKED QUESTIONS</div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#14396D] mb-6">Common Questions About Appointments</h2>
            <div className="w-24 h-1 bg-[#FF3D71] mx-auto mb-6"></div>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-md mb-4">
              <h3 className="text-lg font-bold text-[#14396D] mb-2">How do I schedule an appointment?</h3>
              <p className="text-gray-600">You can schedule an appointment by logging into your account and using our online booking system. Select your preferred doctor, date, and time slot.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md mb-4">
              <h3 className="text-lg font-bold text-[#14396D] mb-2">What if I need to cancel or reschedule?</h3>
              <p className="text-gray-600">You can cancel or reschedule your appointment up to 24 hours before your scheduled time without any penalty. Simply log in to your account and manage your appointments.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md mb-4">
              <h3 className="text-lg font-bold text-[#14396D] mb-2">How long will my appointment last?</h3>
              <p className="text-gray-600">Most appointments are scheduled for 30 minutes, but the actual duration may vary depending on your specific needs and the type of consultation.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-bold text-[#14396D] mb-2">What should I bring to my appointment?</h3>
              <p className="text-gray-600">Please bring your ID, insurance information, a list of current medications, and any relevant medical records or test results from previous visits.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
