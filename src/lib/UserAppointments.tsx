import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

interface Appointment {
  id: string;
  doctorName: string;
  departmentName: string;
  date: string;
  time: string;
  reason: string;
  status: string;
  totalFee: number;
  createdAt: string;
}

export default function UserAppointments({ onNewAppointment }: { onNewAppointment: () => void }) {
  const { user } = useAuth() ?? {};
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch user appointments
  useEffect(() => {
    async function fetchAppointments() {
      if (!user?.email) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // First get the patient ID
        const patientQuery = query(collection(db, 'patients'), where('email', '==', user.email));
        const patientSnapshot = await getDocs(patientQuery);
        
        if (patientSnapshot.empty) {
          setError('Patient profile not found. Please complete your profile first.');
          setLoading(false);
          return;
        }
        
        const patientId = patientSnapshot.docs[0].id;
        
        // Then get all appointments for this patient
        const appointmentsQuery = query(
          collection(db, 'appointments'), 
          where('patientId', '==', patientId)
        );
        
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsList = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Appointment[];
        
        // Sort by date (newest first)
        appointmentsList.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB.getTime() - dateA.getTime();
        });
        
        setAppointments(appointmentsList);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load your appointments. Please try again.');
      }
      
      setLoading(false);
    }
    
    fetchAppointments();
  }, [user]);

  // Handle appointment cancellation
  const handleCancel = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    setActionLoading(appointmentId);
    setSuccessMessage(null);
    
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setAppointments(prev => 
        prev.map(appointment => 
          appointment.id === appointmentId 
            ? { ...appointment, status: 'cancelled' } 
            : appointment
        )
      );
      
      setSuccessMessage('Appointment cancelled successfully.');
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      setError('Failed to cancel appointment. Please try again.');
    }
    
    setActionLoading(null);
  };

  // Handle appointment reschedule request
  const handleRescheduleRequest = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to request a reschedule for this appointment?')) return;
    
    setActionLoading(appointmentId);
    setSuccessMessage(null);
    
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: 'reschedule_requested',
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setAppointments(prev => 
        prev.map(appointment => 
          appointment.id === appointmentId 
            ? { ...appointment, status: 'reschedule_requested' } 
            : appointment
        )
      );
      
      setSuccessMessage('Reschedule request submitted successfully. Our staff will contact you shortly.');
    } catch (err) {
      console.error('Error requesting reschedule:', err);
      setError('Failed to request reschedule. Please try again.');
    }
    
    setActionLoading(null);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'reschedule_requested':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get human-readable status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'reschedule_requested':
        return 'Reschedule Requested';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Check if appointment is in the past
  const isAppointmentPast = (date: string, time: string) => {
    const appointmentDate = new Date(`${date} ${time}`);
    return appointmentDate < new Date();
  };

  // Check if appointment can be cancelled/rescheduled
  const canModifyAppointment = (status: string, date: string, time: string) => {
    return (
      (status === 'scheduled') && 
      !isAppointmentPast(date, time)
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF3D71]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-red-700">
        <p>{error}</p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Appointments Found</h3>
          <p className="text-gray-600 mb-6">You don't have any appointments scheduled yet.</p>
        </div>
        <button 
          onClick={onNewAppointment}
          className="bg-[#FF3D71] hover:bg-[#ff5996] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-300 inline-flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Book Your First Appointment
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 text-green-700">
          <p>{successMessage}</p>
        </div>
      )}
      
      <div className="p-6 flex justify-between items-center border-b border-gray-200">
        <h2 className="text-xl font-bold text-[#14396D]">Your Appointments</h2>
        <button 
          onClick={onNewAppointment}
          className="bg-[#FF3D71] hover:bg-[#ff5996] text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors duration-300 inline-flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Appointment
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Doctor & Department
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fee
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{appointment.doctorName}</div>
                  <div className="text-sm text-gray-500">{appointment.departmentName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(appointment.date)}</div>
                  <div className="text-sm text-gray-500">{formatTime(appointment.time)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                    {getStatusText(appointment.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Rs. {appointment.totalFee}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canModifyAppointment(appointment.status, appointment.date, appointment.time) ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleRescheduleRequest(appointment.id)}
                        disabled={actionLoading === appointment.id}
                        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                      >
                        {actionLoading === appointment.id ? 'Processing...' : 'Reschedule'}
                      </button>
                      <button
                        onClick={() => handleCancel(appointment.id)}
                        disabled={actionLoading === appointment.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {actionLoading === appointment.id ? 'Processing...' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400">
                      {isAppointmentPast(appointment.date, appointment.time) ? 'Past Appointment' : 'No Actions Available'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
