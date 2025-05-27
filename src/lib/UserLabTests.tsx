import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

interface LabTest {
  id: string;
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
  resultFileUrl?: string | null; // Legacy field for backward compatibility
  reportData?: string; // Base64 encoded file data
  reportMetadata?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: string;
    patientName: string;
    patientEmail: string;
  };
}

export default function UserLabTests({ onNewTest }: { onNewTest: () => void }) {
  const { user } = useAuth() ?? {};
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Function to check and update lab test status based on time
  const updateLabTestStatusBasedOnTime = async (testsList: LabTest[]) => {
    const now = new Date();
    const testsToUpdate: { id: string, status: string }[] = [];
    
    // Check each test
    testsList.forEach(test => {
      const testDateTime = new Date(`${test.date} ${test.time}`);
      
      // If test time has passed and status is still 'scheduled', mark as 'completed'
      if (testDateTime < now && test.status === 'scheduled') {
        testsToUpdate.push({
          id: test.id,
          status: 'completed'
        });
      }
    });
    
    // Update tests in Firestore
    const updatePromises = testsToUpdate.map(async ({ id, status }) => {
      const testRef = doc(db, 'labTests', id);
      await updateDoc(testRef, {
        status,
        updatedAt: new Date().toISOString()
      });
      
      // Also update local state
      setLabTests(prev => 
        prev.map(test => 
          test.id === id 
            ? { ...test, status } 
            : test
        )
      );
    });
    
    if (updatePromises.length > 0) {
      try {
        await Promise.all(updatePromises);
        console.log(`Updated ${updatePromises.length} lab tests to 'completed' status`);
      } catch (err) {
        console.error('Error updating lab test statuses:', err);
      }
    }
  };

  // Fetch user lab tests
  useEffect(() => {
    async function fetchLabTests() {
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
        
        // Then get all lab tests for this patient
        const labTestsQuery = query(
          collection(db, 'labTests'), 
          where('patientId', '==', patientId)
        );
        
        const labTestsSnapshot = await getDocs(labTestsQuery);
        
        if (labTestsSnapshot.empty) {
          setLabTests([]);
          setLoading(false);
          return;
        }
        
        const testsList = labTestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as LabTest));
        
        // Sort by date and time (most recent first)
        testsList.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB.getTime() - dateA.getTime();
        });
        
        setLabTests(testsList);
        
        // Check and update status based on time
        await updateLabTestStatusBasedOnTime(testsList);
      } catch (err) {
        console.error('Error fetching lab tests:', err);
        setError('Failed to load your lab tests. Please try again.');
      }
      
      setLoading(false);
    }
    
    fetchLabTests();
  }, [user]);

  // Function to open test details modal
  const openTestDetails = (test: LabTest) => {
    setSelectedTest(test);
    setShowModal(true);
  };

  // Function to close test details modal
  const closeTestDetails = () => {
    setShowModal(false);
    setSelectedTest(null);
  };

  // Function to download test result
  const downloadTestResult = (test: LabTest) => {
    // Create a temporary anchor element
    const a = document.createElement('a');
    
    // Determine filename
    let filename = 'Lab_Test_Result';
    if (test.reportMetadata?.fileName) {
      filename = test.reportMetadata.fileName;
    }
    
    // Handle both legacy URL and base64 data
    if (test.reportData) {
      // Use base64 data
      a.href = test.reportData;
    } else if (test.resultFileUrl) {
      // Use legacy URL
      a.href = test.resultFileUrl;
    } else {
      console.error('No report data available');
      return;
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Function to get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // If loading
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full">
          <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-white">Loading your lab tests...</span>
        </div>
      </div>
    );
  }

  // If error
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md inline-flex items-start max-w-md mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button
          onClick={onNewTest}
          className="mt-4 inline-flex items-center px-4 py-2 bg-[#FF3D71] text-white rounded-md hover:bg-[#ff5996] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Schedule Your First Lab Test
        </button>
      </div>
    );
  }

  // If no lab tests
  if (labTests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Lab Tests Found</h3>
        <p className="text-gray-300 mb-6">You haven't scheduled any lab tests yet.</p>
        <button
          onClick={onNewTest}
          className="inline-flex items-center px-4 py-2 bg-[#FF3D71] text-white rounded-md hover:bg-[#ff5996] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Schedule Your First Lab Test
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm text-green-700">{successMessage}</p>
            <button 
              className="text-xs text-green-600 hover:text-green-800 mt-1"
              onClick={() => setSuccessMessage(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Lab tests list */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-white/10">
        <div className="p-6 bg-gradient-to-r from-[#14396D]/40 to-[#2C5078]/40 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#FF3D71]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Your Lab Tests
          </h3>
          <button
            onClick={onNewTest}
            className="inline-flex items-center px-3 py-1.5 bg-[#FF3D71] text-white text-sm rounded-md hover:bg-[#ff5996] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Test
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/5">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Tests
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {labTests.map(test => (
                <tr key={test.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{formatDate(test.date)}</div>
                    <div className="text-xs text-gray-400">{test.time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">
                      {test.tests.length > 1 ? (
                        <>
                          <span>{test.tests[0].name}</span>
                          <span className="text-xs text-gray-400 ml-1">+{test.tests.length - 1} more</span>
                        </>
                      ) : (
                        <span>{test.tests[0].name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(test.status)}`}>
                      {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    Rs {test.totalPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openTestDetails(test)}
                      className="bg-[#3373FF] hover:bg-[#5D93FF] text-white py-1 px-3 rounded-md text-sm mr-3 transition-colors shadow-sm"
                    >
                      View Details
                    </button>
                    {(test.resultFileUrl || test.reportData) && (
                      <button
                        onClick={() => downloadTestResult(test)}
                        className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-md text-sm transition-colors shadow-sm"
                      >
                        Download Report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Details Modal */}
      {showModal && selectedTest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">Lab Test Details</h3>
              <button
                onClick={closeTestDetails}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">Appointment Information</h4>
                    <p className="text-gray-600 text-sm">Scheduled for {formatDate(selectedTest.date)} at {selectedTest.time}</p>
                  </div>
                  <span className={`px-3 py-1 text-sm rounded-full ${getStatusBadgeClass(selectedTest.status)}`}>
                    {selectedTest.status.charAt(0).toUpperCase() + selectedTest.status.slice(1)}
                  </span>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h5 className="font-semibold text-gray-700 mb-3">Tests</h5>
                  <div className="space-y-3">
                    {selectedTest.tests.map((test, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-800">{test.name}</span>
                        <span className="text-gray-600">Rs {test.price.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-gray-200 flex justify-between items-center font-semibold">
                      <span className="text-gray-800">Total</span>
                      <span className="text-[#3373FF]">Rs {selectedTest.totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {(selectedTest.resultFileUrl || selectedTest.reportData) ? (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-1">Test Results Available</h5>
                        <p className="text-sm text-gray-600 mb-3">Your test results have been uploaded and are ready for download.</p>
                        {selectedTest.reportMetadata && (
                          <p className="text-xs text-gray-500 mb-3">
                            File: {selectedTest.reportMetadata.fileName} 
                            ({(selectedTest.reportMetadata.fileSize / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        )}
                        <button
                          onClick={() => downloadTestResult(selectedTest)}
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download Report
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  selectedTest.status === 'completed' && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h5 className="font-semibold text-gray-800 mb-1">Results Pending</h5>
                          <p className="text-sm text-gray-600">Your test has been completed, but results are still being processed. Please check back later.</p>
                        </div>
                      </div>
                    </div>
                  )
                )}
                
                <div className="text-right">
                  <button
                    onClick={closeTestDetails}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
