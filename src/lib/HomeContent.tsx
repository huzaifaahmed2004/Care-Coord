import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ImageSlider from './ImageSlider';
import Slider from './Slider';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Hero slider images
const heroSlides = [
  {
    id: 1,
    imageUrl: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1600&q=80",
    title: "Your Most Trusted Health Partner",
    subtitle: "TOTAL HEALTH CARE SOLUTION",
    description: "Your health is our top priority. Our state-of-the-art healthcare facility offers a wide range of services to help you achieve optimal wellness."
  },
  {
    id: 2,
    imageUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1600&q=80",
    title: "Expert Doctors & Modern Equipment",
    subtitle: "ADVANCED MEDICAL CARE",
    description: "Our team of experienced doctors and cutting-edge technology ensure you receive the highest quality medical care available."
  },
  {
    id: 3,
    imageUrl: "https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?auto=format&fit=crop&w=1600&q=80",
    title: "Personalized Care For Every Patient",
    subtitle: "PATIENT-CENTERED APPROACH",
    description: "We believe in treating the whole person, not just the symptoms. Our personalized care plans are tailored to your unique needs."
  }
];

// Default images for fallback - only used if database has no image
const defaultDepartmentImage = "https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=600&q=80";
const defaultDoctorImage = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80";

// Types for database objects
interface Department {
  id: string;
  name: string;
  image?: Uint8Array; // Image stored as bytes in the database
  imgUrl?: string; // URL to image if stored externally
  description: string;
  location?: string;
  headDoctor?: string;
  contactEmail?: string;
  contactPhone?: string;
  feePercentage?: number;
}

interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  speciality?: string; // Some records might use speciality instead of specialization
  departmentId?: string;
  department?: string; // Department name
  departmentName?: string;
  gender?: string;
  age?: string;
  email?: string;
  imgUrl?: string; // URL to image if stored externally
  image?: Uint8Array; // Image stored as bytes in the database
  feePercentage?: number;
}

