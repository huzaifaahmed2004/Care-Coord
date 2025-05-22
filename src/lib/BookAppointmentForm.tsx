import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { collection, addDoc, getDocs, query, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  departmentId: string;
  departmentName: string;
  feePercentage: number;
}

interface Department {
  id: string;
  name: string;
  feePercentage: number;
}

export default function BookAppointmentForm() {
  const { user } = useAuth() ?? {};
  const navigate = useNavigate();
  
  // Form data
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [baseAppointmentFee, setBaseAppointmentFee] = useState(0);
  
  // Form fields
  const [formData, setFormData] = useState({
    doctorId: '',
    doctorName: '',
    departmentId: '',
    departmentName: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    reason: '',
    symptoms: '',
    previousVisit: 'no',
  });
  
  // Time validation
  const [minTime, setMinTime] = useState('09:00');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedFee, setCalculatedFee] = useState(0);
  
  // Fetch doctors, departments, and global settings
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch base appointment fee from global settings
        const globalDocRef = doc(db, 'global', 'baseAppointmentFee');
        const globalDoc = await getDoc(globalDocRef);
        
        if (globalDoc.exists()) {
          // Use the fee from the global document
          const fee = globalDoc.data()?.value || 1200; // Default to 1200 if value field doesn't exist
          console.log('Fetched base appointment fee from global settings:', fee);
          setBaseAppointmentFee(fee);
        } else {
          // Fallback to 1200 if the document doesn't exist
          console.log('Global settings document not found, using default fee');
          setBaseAppointmentFee(1200);
        }
        
        // Fetch departments
        const departmentsQuery = query(collection(db, 'departments'));
        const departmentSnapshot = await getDocs(departmentsQuery);
        const departmentsList = departmentSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          feePercentage: doc.data().feePercentage || 0
        }));
        setDepartments(departmentsList);
        
        // Fetch doctors
        const doctorsQuery = query(collection(db, 'doctors'));
        const doctorSnapshot = await getDocs(doctorsQuery);
        const doctorsList = doctorSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            specialization: data.specialization || data.speciality || '',
            departmentId: data.departmentId || '',
            departmentName: data.departmentName || '',
            feePercentage: data.feePercentage || 0
          };
        });
        setDoctors(doctorsList);
      } catch (e) {
        console.error('Error fetching data:', e);
        setError('Failed to load doctors and departments. Please try again.');
      }
      
      setLoading(false);
    }
    
    fetchData();
  }, []);
  
  // Filter doctors by department
  useEffect(() => {
    if (selectedDepartment) {
      const filtered = doctors.filter(doctor => doctor.departmentId === selectedDepartment);
      setFilteredDoctors(filtered);
      
      // Reset doctor selection if current selection is not in this department
      if (!filtered.find(d => d.id === formData.doctorId)) {
        setFormData(prev => ({
          ...prev,
          doctorId: '',
          doctorName: ''
        }));
      }
    } else {
      setFilteredDoctors(doctors);
    }
  }, [selectedDepartment, doctors, formData.doctorId]);
  
  // Calculate fee when doctor or department changes
  useEffect(() => {
    if (formData.doctorId && formData.departmentId && baseAppointmentFee > 0) {
      const doctor = doctors.find(d => d.id === formData.doctorId);
      const department = departments.find(d => d.id === formData.departmentId);
      
      if (doctor && department) {
        const doctorFee = baseAppointmentFee * (doctor.feePercentage / 100);
        const departmentFee = baseAppointmentFee * (department.feePercentage / 100);
        const totalFee = baseAppointmentFee + doctorFee + departmentFee;
        
        setCalculatedFee(Math.round(totalFee));
      }
    } else {
      setCalculatedFee(0);
    }
  }, [formData.doctorId, formData.departmentId, doctors, departments, baseAppointmentFee]);
  
  // Handle department change
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const departmentId = e.target.value;
    setSelectedDepartment(departmentId);
    
    const department = departments.find(d => d.id === departmentId);
    setFormData(prev => ({
      ...prev,
      departmentId,
      departmentName: department ? department.name : ''
    }));
  };
  
  // Handle doctor change
  const handleDoctorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const doctorId = e.target.value;
    const doctor = doctors.find(d => d.id === doctorId);
    
    setFormData(prev => ({
      ...prev,
      doctorId,
      doctorName: doctor ? doctor.name : ''
    }));
  };
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for date changes to update time restrictions
    if (name === 'date') {
      // Update form data with the new date
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // If selected date is today, restrict time selection to future times
      const today = new Date().toISOString().split('T')[0];
      if (value === today) {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        
        // Round up to the nearest 5 minutes
        minutes = Math.ceil(minutes / 5) * 5;
        if (minutes >= 60) {
          hours += 1;
          minutes = 0;
        }
        
        // Format time as HH:MM
        const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        setMinTime(currentTime);
        
        // If current time is after the selected time, update the time to the current time
        if (formData.time < currentTime) {
          setFormData(prev => ({
            ...prev,
            time: currentTime
          }));
        }
      } else {
        // For future dates, allow any time within business hours
        setMinTime('09:00');
      }
    } else {
      // For all other fields, just update normally
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to book an appointment.');
      return;
    }
    
    if (!formData.doctorId || !formData.departmentId || !formData.date || !formData.time) {
      setError('Please fill in all required fields.');
      return;
    }
    
    // Validate that the appointment time is not in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() === today.getTime()) {
      // If appointment is for today, check if the time has already passed
      const now = new Date();
      const [hours, minutes] = formData.time.split(':').map(Number);
      const appointmentTime = new Date();
      appointmentTime.setHours(hours, minutes, 0, 0);
      
      if (appointmentTime < now) {
        setError('Cannot book an appointment for a time that has already passed. Please select a future time.');
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user's patient profile
      const patientQuery = query(collection(db, 'patients'), where('email', '==', user.email));
      const patientSnapshot = await getDocs(patientQuery);
      
      if (patientSnapshot.empty) {
        setError('Patient profile not found. Please complete your profile first.');
        setLoading(false);
        return;
      }
      
      const patientDoc = patientSnapshot.docs[0];
      const patientData = patientDoc.data();
      
      // Create appointment
      const appointmentData = {
        patientId: patientDoc.id,
        patientName: patientData.name,
        patientEmail: patientData.email,
        patientPhone: patientData.phone,
        doctorId: formData.doctorId,
        doctorName: formData.doctorName,
        departmentId: formData.departmentId,
        departmentName: formData.departmentName,
        date: formData.date, // Store as string for better compatibility
        time: formData.time,
        reason: formData.reason,
        symptoms: formData.symptoms,
        previousVisit: formData.previousVisit,
        status: 'scheduled',
        baseFee: baseAppointmentFee,
        totalFee: calculatedFee,
        paymentStatus: 'paid',
        paymentDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'appointments'), appointmentData);
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setFormData({
        doctorId: '',
        doctorName: '',
        departmentId: '',
        departmentName: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        reason: '',
        symptoms: '',
        previousVisit: 'no'
      });
      setSelectedDepartment('');
    } catch (e) {
      console.error('Error booking appointment:', e);
      const errorMessage = e instanceof FirebaseError 
        ? e.message 
        : 'Failed to book appointment. Please try again.';
      setError(errorMessage);
    }
    
    setLoading(false);
  };
  
  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-[#14396D] mb-4">Appointment Booked Successfully!</h3>
          <p className="text-gray-600 mb-6">
            Your appointment has been scheduled. You will receive a confirmation email shortly.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => setSuccess(false)}
              className="bg-[#14396D] hover:bg-[#2C5078] text-white px-6 py-3 rounded-md font-semibold transition-colors duration-300"
            >
              Book Another Appointment
            </button>
            <button 
              onClick={() => {
                setSuccess(false);
                navigate('/', { replace: true });
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-md font-semibold transition-colors duration-300"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 max-w-3xl mx-auto overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#3373FF] to-[#FF3D71]"></div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Book Your Appointment</h2>
        <p className="text-gray-600">Fill out the form below to schedule a visit with one of our healthcare professionals.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Department Selection */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Department*
            </span>
          </label>
          <div className="relative">
            <select
              name="departmentId"
              value={formData.departmentId}
              onChange={handleDepartmentChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] appearance-none bg-white shadow-sm"
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Doctor Selection */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Doctor*
            </span>
          </label>
          <div className="relative">
            <select
              name="doctorId"
              value={formData.doctorId}
              onChange={handleDoctorChange}
              className={`w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] appearance-none bg-white shadow-sm ${!formData.departmentId ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              required
              disabled={!formData.departmentId}
            >
              <option value="">Select Doctor</option>
              {filteredDoctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialization}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {!formData.departmentId && (
            <p className="text-xs text-gray-500 mt-1.5 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Please select a department first
            </p>
          )}
        </div>
        
        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date*
              </span>
            </label>
            <div className="relative">
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] shadow-sm"
                required
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time*
              </span>
            </label>
            <div className="relative">
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] shadow-sm"
                required
                step="300"
                min={formData.date === new Date().toISOString().split('T')[0] ? minTime : '09:00'}
                max="17:00"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            {formData.date === new Date().toISOString().split('T')[0] && (
              <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                For today, only future times are available
              </p>
            )}
          </div>
        </div>
        
        {/* Reason for Visit */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Reason for Visit
            </span>
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] shadow-sm"
            rows={3}
            placeholder="Please describe the reason for your visit"
          ></textarea>
        </div>
        
        {/* Symptoms */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Symptoms
            </span>
          </label>
          <textarea
            name="symptoms"
            value={formData.symptoms}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] shadow-sm"
            rows={3}
            placeholder="Please describe any symptoms you are experiencing"
          ></textarea>
        </div>
        
        {/* Previous Visit */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Have you visited us before?
            </span>
          </label>
          <div className="flex gap-6 mt-2">
            <label className="inline-flex items-center cursor-pointer group">
              <div className={`relative inline-flex items-center justify-center w-5 h-5 rounded-full border ${formData.previousVisit === 'yes' ? 'border-[#3373FF] bg-[#3373FF]' : 'border-gray-400 group-hover:border-[#3373FF]'} transition-colors`}>
                <input
                  type="radio"
                  name="previousVisit"
                  value="yes"
                  checked={formData.previousVisit === 'yes'}
                  onChange={handleChange}
                  className="sr-only"
                />
                {formData.previousVisit === 'yes' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="ml-2 text-gray-700 group-hover:text-gray-900">Yes</span>
            </label>
            <label className="inline-flex items-center cursor-pointer group">
              <div className={`relative inline-flex items-center justify-center w-5 h-5 rounded-full border ${formData.previousVisit === 'no' ? 'border-[#3373FF] bg-[#3373FF]' : 'border-gray-400 group-hover:border-[#3373FF]'} transition-colors`}>
                <input
                  type="radio"
                  name="previousVisit"
                  value="no"
                  checked={formData.previousVisit === 'no'}
                  onChange={handleChange}
                  className="sr-only"
                />
                {formData.previousVisit === 'no' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="ml-2 text-gray-700 group-hover:text-gray-900">No</span>
            </label>
          </div>
        </div>
        
        {/* Fee Information */}
        {calculatedFee > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Appointment Fee Details
            </h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center py-1 border-b border-blue-100">
                <span className="text-gray-600">Base Fee:</span>
                <span className="font-medium text-gray-800">Rs. {baseAppointmentFee}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-blue-100">
                <span className="text-gray-600">Doctor Fee:</span>
                <span className="font-medium text-gray-800">Rs. {Math.round(baseAppointmentFee * (doctors.find(d => d.id === formData.doctorId)?.feePercentage || 0) / 100)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-blue-100">
                <span className="text-gray-600">Department Fee:</span>
                <span className="font-medium text-gray-800">Rs. {Math.round(baseAppointmentFee * (departments.find(d => d.id === formData.departmentId)?.feePercentage || 0) / 100)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center bg-white py-3 px-4 rounded-lg shadow-sm">
              <span className="text-gray-800 font-semibold">Total Fee:</span>
              <span className="text-xl font-bold text-[#3373FF]">Rs. {calculatedFee}</span>
            </div>
            <p className="text-xs text-gray-500 mt-3 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Payment will be collected at the hospital. We accept cash, credit cards, and online payment methods.</span>
            </p>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="pt-6">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3373FF] to-[#FF3D71] rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <button
              type="submit"
              disabled={loading}
              className={`relative w-full bg-gradient-to-r from-[#3373FF] to-[#5D93FF] hover:from-[#2860e0] hover:to-[#4A7FE5] text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book Your Appointment
                </>
              )}
            </button>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            By booking an appointment, you agree to our <a href="#" className="text-[#3373FF] hover:underline">Terms of Service</a> and <a href="#" className="text-[#3373FF] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </form>
    </div>
  );
}
