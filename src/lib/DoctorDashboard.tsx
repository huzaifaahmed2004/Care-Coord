import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  departmentId: string;
  departmentName: string;
  date: string;
  time: string;
  status: string;
  reason: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  noShow?: boolean;
}

interface Doctor {
  id?: string;
  name: string;
  email: string;
  department: string;
  departmentId?: string;
  speciality: string;
  imgUrl?: string;
}

const DoctorDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if doctor is logged in
    const doctorSession = localStorage.getItem('doctorSession');
    const doctorId = localStorage.getItem('doctorId');
    
    if (doctorSession !== 'yes' || !doctorId) {
      navigate('/doctor/login');
      return;
    }
    
    const fetchDoctorAndAppointments = async () => {
      setLoading(true);
      try {
        // Fetch doctor information
        const doctorRef = doc(db, 'doctors', doctorId);
        const doctorSnap = await getDoc(doctorRef);
        
        if (!doctorSnap.exists()) {
          throw new Error('Doctor not found');
        }
        
        const doctorData = { id: doctorSnap.id, ...doctorSnap.data() } as Doctor;
        setDoctor(doctorData);
        
        // Fetch appointments for this doctor
        // Using a simpler query that doesn't require a composite index
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('doctorId', '==', doctorId)
        );
        
        const appointmentsSnap = await getDocs(appointmentsQuery);
        const appointmentsData = appointmentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Appointment));
        
        // Sort appointments client-side instead of using orderBy in the query
        const sortedAppointments = [...appointmentsData].sort((a, b) => {
          // First sort by date (descending)
          const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateComparison !== 0) return dateComparison;
          
          // If dates are the same, sort by time (descending)
          return b.time.localeCompare(a.time);
        });
        
        setAppointments(sortedAppointments);
      } catch (err: any) {
        console.error('Error fetching doctor data:', err);
        setError(err.message || 'Failed to load doctor information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctorAndAppointments();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('doctorSession');
    localStorage.removeItem('doctorId');
    localStorage.removeItem('doctorEmail');
    navigate('/doctor/login');
  };

  // Check if appointment time has passed
  const hasAppointmentTimePassed = (appointment: Appointment) => {
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    return appointmentDate < now;
  };
  
  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: string, newStatus: 'completed' | 'no-show') => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      // Define the update data with proper typing
      type UpdateData = {
        status: 'completed' | 'no-show';
        updatedAt: string;
        completedAt?: string;
        completedBy?: string;
        noShow?: boolean;
      };
      
      const updateData: UpdateData = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      
      if (newStatus === 'completed') {
        updateData.completedAt = new Date().toISOString();
        updateData.completedBy = doctor?.id || '';
        updateData.noShow = false;
      } else if (newStatus === 'no-show') {
        updateData.completedAt = new Date().toISOString();
        updateData.completedBy = doctor?.id || '';
        updateData.noShow = true;
      }
      
      await updateDoc(appointmentRef, updateData);
      
      // Update local state
      setAppointments(prevAppointments => 
        prevAppointments.map(apt => 
          apt.id === appointmentId ? { ...apt, ...updateData } : apt
        )
      );
      
      // Update selected appointment if it's the one being modified
      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment(prev => prev ? { ...prev, ...updateData } : null);
      }
      
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setError('Failed to update appointment status. Please try again.');
    }
  };
  
  // Filter appointments based on active tab
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    const today = new Date();
    
    if (activeTab === 'upcoming') {
      return appointmentDate >= today;
    } else if (activeTab === 'past') {
      return appointmentDate < today;
    }
    return true; // 'all' tab
  });

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#14396D]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center mb-2">Error</h2>
          <p className="text-gray-600 text-center">{error}</p>
          <div className="mt-6 text-center">
            <button 
              onClick={() => navigate('/doctor/login')}
              className="bg-[#14396D] text-white px-4 py-2 rounded-lg hover:bg-[#0f2d5c] transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#14396D] to-[#2C5078] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-white rounded-full p-1.5 flex items-center justify-center w-10 h-10">
                <span className="text-[#FF3D71] text-xl">❤</span>
              </div>
              <h1 className="ml-3 text-xl font-bold">CARECOORD</h1>
            </div>
            
            <div className="flex items-center">
              {doctor && (
                <div className="flex items-center mr-6">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 mr-3">
                    {doctor.imgUrl ? (
                      <img src={doctor.imgUrl} alt={doctor.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold">
                        {doctor.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{doctor.name}</p>
                    <p className="text-xs text-blue-100">{doctor.speciality}</p>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">My Appointments</h2>
            <p className="text-gray-500 mt-1">Manage your patient appointments</p>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              className={`px-6 py-3 font-medium text-sm ${activeTab === 'upcoming' ? 'text-[#14396D] border-b-2 border-[#14396D]' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={`px-6 py-3 font-medium text-sm ${activeTab === 'past' ? 'text-[#14396D] border-b-2 border-[#14396D]' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('past')}
            >
              Past
            </button>
            <button
              className={`px-6 py-3 font-medium text-sm ${activeTab === 'all' ? 'text-[#14396D] border-b-2 border-[#14396D]' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
          </div>
          
          {/* Appointments List */}
          <div className="p-6">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No appointments found</h3>
                <p className="text-gray-500">
                  {activeTab === 'upcoming' ? 'You have no upcoming appointments scheduled.' : 
                   activeTab === 'past' ? 'You have no past appointments.' : 
                   'You have no appointments in the system.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedAppointment(appointment)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{appointment.patientName}</h3>
                        <p className="text-gray-500 text-sm">{appointment.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{formatDate(appointment.date)}</p>
                        <p className="text-sm text-gray-500">{formatTime(appointment.time)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        appointment.status === 'no-show' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                      <button className="text-[#14396D] text-sm hover:text-[#0f2d5c] font-medium">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Appointment Details</h3>
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Patient</h4>
                  <p className="text-gray-900 font-medium">{selectedAppointment.patientName}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedAppointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    selectedAppointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedAppointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    selectedAppointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    selectedAppointment.status === 'no-show' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                  </span>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Date</h4>
                  <p className="text-gray-900">{formatDate(selectedAppointment.date)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Time</h4>
                  <p className="text-gray-900">{formatTime(selectedAppointment.time)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Department</h4>
                  <p className="text-gray-900">{selectedAppointment.departmentName}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Created</h4>
                  <p className="text-gray-900">{new Date(selectedAppointment.createdAt).toLocaleString()}</p>
                </div>
                
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Reason for Visit</h4>
                  <p className="text-gray-900">{selectedAppointment.reason}</p>
                </div>
                
                {selectedAppointment.notes && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Notes</h4>
                    <p className="text-gray-900">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex flex-wrap justify-between items-center gap-4">
                {/* Status update buttons - only shown if appointment time has passed and status isn't already completed/no-show */}
                {hasAppointmentTimePassed(selectedAppointment) && 
                 !['completed', 'no-show'].includes(selectedAppointment.status) && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark as Completed
                    </button>
                    <button
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'no-show')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Mark as No-Show
                    </button>
                  </div>
                )}
                
                {/* Show message if appointment time hasn't passed yet */}
                {!hasAppointmentTimePassed(selectedAppointment) && (
                  <div className="text-sm text-gray-500 italic flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Appointment status can be updated after {formatDate(selectedAppointment.date)} at {formatTime(selectedAppointment.time)}
                  </div>
                )}
                
                {/* Show completed info if appointment is completed */}
                {selectedAppointment.status === 'completed' && selectedAppointment.completedAt && (
                  <div className="text-sm text-green-600 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Marked as completed on {new Date(selectedAppointment.completedAt).toLocaleString()}
                  </div>
                )}
                
                {/* Show no-show info if appointment is no-show */}
                {selectedAppointment.status === 'no-show' && selectedAppointment.completedAt && (
                  <div className="text-sm text-purple-600 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Marked as no-show on {new Date(selectedAppointment.completedAt).toLocaleString()}
                  </div>
                )}
                
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
