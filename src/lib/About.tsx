import React from 'react';

const About: React.FC = () => {
  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#3373FF] to-[#5D93FF] py-20">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About CareCoord</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Providing exceptional healthcare services with a focus on patient comfort and well-being.
            </p>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2">
              <div className="inline-block px-3 py-1 bg-blue-50 rounded-full text-[#3373FF] font-semibold text-sm mb-4">OUR MISSION</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Providing Quality Healthcare for All</h2>
              <p className="text-gray-600 mb-6">
                At CareCoord, our mission is to provide accessible, high-quality healthcare services to all patients. 
                We believe that everyone deserves exceptional medical care delivered with compassion and respect.
              </p>
              <p className="text-gray-600 mb-6">
                Our team of experienced healthcare professionals is dedicated to improving the health and wellbeing of our 
                community through personalized care, cutting-edge technology, and a patient-centered approach.
              </p>
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Patient-Centered Care</h3>
                  <p className="text-gray-600 text-sm">We put our patients first in everything we do</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Medical Excellence</h3>
                  <p className="text-gray-600 text-sm">Committed to the highest standards of medical practice</p>
                </div>
              </div>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80" 
                alt="Medical Team" 
                className="rounded-lg shadow-lg w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-blue-50 rounded-full text-[#3373FF] font-semibold text-sm mb-4">OUR VALUES</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">What We Stand For</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Our values guide every decision we make and every interaction we have with our patients and community.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-50 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Compassion</h3>
              <p className="text-gray-600">
                We treat every patient with kindness, empathy, and respect, recognizing their unique needs and concerns.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-50 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Integrity</h3>
              <p className="text-gray-600">
                We uphold the highest standards of professionalism, ethics, and honesty in all our interactions and practices.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-50 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Innovation</h3>
              <p className="text-gray-600">
                We continuously seek new and better ways to improve healthcare delivery and patient outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      
      {/* History */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80" 
                alt="Hospital Building" 
                className="rounded-lg shadow-lg w-full h-auto object-cover"
              />
            </div>
            <div className="md:w-1/2">
              <div className="inline-block px-3 py-1 bg-blue-50 rounded-full text-[#3373FF] font-semibold text-sm mb-4">OUR HISTORY</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">A Legacy of Excellence</h2>
              <p className="text-gray-600 mb-6">
                Founded in 2010, CareCoord began with a simple mission: to provide accessible, high-quality healthcare 
                to our community. What started as a small clinic has grown into a comprehensive healthcare network 
                serving thousands of patients each year.
              </p>
              <p className="text-gray-600 mb-6">
                Throughout our history, we have remained committed to our core values of compassion, integrity, and 
                innovation. We have continuously expanded our services and facilities to meet the evolving needs of 
                our patients and community.
              </p>
              <p className="text-gray-600">
                Today, CareCoord stands as a testament to our dedication to healthcare excellence and our unwavering 
                commitment to improving the health and wellbeing of those we serve.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
