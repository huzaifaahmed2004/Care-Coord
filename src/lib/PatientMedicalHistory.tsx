import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from './firebase';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
}

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

interface LabTest {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  tests: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  date: string;
  time: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  resultFileUrl?: string | null;
  reportData?: string;
  reportMetadata?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: string;
    patientName: string;
    patientEmail: string;
  };
}

interface PatientMedicalHistoryProps {
  doctorId: string;
  patientId?: string;
}

const PatientMedicalHistory: React.FC<PatientMedicalHistoryProps> = ({ doctorId, patientId }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'appointments' | 'labTests'>('appointments');

  // Fetch patients that have appointments with this doctor
  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        // If a specific patientId is provided, only fetch that patient
        if (patientId) {
          const patientRef = doc(db, 'patients', patientId);
          const patientSnap = await getDoc(patientRef);
          
          if (patientSnap.exists()) {
            const patientData = patientSnap.data();
            const patient = {
              id: patientSnap.id,
              name: patientData.name,
              email: patientData.email,
              phone: patientData.phone,
              dob: patientData.dob,
              gender: patientData.gender
            };
            
            setPatients([patient]);
            setSelectedPatient(patient);
            // Automatically fetch this patient's medical history
            fetchPatientMedicalHistory(patientId);
          } else {
            setError('Patient not found');
          }
        } else {
          // Get all appointments for this doctor
          const appointmentsQuery = query(
            collection(db, 'appointments'),
            where('doctorId', '==', doctorId)
          );
          
          const appointmentsSnap = await getDocs(appointmentsQuery);
          const appointmentsData = appointmentsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Appointment));
          
          // Extract unique patient IDs
          const patientIds = [...new Set(appointmentsData.map(apt => apt.patientId))];
          
          // Fetch patient details for each patient ID
          const patientsList: Patient[] = [];
          
          for (const pid of patientIds) {
            // Query patients collection
            const patientsQuery = query(
              collection(db, 'patients'),
              where('id', '==', pid)
            );
            
            const patientsSnap = await getDocs(patientsQuery);
            
            if (!patientsSnap.empty) {
              const patientData = patientsSnap.docs[0].data();
              patientsList.push({
                id: patientsSnap.docs[0].id,
                name: patientData.name,
                email: patientData.email,
                phone: patientData.phone,
                dob: patientData.dob,
                gender: patientData.gender
              });
            }
          }
          
          setPatients(patientsList);
        }
      } catch (err: any) {
        console.error('Error fetching patients:', err);
        setError(err.message || 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, [doctorId, patientId]);

  // Fetch patient's medical history (appointments and lab tests)
  const fetchPatientMedicalHistory = async (patientId: string) => {
    setLoading(true);
    try {
      // Fetch appointments
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', patientId),
        where('doctorId', '==', doctorId)
      );
      
      const appointmentsSnap = await getDocs(appointmentsQuery);
      const appointmentsData = appointmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Appointment));
      
      // Sort appointments by date (newest first)
      const sortedAppointments = [...appointmentsData].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      setAppointments(sortedAppointments);
      
      // Fetch lab tests
      const labTestsQuery = query(
        collection(db, 'labTests'),
        where('patientId', '==', patientId)
      );
      
      const labTestsSnap = await getDocs(labTestsQuery);
      const labTestsData = labTestsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LabTest));
      
      // Sort lab tests by date (newest first)
      const sortedLabTests = [...labTestsData].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      setLabTests(sortedLabTests);
    } catch (err: any) {
      console.error('Error fetching patient medical history:', err);
      setError(err.message || 'Failed to load patient medical history');
    } finally {
      setLoading(false);
    }
  };

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    fetchPatientMedicalHistory(patient.id);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format time
  const formatTime = (timeString: string) => {
    return timeString;
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Download lab test report
  const downloadTestResult = (test: LabTest) => {
    try {
      // Handle base64 encoded reports
      if (test.reportData) {
        // Create a temporary link to download the base64 data
        const link = document.createElement('a');
        link.href = test.reportData;
        
        // Set filename from metadata if available, otherwise use a default name
        const fileName = test.reportMetadata?.fileName || `lab_report_${test.id}.pdf`;
        link.download = fileName;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } 
      // Handle legacy URL reports
      else if (test.resultFileUrl) {
        window.open(test.resultFileUrl, '_blank');
      } else {
        throw new Error('No report available for this test');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again later.');
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-orange-100 text-orange-800';
      case 'test-taken':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg">
      <div className="p-6">
        {selectedPatient && (
          <div>
            {/* Patient Info Header */}
            <div className="mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-800 font-medium text-lg">{selectedPatient.name.charAt(0)}</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{selectedPatient.name}</h3>
                  <p className="text-sm text-gray-500">{selectedPatient.email}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex">
                <button
                  className={`px-6 py-3 font-medium text-sm ${activeTab === 'appointments' ? 'text-[#14396D] border-b-2 border-[#14396D]' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('appointments')}
                >
                  Appointments
                </button>
                <button
                  className={`px-6 py-3 font-medium text-sm ${activeTab === 'labTests' ? 'text-[#14396D] border-b-2 border-[#14396D]' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('labTests')}
                >
                  Lab Tests
                </button>
              </nav>
            </div>

            {/* Content based on active tab */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading data...</p>
              </div>
            ) : (
              <>
                {/* Appointments Tab */}
                {activeTab === 'appointments' && (
                  <div>
                    {appointments.length === 0 ? (
                      <div className="text-center py-12">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No appointments found</h3>
                        <p className="text-gray-500">This patient has no appointments with you.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {appointments.map((appointment) => (
                          <div 
                            key={appointment.id} 
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(appointment.status)}`}>
                                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                  </span>
                                  {appointment.noShow && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      No Show
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-medium text-gray-900 mt-2">Reason: {appointment.reason}</h3>
                                {appointment.notes && (
                                  <div className="mt-2">
                                    <p className="text-sm text-gray-600 font-medium">Notes:</p>
                                    <p className="text-sm text-gray-500">{appointment.notes}</p>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{formatDate(appointment.date)}</p>
                                <p className="text-sm text-gray-500">{formatTime(appointment.time)}</p>
                                {appointment.completedAt && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Completed: {new Date(appointment.completedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Lab Tests Tab */}
                {activeTab === 'labTests' && (
                  <div>
                    {labTests.length === 0 ? (
                      <div className="text-center py-12">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No lab tests found</h3>
                        <p className="text-gray-500">This patient has no lab tests recorded.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {labTests.map((test) => (
                          <div 
                            key={test.id} 
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(test.status)}`}>
                                    {test.status.charAt(0).toUpperCase() + test.status.slice(1).replace('-', ' ')}
                                  </span>
                                </div>
                                <h3 className="font-medium text-gray-900 mt-2">
                                  {test.tests.map(t => t.name).join(', ')}
                                </h3>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{formatDate(test.date)}</p>
                                <p className="text-sm text-gray-500">{formatTime(test.time)}</p>
                              </div>
                            </div>
                            
                            {/* Report download button */}
                            {(test.reportData || test.resultFileUrl) && test.status === 'completed' && (
                              <div className="mt-4">
                                <button
                                  onClick={() => downloadTestResult(test)}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-[#14396D] hover:bg-[#0f2d5c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download Report
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientMedicalHistory;
