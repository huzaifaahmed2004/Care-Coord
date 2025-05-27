import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import BookLabTestForm from './BookLabTestForm';
import UserLabTests from './UserLabTests';

export default function LaboratoryPage() {
  const { user } = useAuth() ?? {};
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' or 'new'
  
  // Check if we should show the lab test form directly
  useEffect(() => {
    // If coming from a "Schedule Lab Test" button click, show the form
    const showForm = location.state?.showForm === true;
    if (showForm) {
      setActiveTab('new');
    }
  }, [location]);

  return (
    <main className="bg-[#F8FAFF] min-h-screen pt-10 pb-20">
      {/* Laboratory Section - With modern design */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                ACCURATE DIAGNOSTICS
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
              Laboratory <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF3D71] to-[#ff7da7]">Services</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-[#3373FF] to-[#FF3D71] mx-auto mb-6 rounded-full"></div>
            <p className="text-gray-200 max-w-2xl mx-auto text-lg leading-relaxed">
              Schedule lab tests, view your test history, and access your test results securely from anywhere.
            </p>
          </div>
          
          {user ? (
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/20 max-w-6xl mx-auto">
              {/* Enhanced Tabs */}
              <div className="flex flex-wrap border-b border-white/20 mb-8 gap-2">
                <button
                  className={`px-6 py-3 font-semibold text-sm transition-all rounded-t-lg ${activeTab === 'tests' ? 'text-white bg-white/10 border-b-2 border-[#FF3D71]' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                  onClick={() => setActiveTab('tests')}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    My Lab Tests
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
                    Schedule New Test
                  </div>
                </button>
              </div>
              
              {/* Tab Content */}
              {activeTab === 'tests' ? (
                <UserLabTests onNewTest={() => setActiveTab('new')} />
              ) : (
                <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-xl overflow-hidden border border-white/10">
                  <div className="p-6 bg-gradient-to-r from-[#14396D]/40 to-[#2C5078]/40 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#FF3D71]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      Schedule a Lab Test
                    </h3>
                    <p className="text-gray-300 mt-1">Complete the form below to schedule your lab test at our diagnostic center.</p>
                  </div>
                  <div className="p-6">
                    <BookLabTestForm />
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
              <p className="text-gray-300 mb-8">Please login to your account to schedule lab tests or view your test results. Your secure account helps us protect your health information.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 flex-1 flex items-center justify-center shadow-lg"
                  onClick={() => navigate('/login', { state: { from: '/laboratory', showForm: true } })}
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

      {/* Information Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Our Laboratory Services</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-[#3373FF] to-[#FF3D71] mx-auto mb-4 rounded-full"></div>
            <p className="text-gray-600 max-w-3xl mx-auto">We offer a comprehensive range of laboratory tests with accurate and timely results.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-b from-white to-blue-50 p-8 rounded-2xl shadow-lg border border-blue-100 transform transition-transform duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-2xl flex items-center justify-center mb-6 shadow-md transform -rotate-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Blood Tests</h3>
              <p className="text-gray-600">Comprehensive blood panels including CBC, lipid profiles, glucose, and specialized hormone tests.</p>
            </div>

            <div className="bg-gradient-to-b from-white to-blue-50 p-8 rounded-2xl shadow-lg border border-blue-100 transform transition-transform duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-2xl flex items-center justify-center mb-6 shadow-md transform -rotate-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Diagnostic Imaging</h3>
              <p className="text-gray-600">X-rays, ultrasounds, and other imaging services with quick results and expert analysis.</p>
            </div>

            <div className="bg-gradient-to-b from-white to-blue-50 p-8 rounded-2xl shadow-lg border border-blue-100 transform transition-transform duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-2xl flex items-center justify-center mb-6 shadow-md transform -rotate-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Digital Results</h3>
              <p className="text-gray-600">Access your test results online through our secure patient portal as soon as they're available.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-[#F6F8FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-white rounded-full text-[#FF3D71] font-semibold text-sm mb-4">FREQUENTLY ASKED QUESTIONS</div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#14396D] mb-6">Common Questions About Lab Tests</h2>
            <div className="w-24 h-1 bg-[#FF3D71] mx-auto mb-6"></div>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-md mb-4">
              <h3 className="text-lg font-bold text-[#14396D] mb-2">How do I prepare for a lab test?</h3>
              <p className="text-gray-600">Preparation varies by test. Some tests require fasting, while others don't. You'll receive specific instructions when you schedule your test.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md mb-4">
              <h3 className="text-lg font-bold text-[#14396D] mb-2">How long will it take to get my results?</h3>
              <p className="text-gray-600">Most routine test results are available within 24-48 hours. More specialized tests may take 3-5 business days. You'll be notified as soon as your results are ready.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md mb-4">
              <h3 className="text-lg font-bold text-[#14396D] mb-2">Can I download my test results?</h3>
              <p className="text-gray-600">Yes, once your results are available, you can securely view and download them from your patient portal in PDF format.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-bold text-[#14396D] mb-2">What should I bring to my lab appointment?</h3>
              <p className="text-gray-600">Please bring your ID, insurance information, and any lab requisition forms provided by your doctor. Arrive 15 minutes early to complete any necessary paperwork.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
