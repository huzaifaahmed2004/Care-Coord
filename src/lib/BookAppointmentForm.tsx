import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
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
  const [baseAppointmentFee, setBaseAppointmentFee] = useState(1000);
  
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
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedFee, setCalculatedFee] = useState(0);
  
  // Fetch doctors and departments
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
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
    if (formData.doctorId && formData.departmentId) {
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-2xl mx-auto">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-red-700">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Department Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department*
          </label>
          <select
            name="departmentId"
            value={formData.departmentId}
            onChange={handleDepartmentChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3D71]"
            required
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Doctor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Doctor*
          </label>
          <select
            name="doctorId"
            value={formData.doctorId}
            onChange={handleDoctorChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3D71]"
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
          {!formData.departmentId && (
            <p className="text-sm text-gray-500 mt-1">Please select a department first</p>
          )}
        </div>
        
        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date*
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3D71]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time*
            </label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3D71]"
              required
              step="300"
              min="09:00"
              max="17:00"
            />
          </div>
        </div>
        
        {/* Reason for Visit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Visit
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3D71]"
            placeholder="Please describe the reason for your appointment"
          />
        </div>
        
        {/* Symptoms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Symptoms
          </label>
          <textarea
            name="symptoms"
            value={formData.symptoms}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF3D71]"
            placeholder="Please describe any symptoms you are experiencing"
          />
        </div>
        
        {/* Previous Visit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Have you visited this doctor before?
          </label>
          <div className="flex gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="previousVisit"
                value="yes"
                checked={formData.previousVisit === 'yes'}
                onChange={handleChange}
                className="h-4 w-4 text-[#FF3D71] focus:ring-[#FF3D71]"
              />
              <span className="ml-2">Yes</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="previousVisit"
                value="no"
                checked={formData.previousVisit === 'no'}
                onChange={handleChange}
                className="h-4 w-4 text-[#FF3D71] focus:ring-[#FF3D71]"
              />
              <span className="ml-2">No</span>
            </label>
          </div>
        </div>
        
        {/* Fee Information */}
        {calculatedFee > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-[#14396D] mb-2">Appointment Fee</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Base Fee:</span>
                <span className="ml-2 font-semibold">Rs. {baseAppointmentFee}</span>
              </div>
              <div>
                <span className="text-gray-600">Doctor Fee:</span>
                <span className="ml-2 font-semibold">
                  +{doctors.find(d => d.id === formData.doctorId)?.feePercentage || 0}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Department Fee:</span>
                <span className="ml-2 font-semibold">
                  +{departments.find(d => d.id === formData.departmentId)?.feePercentage || 0}%
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="font-bold text-[#14396D]">Total Fee:</span>
              <span className="font-bold text-[#FF3D71] text-xl">Rs. {calculatedFee}</span>
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-[#FF3D71] hover:bg-[#ff5996] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-300 flex justify-center items-center"
            disabled={loading}
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
              'Book Appointment'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
