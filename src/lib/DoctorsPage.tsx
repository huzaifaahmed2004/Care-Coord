import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Link } from 'react-router-dom';
import { byteArrayToDataUrl } from './imageUtils';

// Interfaces
interface Doctor {
  id?: string;
  name: string;
  gender?: string;
  age?: string;
  department?: string;
  departmentId?: string;
  departmentName?: string;
  speciality?: string;
  specialization?: string;
  email?: string;
  imgUrl?: string;
  image?: Uint8Array;
  feePercentage?: number;
  bio?: string;
  education?: string;
  experience?: string;
  languages?: string[];
  awards?: string[];
}

interface Department {
  id?: string;
  name: string;
}

// Default image
const defaultDoctorImage = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80";

const DoctorsPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [specialties, setSpecialties] = useState<string[]>([]);

  // Fetch doctors and departments
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Get all departments
        const departmentsSnapshot = await getDocs(collection(db, "departments"));
        const departmentsData: Department[] = departmentsSnapshot.docs.map(
          (doc) => ({ id: doc.id, name: doc.data().name } as Department)
        );
        setDepartments(departmentsData);

        // Get all doctors
        const doctorsSnapshot = await getDocs(collection(db, "doctors"));
        let doctorsData: Doctor[] = doctorsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Doctor)
        );

        // Fetch department names for each doctor
        doctorsData = await Promise.all(
          doctorsData.map(async (doctor) => {
            if (doctor.departmentId) {
              try {
                const deptDoc = await getDoc(doc(db, "departments", doctor.departmentId));
                if (deptDoc.exists()) {
                  return {
                    ...doctor,
                    departmentName: deptDoc.data().name
                  };
                }
              } catch (error) {
                console.error("Error fetching department:", error);
              }
            }
            return doctor;
          })
        );

        setDoctors(doctorsData);
        
        // Extract unique specialties
        const allSpecialties = doctorsData
          .map(doctor => doctor.speciality || doctor.specialization)
          .filter((specialty): specialty is string => !!specialty);
        
        setSpecialties([...new Set(allSpecialties)]);
        
        // If there are doctors, select the first one by default
        if (doctorsData.length > 0) {
          setSelectedDoctor(doctorsData[0]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load doctors. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Handle doctor selection
  const handleDoctorClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    // Scroll to doctor details section
    document.getElementById('doctor-details')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter doctors based on search term, department, and specialty
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doctor.speciality && doctor.speciality.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doctor.specialization && doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDepartment = selectedDepartment === 'all' || doctor.departmentId === selectedDepartment;
    
    const doctorSpecialty = doctor.speciality || doctor.specialization || '';
    const matchesSpecialty = selectedSpecialty === 'all' || doctorSpecialty.toLowerCase() === selectedSpecialty.toLowerCase();
    
    return matchesSearch && matchesDepartment && matchesSpecialty;
  });

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#14396D] to-[#2C5078] py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Our Medical Specialists
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-3xl mx-auto">
            Meet our team of experienced doctors dedicated to providing exceptional healthcare services.
          </p>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#14396D]"></div>
          <p className="mt-4 text-gray-600">Loading doctors...</p>
        </div>
      )}

      {!loading && doctors.length === 0 && !error && (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">No Doctors Found</h2>
          <p className="mt-2 text-gray-500">There are currently no doctors available.</p>
        </div>
      )}

      {!loading && doctors.length > 0 && (
        <>
          {/* Search and Filter Section */}
          <section className="py-8 px-4 bg-white shadow-sm">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* Search */}
                <div className="w-full md:w-1/3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search doctors by name or specialty"
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Department Filter */}
                <div className="w-full md:w-1/3">
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Specialty Filter */}
                <div className="w-full md:w-1/3">
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                  >
                    <option value="all">All Specialties</option>
                    {specialties.map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Doctors List Section */}
          <section className="py-12 px-4">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-[#14396D] mb-8 text-center">
                {filteredDoctors.length > 0 
                  ? `Our Medical Specialists (${filteredDoctors.length})`
                  : 'No doctors match your search criteria'}
              </h2>
              
              {filteredDoctors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredDoctors.map((doctor) => (
                    <div 
                      key={doctor.id} 
                      className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:transform hover:-translate-y-2 border-2 ${
                        selectedDoctor?.id === doctor.id 
                          ? 'border-[#FF3D71]' 
                          : 'border-gray-200'
                      } cursor-pointer h-full w-full`}
                      onClick={() => handleDoctorClick(doctor)}
                    >
                      <div className="h-52 overflow-hidden relative">
                        <div className="absolute top-3 right-3 bg-[#FF3D71] text-white px-2 py-0.5 rounded-full text-xs font-semibold z-10">
                          {doctor.specialization || doctor.speciality || 'Specialist'}
                        </div>
                        <img 
                          src={doctor.imgUrl || (doctor.image && doctor.image.length > 0 ? byteArrayToDataUrl(doctor.image) : defaultDoctorImage)} 
                          alt={doctor.name} 
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        />
                        {selectedDoctor?.id === doctor.id && (
                          <div className="absolute top-3 left-3 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                            Selected
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-[#14396D] mb-1">{doctor.name}</h3>
                        
                        {/* Display department/specialization */}
                        <div className="mb-2">
                          <span className="text-xs font-medium text-gray-500">
                            {doctor.departmentName || doctor.department || 'Department'} • {doctor.specialization || doctor.speciality || 'Specialist'}
                          </span>
                        </div>
                        
                        {/* Display gender and age if available */}
                        {(doctor.gender || doctor.age) && (
                          <div className="flex items-center mb-2 text-xs text-gray-600">
                            {doctor.gender && (
                              <span className="mr-2">{doctor.gender}</span>
                            )}
                            {doctor.age && (
                              <span>{doctor.age} years</span>
                            )}
                          </div>
                        )}
                        
                        <Link 
                          to="/appointment" 
                          state={{ doctorId: doctor.id, departmentId: doctor.departmentId, showForm: true }}
                          className="bg-gradient-to-r from-[#14396D] to-[#2C5078] hover:from-[#2C5078] hover:to-[#14396D] text-white rounded-lg px-4 py-2 w-full transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center mt-2 text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          Book Appointment
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-700">No Doctors Found</h3>
                  <p className="mt-2 text-gray-500">Try adjusting your search filters to find available doctors.</p>
                </div>
              )}
            </div>
          </section>

          {/* Doctor Details Section */}
          {selectedDoctor && (
            <section id="doctor-details" className="py-12 px-4 bg-white">
              <div className="max-w-7xl mx-auto">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-10 shadow-lg">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Doctor Image */}
                    <div className="md:w-1/3 lg:w-1/4">
                      <div className="rounded-xl overflow-hidden shadow-md h-64 md:h-full">
                        <img 
                          src={selectedDoctor.imgUrl || (selectedDoctor.image && selectedDoctor.image.length > 0 ? byteArrayToDataUrl(selectedDoctor.image) : defaultDoctorImage)} 
                          alt={selectedDoctor.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* Doctor Info */}
                    <div className="md:w-2/3 lg:w-3/4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                        <h2 className="text-3xl font-bold text-[#14396D]">{selectedDoctor.name}</h2>
                        <div className="mt-2 md:mt-0">
                          <span className="bg-[#FF3D71] text-white px-3 py-1 rounded-full text-sm font-semibold">
                            {selectedDoctor.specialization || selectedDoctor.speciality || 'Specialist'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#FF3D71] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <div>
                            <h4 className="font-semibold text-gray-800">Department</h4>
                            <p className="text-gray-600">{selectedDoctor.departmentName || selectedDoctor.department || 'Not specified'}</p>
                          </div>
                        </div>
                        
                        {(selectedDoctor.gender || selectedDoctor.age) && (
                          <div className="flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#FF3D71] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <div>
                              <h4 className="font-semibold text-gray-800">Personal</h4>
                              <p className="text-gray-600">
                                {selectedDoctor.gender ? `${selectedDoctor.gender}` : ''}
                                {selectedDoctor.gender && selectedDoctor.age ? ', ' : ''}
                                {selectedDoctor.age ? `${selectedDoctor.age} years` : ''}
                                {!selectedDoctor.gender && !selectedDoctor.age ? 'Not specified' : ''}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedDoctor.email && (
                          <div className="flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#FF3D71] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <h4 className="font-semibold text-gray-800">Email</h4>
                              <p className="text-gray-600">{selectedDoctor.email}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedDoctor.experience && (
                          <div className="flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#FF3D71] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <h4 className="font-semibold text-gray-800">Experience</h4>
                              <p className="text-gray-600">{selectedDoctor.experience}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {selectedDoctor.bio && (
                        <div className="mb-6">
                          <h3 className="text-xl font-semibold text-[#14396D] mb-2">About</h3>
                          <p className="text-gray-700">{selectedDoctor.bio}</p>
                        </div>
                      )}
                      
                      {selectedDoctor.education && (
                        <div className="mb-6">
                          <h3 className="text-xl font-semibold text-[#14396D] mb-2">Education</h3>
                          <p className="text-gray-700">{selectedDoctor.education}</p>
                        </div>
                      )}
                      
                      {selectedDoctor.languages && selectedDoctor.languages.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-xl font-semibold text-[#14396D] mb-2">Languages</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedDoctor.languages.map((language, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                {language}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedDoctor.awards && selectedDoctor.awards.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-xl font-semibold text-[#14396D] mb-2">Awards & Recognitions</h3>
                          <ul className="list-disc pl-5 text-gray-700">
                            {selectedDoctor.awards.map((award, index) => (
                              <li key={index}>{award}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="mt-6">
                        <Link 
                          to="/appointment" 
                          state={{ doctorId: selectedDoctor.id, departmentId: selectedDoctor.departmentId, showForm: true }}
                          className="bg-gradient-to-r from-[#14396D] to-[#2C5078] hover:from-[#2C5078] hover:to-[#14396D] text-white rounded-lg px-6 py-3 inline-flex items-center transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          Book Appointment
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default DoctorsPage;