export default function HomeContent() {
  const { user } = useAuth() ?? {};
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState({
    departments: true,
    doctors: true
  });
  const [error, setError] = useState<string | null>(null);

  // Helper function to convert byte array to data URL
  const byteArrayToDataUrl = (bytes: Uint8Array | undefined, mimeType = 'image/jpeg'): string => {
    if (!bytes || bytes.length === 0) return '';
    try {
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Error converting byte array to data URL:', error);
      return '';
    }
  };
  
  // Helper function to get image source
  const getImageSrc = (doctor: Doctor): string => {
    if (doctor.imgUrl && doctor.imgUrl.length > 0) {
      return doctor.imgUrl;
    } else if (doctor.image && doctor.image.length > 0) {
      return byteArrayToDataUrl(doctor.image);
    }
    return defaultDoctorImage;
  };
  
  // Helper function to get department image source
  const getDepartmentImageSrc = (dept: Department): string => {
    if (dept.image && dept.image.length > 0) {
      return byteArrayToDataUrl(dept.image);
    }
    return defaultDepartmentImage;
  };

  // Fetch departments from database
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const departmentsCollection = collection(db, 'departments');
        const departmentsSnapshot = await getDocs(departmentsCollection);
        const departmentsList = departmentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Department',
            image: data.image, // Get image bytes from database
            imgUrl: data.imgUrl || '', // URL to image if stored externally
            description: data.description || `Specialized care in ${data.name || 'medicine'}`,
            location: data.location || '',
            headDoctor: data.headDoctor || '',
            contactEmail: data.contactEmail || '',
            contactPhone: data.contactPhone || '',
            feePercentage: data.feePercentage || 0
          };
        });
        setDepartments(departmentsList);
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load departments');
      } finally {
        setLoading(prev => ({ ...prev, departments: false }));
      }
    }

    fetchDepartments();
  }, []);

  // Fetch doctors from database
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const doctorsCollection = collection(db, 'doctors');
        const doctorsSnapshot = await getDocs(doctorsCollection);
        const doctorsList = doctorsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Doctor',
            specialization: data.specialization || data.speciality || 'Specialist',
            speciality: data.speciality || data.specialization || 'Specialist',
            departmentId: data.departmentId || '',
            department: data.department || '',
            departmentName: data.departmentName || data.department || '',
            gender: data.gender || '',
            age: data.age || '',
            email: data.email || '',
            imgUrl: data.imgUrl || '',
            image: data.image, // Get image bytes from database
            feePercentage: data.feePercentage || 0
          };
        });
        setDoctors(doctorsList);
      } catch (err) {
        console.error('Error fetching doctors:', err);
        setError('Failed to load doctors');
      } finally {
        setLoading(prev => ({ ...prev, doctors: false }));
      }
    }

    fetchDoctors();
  }, []);

  const handleAppointmentClick = () => {
    if (!user) {
      navigate('/login', { state: { from: '/appointment', showForm: true } });
    } else {
      navigate('/appointment', { state: { showForm: true } });
    }
  };

  return (
    <main className="bg-[#F6F8FB] min-h-screen">
      {/* Hero Section with Image Slider */}
      <section className="relative w-full h-[550px] md:h-[650px] overflow-hidden">
        <ImageSlider slides={heroSlides} interval={5000} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-xl">
              <div className="text-xs md:text-sm text-[#FF3D71] font-bold mb-3 uppercase tracking-widest bg-white/10 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                {heroSlides[0].subtitle}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                {heroSlides[0].title}
              </h1>
              <p className="text-gray-200 mb-8 text-base sm:text-lg max-w-lg">
                {heroSlides[0].description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  className="bg-[#FF3D71] hover:bg-[#ff5996] text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                  onClick={handleAppointmentClick}
                >
                  <span>Make an Appointment</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <a href="#services-section" className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:bg-white/10 flex items-center justify-center">
                  <span>Our Services</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services-section" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 bg-[#F6F8FB] rounded-full text-[#FF3D71] font-semibold text-sm mb-4">OUR SERVICES</div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#14396D] mb-6">Healthcare Services We Provide</h2>
            <div className="w-24 h-1 bg-[#FF3D71] mx-auto mb-6"></div>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              We provide a wide range of medical services with state-of-the-art technology to meet your healthcare needs.
            </p>
          </div>
          
          <div className="grid gap-8 grid-cols-1 md:grid-cols-3 text-center">
            <div className="bg-white rounded-xl shadow-lg py-10 px-6 flex flex-col items-center transition-all duration-300 hover:shadow-xl hover:transform hover:-translate-y-2 border border-gray-100">
              <div className="bg-gradient-to-r from-[#FF3D71] to-[#ff5996] p-5 rounded-full mb-6 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-[#14396D]">24/7 Medical Care</h3>
              <div className="text-xs sm:text-sm uppercase mb-3 font-semibold text-[#FF3D71] bg-[#FFF0F4] px-3 py-1 rounded-full">Online Appointment</div>
              <p className="text-gray-600 mb-6">Get round-the-clock support for emergency care. We have introduced the principle of family medicine for your convenience.</p>
              <button 
                className="bg-gradient-to-r from-[#14396D] to-[#2C5078] hover:from-[#2C5078] hover:to-[#14396D] text-white rounded-lg px-6 py-3 mt-auto transition-all duration-300 shadow-md hover:shadow-lg w-full"
                onClick={handleAppointmentClick}
              >
                Make an Appointment
              </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg py-10 px-6 flex flex-col items-center transition-all duration-300 hover:shadow-xl hover:transform hover:-translate-y-2 border border-gray-100">
              <div className="bg-gradient-to-r from-[#FF3D71] to-[#ff5996] p-5 rounded-full mb-6 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-[#14396D]">Flexible Scheduling</h3>
              <div className="text-xs sm:text-sm uppercase mb-3 font-semibold text-[#FF3D71] bg-[#FFF0F4] px-3 py-1 rounded-full">Working Hours</div>
              <ul className="text-gray-600 mb-6 text-sm sm:text-base bg-[#F6F8FB] p-4 rounded-lg w-full">
                <li className="mb-2 flex justify-between"><span>Mon - Wed:</span> <span className="font-bold text-[#14396D]">8:00 - 17:00</span></li>
                <li className="mb-2 flex justify-between"><span>Thu - Fri:</span> <span className="font-bold text-[#14396D]">9:00 - 17:00</span></li>
                <li className="flex justify-between"><span>Sat - Sun:</span> <span className="font-bold text-[#14396D]">10:00 - 17:00</span></li>
              </ul>
              <button 
                className="bg-gradient-to-r from-[#14396D] to-[#2C5078] hover:from-[#2C5078] hover:to-[#14396D] text-white rounded-lg px-6 py-3 mt-auto transition-all duration-300 shadow-md hover:shadow-lg w-full"
                onClick={handleAppointmentClick}
              >
                Check Availability
              </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg py-10 px-6 flex flex-col items-center transition-all duration-300 hover:shadow-xl hover:transform hover:-translate-y-2 border border-gray-100">
              <div className="bg-gradient-to-r from-[#FF3D71] to-[#ff5996] p-5 rounded-full mb-6 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-[#14396D]">Emergency Response</h3>
              <div className="text-xs sm:text-sm uppercase mb-3 font-semibold text-[#FF3D71] bg-[#FFF0F4] px-3 py-1 rounded-full">Urgent Care</div>
              <p className="text-gray-600 mb-6">Get immediate support for emergencies. We have introduced the principle of family medicine. Contact our emergency line for urgent medical assistance.</p>
              <a 
                href="tel:18007006200"
                className="bg-gradient-to-r from-[#FF3D71] to-[#ff5996] hover:from-[#ff5996] hover:to-[#FF3D71] text-white rounded-lg px-6 py-3 mt-auto transition-all duration-300 shadow-md hover:shadow-lg w-full text-center font-semibold"
              >
                Call: 1-800-700-6200
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section id="departments-section" className="py-20 bg-[#F6F8FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 bg-white rounded-full text-[#FF3D71] font-semibold text-sm mb-4">SPECIALIZED CARE</div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#14396D] mb-6">Our Medical Departments</h2>
            <div className="w-24 h-1 bg-[#FF3D71] mx-auto mb-6"></div>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Specialized departments with expert doctors and cutting-edge equipment to provide the highest quality care.
            </p>
          </div>
          
          {loading.departments ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF3D71]"></div>
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No departments available at the moment.</p>
            </div>
          ) : (
            <div className="px-4 py-4">
              <Slider
                slidesToShow={4}
                slidesToScroll={1}
                autoPlay={true}
                speed={3000}
                infinite={true}
                pauseOnHover={false}
                responsive={[
                  {
                    breakpoint: 1024,
                    settings: {
                      slidesToShow: 3,
                      slidesToScroll: 1
                    }
                  },
                  {
                    breakpoint: 768,
                    settings: {
                      slidesToShow: 2,
                      slidesToScroll: 1
                    }
                  },
                  {
                    breakpoint: 640,
                    settings: {
                      slidesToShow: 1,
                      slidesToScroll: 1
                    }
                  }
                ]}
                className="mx-auto"
              >
                {departments.map((dept) => (
                  <div key={dept.id} className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:transform hover:-translate-y-2 border border-gray-100 h-full flex flex-col">
                    <div className="h-48 overflow-hidden relative">
                      <div className="absolute top-4 right-4 bg-[#14396D] text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
                        {dept.name}
                      </div>
                      <img 
                        src={dept.imgUrl || (dept.image && dept.image.length > 0 ? byteArrayToDataUrl(dept.image) : defaultDepartmentImage)} 
                        alt={dept.name} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                    </div>
                    <div className="p-6 flex-grow flex flex-col">
                      <h3 className="text-xl font-bold text-[#14396D] mb-2">{dept.name}</h3>
                      <p className="text-gray-600 mb-4 flex-grow">{dept.description}</p>
                      <button 
                        className="bg-gradient-to-r from-[#14396D] to-[#2C5078] hover:from-[#2C5078] hover:to-[#14396D] text-white rounded-lg px-6 py-3 w-full transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center"
                        onClick={handleAppointmentClick}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        Make Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          )}
        </div>
      </section>

      {/* Doctor Profiles */}
      <section id="doctors-section" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 bg-[#F6F8FB] rounded-full text-[#FF3D71] font-semibold text-sm mb-4">EXPERT PHYSICIANS</div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#14396D] mb-6">Meet Our Specialists</h2>
            <div className="w-24 h-1 bg-[#FF3D71] mx-auto mb-6"></div>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Our team of experienced healthcare professionals is dedicated to providing exceptional care with compassion.
            </p>
          </div>
          
          {loading.doctors ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF3D71]"></div>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No doctors available at the moment.</p>
            </div>
          ) : (
            <div className="px-4 py-4">
              <Slider
                slidesToShow={3}
                slidesToScroll={1}
                autoPlay={true}
                speed={3000}
                infinite={true}
                pauseOnHover={false}
                responsive={[
                  {
                    breakpoint: 1024,
                    settings: {
                      slidesToShow: 2,
                      slidesToScroll: 1
                    }
                  },
                  {
                    breakpoint: 640,
                    settings: {
                      slidesToShow: 1,
                      slidesToScroll: 1
                    }
                  }
                ]}
                className="mx-auto"
              >
                {doctors.map((doctor: Doctor) => (
                  <div key={doctor.id} className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:transform hover:-translate-y-2 border-2 border-gray-200 h-full max-w-xs mx-auto">
                    <div className="h-52 overflow-hidden relative">
                      <div className="absolute top-3 right-3 bg-[#FF3D71] text-white px-2 py-0.5 rounded-full text-xs font-semibold z-10">
                        {doctor.specialization}
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
                          {doctor.departmentName || doctor.department || 'Department'} • {doctor.specialization || doctor.speciality || 'Specialist'}
                        </span>
                      </div>
                      
                      {/* Display gender and age if available - more compact */}
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
                      
                      <button 
                        className="bg-gradient-to-r from-[#14396D] to-[#2C5078] hover:from-[#2C5078] hover:to-[#14396D] text-white rounded-lg px-4 py-2 w-full transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center mt-2 text-sm"
                        onClick={handleAppointmentClick}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        Book Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          )}
        </div>
      </section>

      {/* Patient Testimonials Section */}
      <section className="py-20 bg-[#F6F8FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 bg-white rounded-full text-[#FF3D71] font-semibold text-sm mb-4">PATIENT STORIES</div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#14396D] mb-6">What Our Patients Say</h2>
            <div className="w-24 h-1 bg-[#FF3D71] mx-auto mb-6"></div>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Read about the experiences of our patients and how our healthcare services have made a difference in their lives.
            </p>
          </div>
          
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-8 rounded-xl shadow-lg relative">
              <div className="absolute -top-6 left-8 bg-[#FF3D71] w-12 h-12 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div className="flex items-center mb-6 mt-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-6 italic">"The care I received at CareCoord was exceptional. The doctors were attentive, the staff was friendly, and the facilities were state-of-the-art. I couldn't have asked for better care."</p>
              <div className="flex items-center">
                <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=100&q=80" alt="Patient" className="w-12 h-12 rounded-full object-cover" />
                <div className="ml-4">
                  <h4 className="font-bold text-[#14396D]">Sarah Thompson</h4>
                  <p className="text-sm text-gray-500">Cardiology Patient</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg relative">
              <div className="absolute -top-6 left-8 bg-[#FF3D71] w-12 h-12 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div className="flex items-center mb-6 mt-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-6 italic">"I was nervous about my procedure, but the team at CareCoord made me feel comfortable and informed every step of the way. The follow-up care has been amazing as well."</p>
              <div className="flex items-center">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Patient" className="w-12 h-12 rounded-full object-cover" />
                <div className="ml-4">
                  <h4 className="font-bold text-[#14396D]">Michael Johnson</h4>
                  <p className="text-sm text-gray-500">Orthopedics Patient</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg relative">
              <div className="absolute -top-6 left-8 bg-[#FF3D71] w-12 h-12 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div className="flex items-center mb-6 mt-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-6 italic">"As a parent, I was worried about my child's treatment, but the pediatric team at CareCoord was incredible. They made my child feel at ease and explained everything in a way we both could understand."</p>
              <div className="flex items-center">
                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80" alt="Patient" className="w-12 h-12 rounded-full object-cover" />
                <div className="ml-4">
                  <h4 className="font-bold text-[#14396D]">Emily Rodriguez</h4>
                  <p className="text-sm text-gray-500">Pediatrics Patient</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 bg-gradient-to-r from-[#14396D] to-[#2C5078]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-block px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[#FF3D71] font-semibold text-sm mb-4">HEALTHCARE MADE SIMPLE</div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Experience Better Healthcare?</h2>
            <div className="w-24 h-1 bg-[#FF3D71] mx-auto mb-6"></div>
            <p className="text-gray-200 max-w-2xl mx-auto text-lg mb-8">
              Our dedicated team of healthcare professionals is ready to provide you with the best medical care available.  
            </p>
            <button 
              className="bg-gradient-to-r from-[#FF3D71] to-[#ff5996] hover:from-[#ff5996] hover:to-[#FF3D71] text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg transition-all duration-300 inline-flex items-center justify-center"
              onClick={handleAppointmentClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Your Appointment Now
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
