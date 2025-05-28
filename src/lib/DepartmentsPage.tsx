import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
  speciality?: string;
  email?: string;
  imgUrl?: string;
  image?: Uint8Array;
  specialization?: string;
}

interface Department {
  id?: string;
  name: string;
  description: string;
  location: string;
  headDoctor: string;
  headDoctorId?: string;
  contactEmail: string;
  contactPhone: string;
  imgUrl?: string;
  image?: Uint8Array;
  feePercentage: number;
  doctors?: Doctor[];
}

// Default images
const defaultDepartmentImage = "https://images.unsplash.com/photo-1516549655169-df83a0774514?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";
const defaultDoctorImage = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80";

const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [locations, setLocations] = useState<string[]>([]);

  // Fetch departments and their doctors
  useEffect(() => {
    async function fetchDepartmentsWithDoctors() {
      setLoading(true);
      try {
        // Get all departments
        const departmentsSnapshot = await getDocs(collection(db, "departments"));
        const departmentsData: Department[] = departmentsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Department)
        );

        // For each department, get its doctors
        const departmentsWithDoctors = await Promise.all(
          departmentsData.map(async (dept) => {
            const doctorsQuery = query(
              collection(db, "doctors"),
              where("departmentId", "==", dept.id)
            );
            const doctorsSnapshot = await getDocs(doctorsQuery);
            const doctors = doctorsSnapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as Doctor)
            );
            return { ...dept, doctors };
          })
        );

        setDepartments(departmentsWithDoctors);
        setFilteredDepartments(departmentsWithDoctors);
        
        // Extract unique locations
        const allLocations = departmentsWithDoctors
          .map(dept => dept.location)
          .filter((location): location is string => !!location);
        
        setLocations([...new Set(allLocations)]);
        
        // If there are departments, select the first one by default
        if (departmentsWithDoctors.length > 0) {
          setSelectedDepartment(departmentsWithDoctors[0]);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
        setError("Failed to load departments. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchDepartmentsWithDoctors();
  }, []);

  // Filter departments based on search term and location filter
  useEffect(() => {
    if (!departments.length) return;
    
    let filtered = [...departments];
    
    // Apply search term filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(dept => 
        dept.name.toLowerCase().includes(term) || 
        dept.location.toLowerCase().includes(term) || 
        dept.headDoctor.toLowerCase().includes(term) ||
        dept.description.toLowerCase().includes(term) ||
        dept.contactEmail.toLowerCase().includes(term)
      );
    }
    
    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(dept => dept.location === locationFilter);
    }
    
    setFilteredDepartments(filtered);
    
    // If we have filtered results and the currently selected department is not in the filtered list
    // select the first department from the filtered list
    if (filtered.length > 0 && selectedDepartment && !filtered.some(dept => dept.id === selectedDepartment.id)) {
      setSelectedDepartment(filtered[0]);
    }
  }, [departments, searchTerm, locationFilter, selectedDepartment]);

  // Handle department selection
  const handleDepartmentClick = (department: Department) => {
    setSelectedDepartment(department);
    // Scroll to department details section
    document.getElementById('department-details')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#14396D] to-[#2C5078] py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Our Medical Departments
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-3xl mx-auto">
            Explore our specialized departments staffed with experienced healthcare professionals dedicated to providing exceptional care.
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
          <p className="mt-4 text-gray-600">Loading departments...</p>
        </div>
      )}

      {!loading && departments.length === 0 && !error && (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">No Departments Found</h2>
          <p className="mt-2 text-gray-500">There are currently no departments available.</p>
        </div>
      )}

      {!loading && departments.length > 0 && (
        <>
          {/* Search and Filter Section */}
          <section className="py-8 px-4 bg-white shadow-sm">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* Search */}
                <div className="w-full md:w-1/2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search departments by name, location, or head doctor"
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Location Filter */}
                <div className="w-full md:w-1/2">
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-transparent"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  >
                    <option value="all">All Locations</option>
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
          
          {/* Departments List Section */}
          <section className="py-12 px-4">
            <div className="max-w-7xl mx-auto">
              
              <h2 className="text-2xl md:text-3xl font-bold text-[#14396D] mb-8 text-center">
                {filteredDepartments.length > 0 
                  ? `Our Medical Departments (${filteredDepartments.length})`
                  : 'No departments match your search criteria'}
              </h2>
              
              {/* No results after search */}
              {filteredDepartments.length === 0 && (
                <div className="bg-white rounded-xl shadow-md p-8 text-center mb-8 border border-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No matching departments found</h3>
                  <p className="text-gray-500 mb-4">Try adjusting your search criteria</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setLocationFilter('all');
                    }}
                    className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-[#3373FF] hover:bg-[#2860e0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3373FF] transition-colors duration-200"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDepartments.map((department) => (
                  <div 
                    key={department.id} 
                    className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl border-2 ${
                      selectedDepartment?.id === department.id 
                        ? 'border-[#FF3D71]' 
                        : 'border-gray-200'
                    } cursor-pointer`}
                    onClick={() => handleDepartmentClick(department)}
                  >
                    <div className="h-48 overflow-hidden relative">
                      <img 
                        src={department.imgUrl || (department.image && department.image.length > 0 ? byteArrayToDataUrl(department.image) : defaultDepartmentImage)} 
                        alt={department.name} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                      {selectedDepartment?.id === department.id && (
                        <div className="absolute top-3 right-3 bg-[#FF3D71] text-white px-2 py-1 rounded-full text-xs font-semibold">
                          Selected
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-[#14396D] mb-2">{department.name}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{department.description}</p>
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[#FF3D71]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {department.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[#FF3D71]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {department.headDoctor}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Department Details Section */}
          {selectedDepartment && (
            <section id="department-details" className="py-12 px-4 bg-white">
              <div className="max-w-7xl mx-auto">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-10 shadow-lg">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Department Image */}
                    <div className="md:w-1/3">
                      <div className="rounded-xl overflow-hidden shadow-md h-64 md:h-full">
                        <img 
                          src={selectedDepartment.imgUrl || (selectedDepartment.image && selectedDepartment.image.length > 0 ? byteArrayToDataUrl(selectedDepartment.image) : defaultDepartmentImage)} 
                          alt={selectedDepartment.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* Department Info */}
                    <div className="md:w-2/3">
                      <h2 className="text-3xl font-bold text-[#14396D] mb-4">{selectedDepartment.name}</h2>
                      <p className="text-gray-700 mb-6">{selectedDepartment.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#FF3D71] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <h4 className="font-semibold text-gray-800">Location</h4>
                            <p className="text-gray-600">{selectedDepartment.location}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#FF3D71] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <div>
                            <h4 className="font-semibold text-gray-800">Head Doctor</h4>
                            <p className="text-gray-600">{selectedDepartment.headDoctor}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#FF3D71] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <div>
                            <h4 className="font-semibold text-gray-800">Email</h4>
                            <p className="text-gray-600">{selectedDepartment.contactEmail}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#FF3D71] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <div>
                            <h4 className="font-semibold text-gray-800">Phone</h4>
                            <p className="text-gray-600">{selectedDepartment.contactPhone}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <Link 
                          to="/appointment" 
                          state={{ departmentId: selectedDepartment.id, showForm: true }}
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
                
                {/* Department Doctors */}
                <div className="mt-12">
                  <h3 className="text-2xl font-bold text-[#14396D] mb-6">
                    Doctors in {selectedDepartment.name}
                  </h3>
                  
                  {selectedDepartment.doctors && selectedDepartment.doctors.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {selectedDepartment.doctors.map((doctor) => (
                        <div key={doctor.id} className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:transform hover:-translate-y-2 border-2 border-gray-200 h-full max-w-xs mx-auto">
                          <div className="h-52 overflow-hidden relative">
                            <div className="absolute top-3 right-3 bg-[#FF3D71] text-white px-2 py-0.5 rounded-full text-xs font-semibold z-10">
                              {doctor.specialization || doctor.speciality || 'Specialist'}
                            </div>
                            <img 
                              src={doctor.imgUrl || (doctor.image && doctor.image.length > 0 ? byteArrayToDataUrl(doctor.image) : defaultDoctorImage)} 
                              alt={doctor.name} 
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-bold text-[#14396D] mb-1">{doctor.name}</h3>
                            
                            {/* Display department/specialization */}
                            <div className="mb-2">
                              <span className="text-xs font-medium text-gray-500">
                                {selectedDepartment.name} • {doctor.specialization || doctor.speciality || 'Specialist'}
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
                              state={{ doctorId: doctor.id, departmentId: selectedDepartment.id, showForm: true }}
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
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-700">No Doctors Found</h3>
                      <p className="mt-2 text-gray-500">There are currently no doctors assigned to this department.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default DepartmentsPage;
