import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDocs, updateDoc, addDoc, query, where, Timestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
// Explicitly declare React to fix JSX element type errors
import React from 'react';

// Create a separate component for test items to fix scope issues
const ScheduledTestItem: React.FC<{
  test: ScheduledTest;
  handleUpdateTestStatus: (id: string, status: string) => Promise<void>;
  handleSetReportTime: (id: string, time: string) => Promise<void>;
  handleUploadReport: (id: string) => Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFile: File | null;
  selectedTestId: string | null;
  setSelectedTestId: (id: string | null) => void;
  uploadingReport: boolean;
  canMarkAsTaken: (test: ScheduledTest) => boolean;
  canCancel: (test: ScheduledTest) => boolean;
}> = ({
  test,
  handleUpdateTestStatus,
  handleSetReportTime,
  handleUploadReport,
  handleFileChange,
  selectedFile,
  selectedTestId,
  setSelectedTestId,
  uploadingReport,
  canMarkAsTaken,
  canCancel
}) => {
  return (
    <div key={test.id} className="bg-indigo-900/20 backdrop-blur-sm rounded-xl border border-indigo-500/20 overflow-hidden hover:bg-indigo-900/30 transition-all duration-200 shadow-md">
      <div className="p-6">
        {/* Header with test name and status */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
          <div>
            <h3 className="text-xl font-semibold text-white">
              {test.testName || (test.tests && test.tests.length > 0 ? test.tests[0].name : 'Unknown Test')}
            </h3>
            <div className="flex items-center mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                test.status === 'pending' || test.status === 'scheduled' ? 'bg-yellow-500/30 text-yellow-100 border border-yellow-500/40' :
                test.status === 'in-progress' ? 'bg-blue-500/30 text-blue-100 border border-blue-500/40' :
                test.status === 'completed' ? 'bg-green-500/30 text-green-100 border border-green-500/40' :
                test.status === 'cancelled' ? 'bg-red-500/30 text-red-100 border border-red-500/40' :
                'bg-gray-500/30 text-gray-100 border border-gray-500/40'
              }`}>
                {test.status === 'scheduled' ? 'Pending' : test.status || 'Pending'}
              </span>
            </div>
          </div>
          
          {/* Price */}
          {test.totalPrice && (
            <div className="bg-purple-700/20 rounded-lg px-4 py-2 border border-purple-500/30">
              <span className="text-xs text-white/70 block">Total Price</span>
              <span className="text-lg font-bold text-white">Rs {test.totalPrice.toLocaleString()}</span>
            </div>
          )}
        </div>
        
        {/* Rest of the component implementation */}
        {/* Patient and scheduling details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-indigo-900/30 rounded-lg p-4 border border-indigo-500/30">
            <div className="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Patient</h4>
            </div>
            <p className="text-white text-lg font-medium">{test.patientName}</p>
            <p className="text-white/70 text-sm mt-1">{test.patientEmail}</p>
          </div>
          
          <div className="bg-indigo-900/30 rounded-lg p-4 border border-indigo-500/30">
            <div className="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Scheduled Date</h4>
            </div>
            <p className="text-white text-lg font-medium">
              {test.date || (test.scheduledDate instanceof Date ? test.scheduledDate.toLocaleDateString() : test.scheduledDate && 'toDate' in test.scheduledDate ? test.scheduledDate.toDate().toLocaleDateString() : 'N/A')}
            </p>
            <p className="text-white/70 text-sm mt-1">{test.time || 'Time not specified'}</p>
          </div>
          
          <div className="bg-indigo-900/30 rounded-lg p-4 border border-indigo-500/30">
            <div className="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Report Ready</h4>
            </div>
            <p className="text-white text-lg font-medium">
              {test.reportReadyTime || 'Not set'}
            </p>
            <div className="mt-2">
              <input 
                type="text" 
                placeholder="Set report ready time"
                className="bg-white/10 border border-white/20 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                onBlur={(e) => handleSetReportTime(test.id, e.target.value)}
                defaultValue={test.reportReadyTime || ''}
              />
            </div>
          </div>
        </div>
        
        {/* Special instructions if any */}
        {test.specialInstructions && (
          <div className="mb-6 bg-indigo-900/30 rounded-lg p-4 border border-indigo-500/30">
            <div className="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Special Instructions</h4>
            </div>
            <p className="text-white/90 text-sm">{test.specialInstructions}</p>
          </div>
        )}
        
        {/* Test details */}
        {test.tests && test.tests.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Tests Ordered
            </h4>
            <div className="space-y-2">
              {test.tests.map((testItem: TestItem, index: number) => (
                <div key={index} className="bg-indigo-900/40 rounded-lg p-3 border border-indigo-500/30 flex justify-between items-center">
                  <span className="text-white">{testItem.name}</span>
                  <span className="text-white/70 text-sm">Rs {testItem.price.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Status Update and Report Upload */}
        <div className="border-t border-white/10 pt-6 mt-6 flex flex-col sm:flex-row gap-6">
          {/* Status Update */}
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Update Status
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleUpdateTestStatus(test.id, 'test-taken')}
                disabled={!canMarkAsTaken(test)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  test.status === 'test-taken'
                    ? 'bg-blue-500/30 text-white border border-blue-500/40 shadow-md'
                    : canMarkAsTaken(test)
                      ? 'bg-indigo-900/40 text-white/80 border border-indigo-500/30 hover:bg-indigo-800/50'
                      : 'bg-gray-500/30 text-white/50 cursor-not-allowed'
                }`}
              >
                Test Taken
              </button>
              <button
                onClick={() => handleUpdateTestStatus(test.id, 'no-show')}
                disabled={!canMarkAsTaken(test)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  test.status === 'no-show'
                    ? 'bg-orange-500/30 text-white border border-orange-500/40 shadow-md'
                    : canMarkAsTaken(test)
                      ? 'bg-indigo-900/40 text-white/80 border border-indigo-500/30 hover:bg-indigo-800/50'
                      : 'bg-gray-500/30 text-white/50 cursor-not-allowed'
                }`}
              >
                No Show
              </button>
              <button
                onClick={() => handleUpdateTestStatus(test.id, 'completed')}
                disabled={test.status !== 'test-taken'}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  test.status === 'completed'
                    ? 'bg-green-500/30 text-white border border-green-500/40 shadow-md'
                    : test.status === 'test-taken'
                      ? 'bg-indigo-900/40 text-white/80 border border-indigo-500/30 hover:bg-indigo-800/50'
                      : 'bg-gray-500/30 text-white/50 cursor-not-allowed'
                }`}
              >
                Completed
              </button>
              {/* Only show Cancel button if the test can be cancelled */}
              {canCancel(test) && (
                <button
                  onClick={() => handleUpdateTestStatus(test.id, 'cancelled')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                    test.status === 'cancelled'
                      ? 'bg-red-500/30 text-white border border-red-500/40 shadow-md'
                      : 'bg-indigo-900/40 text-white/80 border border-indigo-500/30 hover:bg-indigo-800/50'
                  }`}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
          
          {/* Report Upload */}
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Report
            </h4>
            <div>
              {test.status !== 'test-taken' ? (
                <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/20 text-center">
                  {test.status === 'completed' && test.reportURL ? (
                    <p className="text-green-300 text-sm">Report has been uploaded and test is marked as completed.</p>
                  ) : test.status === 'no-show' ? (
                    <p className="text-orange-300 text-sm">Patient did not show up for this test. No report needed.</p>
                  ) : test.status === 'cancelled' ? (
                    <p className="text-red-300 text-sm">This test was cancelled. No report needed.</p>
                  ) : (
                    <p className="text-white/70 text-sm">Report upload will be available after the test is marked as taken.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center bg-indigo-900/30 rounded-md overflow-hidden border border-indigo-500/30">
                      <input
                        type="file"
                        id={`file-${test.id}`}
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor={`file-${test.id}`}
                        className="flex-grow px-4 py-2 cursor-pointer hover:bg-indigo-800/50 transition-all text-white/80 flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {selectedFile && selectedTestId === test.id ? 'Change File' : 'Choose Report File'}
                      </label>
                    </div>
                    
                    {selectedFile && selectedTestId === test.id && (
                      <div className="bg-indigo-900/20 p-3 rounded-md border border-indigo-500/30 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-white/80 truncate">{selectedFile.name}</span>
                        <span className="text-xs text-white/50 ml-2">
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleUploadReport(test.id)}
                    disabled={!selectedFile || selectedTestId !== test.id || uploadingReport}
                    className={`w-full py-2 px-4 rounded-md font-medium transition-all flex items-center justify-center ${
                      !selectedFile || selectedTestId !== test.id || uploadingReport
                        ? 'bg-gray-500/30 text-white/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#3373FF] to-[#5D93FF] text-white hover:from-[#2860e0] hover:to-[#4a7edf] shadow-lg shadow-blue-500/20'
                    }`}
                  >
                    {uploadingReport ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload Report
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-white/60 text-center">
                    Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 5MB)
                  </p>
                </div>
              )}
              
              {test.reportData && (
                <div className="mt-2">
                  <button
                    onClick={() => {
                      // Create a temporary link to open the base64 data
                      const link = document.createElement('a');
                      link.href = test.reportData || '';
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      link.click();
                    }}
                    className="block w-full text-center py-2 px-4 bg-green-500/20 text-white border border-green-500/30 rounded-md hover:bg-green-500/30 transition-all"
                  >
                    <div className="flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Uploaded Report
                    </div>
                  </button>
                  {test.reportMetadata && (
                    <div className="text-xs text-white/60 text-center mt-1">
                      {test.reportMetadata.fileName} ({(test.reportMetadata.fileSize / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TestItem {
  id: string;
  name: string;
  price: number;
}

interface ScheduledTest {
  id: string;
  patientName: string;
  patientEmail: string;
  date?: string;
  time?: string;
  scheduledDate?: Date | { toDate: () => Date };
  tests?: TestItem[];
  status?: string;
  reportReadyTime?: string;
  specialInstructions?: string;
  totalPrice?: number;
  reportURL?: string; // Legacy field for Firebase Storage URLs
  reportData?: string; // Base64 encoded file data
  reportMetadata?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: string;
    patientName: string;
    patientEmail: string;
  };
  reportUploadedAt?: any; // Firestore Timestamp
  testName?: string;
}

export default function LabOperatorPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('labTests');
  const [labTests, setLabTests] = useState<any[]>([]);
  const [scheduledTests, setScheduledTests] = useState<ScheduledTest[]>([]);
  const [filteredTests, setFilteredTests] = useState<ScheduledTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Add this line to fix the 'test' variable reference errors
  const [currentTest, setCurrentTest] = useState<ScheduledTest | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // New lab test form state
  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    price: '',
    preparationInstructions: '',
    estimatedReportTime: ''
  });

  const [editingTest, setEditingTest] = useState<null | { id: string, data: any }>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Report upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState('');

  useEffect(() => {
    // Check if lab operator is logged in
    const labOpSession = localStorage.getItem('labOperatorSession');
    if (!labOpSession) {
      navigate('/LabOperator/login');
      return;
    }

    // Parse session data
    try {
      const session = JSON.parse(labOpSession);
      if (!session.isAuthenticated || session.username !== 'LabOp') {
        navigate('/LabOperator/login');
        return;
      }
    } catch (err) {
      navigate('/LabOperator/login');
      return;
    }

    // Fetch lab tests and scheduled tests
    fetchLabTests();
    fetchScheduledTests();
  }, [navigate]);

  const fetchLabTests = async () => {
    try {
      const labTestsCollection = collection(db, 'availableLabTests');
      const labTestsSnapshot = await getDocs(labTestsCollection);
      const labTestsList = labTestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLabTests(labTestsList);
    } catch (err) {
      console.error('Error fetching lab tests:', err);
      setError('Failed to load lab tests. Please try again.');
    }
  };

  const fetchScheduledTests = async () => {
    try {
      // Fetch only from labTests collection
      const labTestsCollection = collection(db, 'labTests');
      const labTestsSnapshot = await getDocs(labTestsCollection);
      const labTestsList = labTestsSnapshot.docs.map(doc => {
        const data = doc.data();
        // Transform labTests data to match the format expected by the UI
        return {
          id: doc.id,
          ...data,
          // Add any missing fields that might be expected in the UI
          patientName: data.patientName || 'Unknown Patient',
          patientEmail: data.patientEmail || 'No email provided',
          status: data.status || 'scheduled',
          testName: data.tests && data.tests.length > 0 ? data.tests[0].name : 'Unknown Test',
          scheduledDate: data.date ? new Date(data.date) : new Date()
        };
      });
      
      setScheduledTests(labTestsList);
      // Initially set filtered tests to all tests
      applyFilters(labTestsList, searchTerm, statusFilter);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching scheduled tests:', err);
      setError('Failed to load scheduled tests. Please try again.');
      setLoading(false);
    }
  };
  
  // Function to apply search and filters
  const applyFilters = (tests: ScheduledTest[], search: string, status: string) => {
    let filtered = [...tests];
    
    // Apply search filter
    if (search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(test => 
        (test.patientName || '').toLowerCase().includes(searchLower) ||
        (test.patientEmail || '').toLowerCase().includes(searchLower) ||
        (test.testName || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(test => test.status === status);
    }
    
    setFilteredTests(filtered);
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(scheduledTests, value, statusFilter);
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    applyFilters(scheduledTests, searchTerm, status);
  };
  
  // Toggle expanded test
  const toggleExpandTest = (testId: string) => {
    setExpandedTestId(prev => prev === testId ? null : testId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTest(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddLabTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      // Validate price is a number
      if (isNaN(parseFloat(newTest.price))) {
        setError('Price must be a valid number');
        return;
      }

      if (isEditing && editingTest) {
        // Update existing lab test
        await updateDoc(doc(db, 'availableLabTests', editingTest.id), {
          name: newTest.name,
          description: newTest.description,
          price: parseFloat(newTest.price),
          preparationInstructions: newTest.preparationInstructions,
          estimatedReportTime: newTest.estimatedReportTime,
          updatedAt: Timestamp.now()
        });
        setSuccessMessage('Lab test updated successfully!');
      } else {
        // Add new lab test to Firestore in the availableLabTests collection
        await addDoc(collection(db, 'availableLabTests'), {
          name: newTest.name,
          description: newTest.description,
          price: parseFloat(newTest.price),
          preparationInstructions: newTest.preparationInstructions,
          estimatedReportTime: newTest.estimatedReportTime,
          createdAt: Timestamp.now()
        });
        setSuccessMessage('Lab test added successfully!');
      }

      // Reset form and editing state
      setNewTest({
        name: '',
        description: '',
        price: '',
        preparationInstructions: '',
        estimatedReportTime: ''
      });
      setIsEditing(false);
      setEditingTest(null);
      
      // Refresh lab tests list
      fetchLabTests();
    } catch (err) {
      console.error('Error saving lab test:', err);
      setError('Failed to save lab test. Please try again.');
    }
  };

  const handleEditLabTest = (test: any) => {
    setIsEditing(true);
    setEditingTest({ id: test.id, data: test });
    setNewTest({
      name: test.name,
      description: test.description,
      price: test.price.toString(),
      preparationInstructions: test.preparationInstructions || '',
      estimatedReportTime: test.estimatedReportTime
    });
    
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTest(null);
    setNewTest({
      name: '',
      description: '',
      price: '',
      preparationInstructions: '',
      estimatedReportTime: ''
    });
  };

  const handleDeleteLabTest = async (testId: string) => {
    if (window.confirm('Are you sure you want to delete this lab test?')) {
      try {
        await deleteDoc(doc(db, 'availableLabTests', testId));
        setSuccessMessage('Lab test deleted successfully!');
        fetchLabTests();
      } catch (err) {
        console.error('Error deleting lab test:', err);
        setError('Failed to delete lab test. Please try again.');
      }
    }
  };

  // Function to check if a test can be marked as taken (scheduled time has passed)
  const canMarkAsTaken = (test: ScheduledTest): boolean => {
    if (test.status !== 'scheduled') {
      return false; // Can only mark as taken if currently scheduled
    }
    
    // Get current date/time
    const now = new Date();
    
    // Get scheduled date/time
    let scheduledDateTime: Date;
    if (test.scheduledDate instanceof Date) {
      scheduledDateTime = new Date(test.scheduledDate); // Create a new Date object to avoid reference issues
    } else if (test.scheduledDate && 'toDate' in test.scheduledDate) {
      scheduledDateTime = new Date(test.scheduledDate.toDate()); // Create a new Date object
    } else if (test.date) {
      // If we only have a date string, parse it
      scheduledDateTime = new Date(test.date);
      
      // If we also have a time string, add it to the date
      if (test.time) {
        const [hours, minutes] = test.time.split(':').map(Number);
        scheduledDateTime.setHours(hours, minutes);
      } else {
        // Default to start of day if no time specified
        scheduledDateTime.setHours(0, 0, 0, 0);
      }
    } else {
      return false; // No valid date information
    }
    
    // For debugging
    console.log('Current time:', now.toISOString());
    console.log('Scheduled time:', scheduledDateTime.toISOString());
    console.log('Current timestamp:', now.getTime());
    console.log('Scheduled timestamp:', scheduledDateTime.getTime());
    console.log('Time difference (ms):', now.getTime() - scheduledDateTime.getTime());
    console.log('Can mark as taken:', now.getTime() >= scheduledDateTime.getTime());
    
    // Check if scheduled time has passed
    return now.getTime() >= scheduledDateTime.getTime();
  };
  
  // Function to check if a test can be cancelled (scheduled time has not passed)
  const canCancel = (test: ScheduledTest): boolean => {
    if (test.status === 'completed' || test.status === 'cancelled' || test.status === 'no-show') {
      return false; // Cannot cancel if already completed, cancelled, or marked as no-show
    }
    
    // Get current date/time
    const now = new Date();
    
    // Get scheduled date/time
    let scheduledDateTime: Date;
    if (test.scheduledDate instanceof Date) {
      scheduledDateTime = new Date(test.scheduledDate); // Create a new Date object to avoid reference issues
    } else if (test.scheduledDate && 'toDate' in test.scheduledDate) {
      scheduledDateTime = new Date(test.scheduledDate.toDate()); // Create a new Date object
    } else if (test.date) {
      // If we only have a date string, parse it
      scheduledDateTime = new Date(test.date);
      
      // If we also have a time string, add it to the date
      if (test.time) {
        const [hours, minutes] = test.time.split(':').map(Number);
        scheduledDateTime.setHours(hours, minutes);
      } else {
        // Default to start of day if no time specified
        scheduledDateTime.setHours(0, 0, 0, 0);
      }
    } else {
      return true; // No valid date information, allow cancellation
    }
    
    // For debugging
    console.log('Cancel check - Current time:', now.toISOString());
    console.log('Cancel check - Scheduled time:', scheduledDateTime.toISOString());
    console.log('Cancel check - Current timestamp:', now.getTime());
    console.log('Cancel check - Scheduled timestamp:', scheduledDateTime.getTime());
    console.log('Cancel check - Time difference (ms):', now.getTime() - scheduledDateTime.getTime());
    console.log('Can cancel:', now.getTime() < scheduledDateTime.getTime());
    
    // Can only cancel if scheduled time has not passed
    return now.getTime() < scheduledDateTime.getTime();
  };
  
  // Helper function to format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Helper function to format status
  const formatStatus = (status?: string): string => {
    if (!status) return 'Unknown';
    
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'test-taken': return 'Test Taken';
      case 'completed': return 'Completed';
      case 'no-show': return 'No Show';
      case 'cancelled': return 'Cancelled';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  // Helper function to get status badge class
  const getStatusBadgeClass = (status?: string): string => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status) {
      case 'scheduled': return 'bg-yellow-500/30 text-yellow-100 border border-yellow-500/40';
      case 'test-taken': return 'bg-blue-500/30 text-blue-100 border border-blue-500/40';
      case 'completed': return 'bg-green-500/30 text-green-100 border border-green-500/40';
      case 'no-show': return 'bg-orange-500/30 text-orange-100 border border-orange-500/40';
      case 'cancelled': return 'bg-red-500/30 text-red-100 border border-red-500/40';
      default: return 'bg-gray-500/30 text-gray-100 border border-gray-500/40';
    }
  };
  
  // Helper function to get status badge color for icon background
  const getStatusBadgeColor = (status?: string): string => {
    if (!status) return 'bg-gray-500/30';
    
    switch (status) {
      case 'scheduled': return 'bg-yellow-500/30';
      case 'test-taken': return 'bg-blue-500/30';
      case 'completed': return 'bg-green-500/30';
      case 'no-show': return 'bg-orange-500/30';
      case 'cancelled': return 'bg-red-500/30';
      default: return 'bg-gray-500/30';
    }
  };
  
  // Helper function to get status icon
  const getStatusIcon = (status?: string) => {
    if (!status) return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
    
    switch (status) {
      case 'scheduled':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'test-taken':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'completed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'no-show':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
    }
  };
  
  // Function to calculate estimated report ready time based on test's estimated time
  const calculateReportReadyTime = (test: ScheduledTest): string => {
    // Default to 24 hours if no specific estimate is available
    let estimatedHours = 24;
    
    // If we have specific tests with estimated times, use those
    if (test.tests && test.tests.length > 0) {
      // Find the corresponding test in availableLabTests to get the estimated time
      const testIds = test.tests.map(t => t.id);
      const availableTest = labTests.find(lt => testIds.includes(lt.id));
      
      if (availableTest && availableTest.estimatedReportTime) {
        // Parse the estimated time (assuming format like "24 hours" or "2 days")
        const timeStr = availableTest.estimatedReportTime.toLowerCase();
        if (timeStr.includes('hour')) {
          estimatedHours = parseInt(timeStr.split(' ')[0]) || 24;
        } else if (timeStr.includes('day')) {
          estimatedHours = (parseInt(timeStr.split(' ')[0]) || 1) * 24;
        }
      }
    }
    
    // Calculate the report ready date/time
    const readyDate = new Date();
    readyDate.setHours(readyDate.getHours() + estimatedHours);
    
    // Format as a readable string
    return `${readyDate.toLocaleDateString()} at ${readyDate.getHours()}:${readyDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleUpdateTestStatus = async (testId: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: Timestamp.now()
      };
      
      // If status is changing to 'test-taken', automatically set the estimated report ready time
      if (newStatus === 'test-taken') {
        // Find the test to get its details
        const test = scheduledTests.find(t => t.id === testId);
        if (test) {
          const reportReadyTime = calculateReportReadyTime(test);
          updateData.reportReadyTime = reportReadyTime;
          updateData.testTakenAt = Timestamp.now();
        }
      }
      
      await updateDoc(doc(db, 'labTests', testId), updateData);
      setSuccessMessage(`Test status updated to ${newStatus}!`);
      fetchScheduledTests();
    } catch (err) {
      console.error('Error updating test status:', err);
      setError('Failed to update test status. Please try again.');
    }
  };

  const handleSetReportTime = async (testId: string, reportTime: string) => {
    try {
      await updateDoc(doc(db, 'labTests', testId), {
        reportReadyTime: reportTime,
        updatedAt: Timestamp.now()
      });
      setSuccessMessage('Report ready time updated successfully!');
      fetchScheduledTests();
    } catch (err) {
      console.error('Error updating report time:', err);
      setError('Failed to update report ready time. Please try again.');
    }
  };

  // Function to convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check if file is a PDF, DOC, DOCX, or image file
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('Invalid file type. Please upload a PDF, DOC, DOCX, or image file.');
        return;
      }
      
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setError('File is too large. Maximum size is 5MB.');
        return;
      }
      
      setSelectedFile(file);
      setError(null); // Clear any previous errors
      
      // Extract the test ID from the input ID
      const inputId = e.target.id;
      const testId = inputId.replace('file-', '');
      setSelectedTestId(testId);
    }
  };

  const handleUploadReport = async (testId: string) => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    // Find the test we're uploading for
    const test = scheduledTests.find(t => t.id === testId);
    if (!test) {
      setError('Test not found. Please refresh the page and try again.');
      return;
    }

    // Validate test status
    if (test.status !== 'test-taken') {
      setError('Reports can only be uploaded for tests marked as "Test Taken".');
      return;
    }

    setUploadingReport(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Convert file to base64
      const base64Data = await convertFileToBase64(selectedFile);
      
      // Create report metadata
      const reportMetadata = {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        uploadDate: new Date().toISOString(),
        patientName: test.patientName,
        patientEmail: test.patientEmail
      };
      
      // Update scheduled test with base64 data and status
      await updateDoc(doc(db, 'labTests', testId), {
        reportData: base64Data,
        reportMetadata: reportMetadata,
        reportUploadedAt: Timestamp.now(),
        status: 'completed',
        updatedAt: Timestamp.now()
      });
      
      setSuccessMessage('Lab report uploaded successfully!');
      setSelectedFile(null);
      setSelectedTestId(null);
      fetchScheduledTests();
    } catch (err) {
      console.error('Error uploading report:', err);
      if (err instanceof Error) {
        setError(`Failed to upload report: ${err.message}`);
      } else {
        setError('Failed to upload report. Please try again.');
      }
    } finally {
      setUploadingReport(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('labOperatorSession');
    localStorage.removeItem('labOperatorId');
    localStorage.removeItem('labOperatorEmail');
    navigate('/LabOperator/login');
  };
  
  const returnToMainSite = () => {
    // Clear all lab operator session data
    localStorage.removeItem('labOperatorSession');
    localStorage.removeItem('labOperatorId');
    localStorage.removeItem('labOperatorEmail');
    
    // Navigate to the main site
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A365D] to-[#2D3748] relative overflow-hidden">
      {/* Abstract shapes for visual interest */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#3373FF] opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-24 w-80 h-80 bg-[#FF3D71] opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 right-1/3 w-64 h-64 bg-[#3373FF] opacity-10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 shadow-lg relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-full p-2 w-10 h-10 flex items-center justify-center shadow-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Lab Operator Portal</h1>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600/90 hover:bg-red-700 transition-colors shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 mb-8 shadow-lg border border-white/10">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('labTests')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center ${
                activeTab === 'labTests'
                  ? 'bg-white/10 text-white shadow-md'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Manage Lab Tests
            </button>
            <button
              onClick={() => setActiveTab('scheduledTests')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center ${
                activeTab === 'scheduledTests'
                  ? 'bg-white/10 text-white shadow-md'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Scheduled Tests
            </button>
          </nav>
        </div>

        {/* Error and success messages */}
        {error && (
          <div className="mb-6 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 shadow-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-white">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg p-4 shadow-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-white">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-t-2 border-b-2 border-white/20 animate-spin"></div>
              <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-t-2 border-blue-500 animate-spin-slow"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-10 w-10 text-blue-500/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-white/70 text-sm">Loading...</p>
          </div>
        ) : (
          <>
            {/* Lab Tests Management Tab */}
            {activeTab === 'labTests' && (
              <div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl mb-8 border border-white/20 overflow-hidden">
                  <div className="px-6 py-5 sm:px-8 bg-gradient-to-r from-[#3373FF]/20 to-transparent border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-lg p-2 mr-3 shadow-lg">
                          {isEditing ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h2 className="text-xl leading-6 font-bold text-white">
                            {isEditing ? 'Edit Lab Test' : 'Add New Lab Test'}
                          </h2>
                          <p className="mt-1 max-w-2xl text-sm text-gray-300">
                            {isEditing ? 'Update the lab test details.' : 'Add a new lab test to the system.'}
                          </p>
                        </div>
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="inline-flex items-center px-3 py-1.5 border border-white/20 text-xs font-medium rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors duration-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel Editing
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-6 sm:p-8">
                    <form onSubmit={handleAddLabTest} className="space-y-6">
                      <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                          <label htmlFor="name" className="block text-sm font-medium text-white mb-1">Test Name</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              name="name"
                              id="name"
                              required
                              value={newTest.name}
                              onChange={handleInputChange}
                              className="appearance-none pl-10 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-[#3373FF] focus:border-[#3373FF] focus:bg-white/20 block w-full p-2.5 transition-all duration-200"
                              placeholder="Complete Blood Count"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="price" className="block text-sm font-medium text-white mb-1">Price (Rs)</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              name="price"
                              id="price"
                              required
                              value={newTest.price}
                              onChange={handleInputChange}
                              className="appearance-none pl-10 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-[#3373FF] focus:border-[#3373FF] focus:bg-white/20 block w-full p-2.5 transition-all duration-200"
                              placeholder="1500"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="description" className="block text-sm font-medium text-white mb-1">Description</label>
                          <div className="relative">
                            <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                              </svg>
                            </div>
                            <textarea
                              id="description"
                              name="description"
                              rows={3}
                              required
                              value={newTest.description}
                              onChange={handleInputChange}
                              className="appearance-none pl-10 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-[#3373FF] focus:border-[#3373FF] focus:bg-white/20 block w-full p-2.5 transition-all duration-200"
                              placeholder="A comprehensive test that measures the different components of blood..."
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="preparationInstructions" className="block text-sm font-medium text-white mb-1">Preparation Instructions</label>
                          <div className="relative">
                            <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </div>
                            <textarea
                              id="preparationInstructions"
                              name="preparationInstructions"
                              rows={3}
                              value={newTest.preparationInstructions}
                              onChange={handleInputChange}
                              className="appearance-none pl-10 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-[#3373FF] focus:border-[#3373FF] focus:bg-white/20 block w-full p-2.5 transition-all duration-200"
                              placeholder="Fast for 8-12 hours before the test..."
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="estimatedReportTime" className="block text-sm font-medium text-white mb-1">Estimated Report Time</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              name="estimatedReportTime"
                              id="estimatedReportTime"
                              placeholder="e.g. 24-48 hours"
                              required
                              value={newTest.estimatedReportTime}
                              onChange={handleInputChange}
                              className="appearance-none pl-10 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-[#3373FF] focus:border-[#3373FF] focus:bg-white/20 block w-full p-2.5 transition-all duration-200"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex space-x-4">
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-[#3373FF] to-[#5D93FF] hover:from-[#2860e0] hover:to-[#4a7edf] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3373FF] shadow-lg shadow-blue-500/30 transition-all duration-200"
                        >
                          {isEditing ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Save Changes
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add Lab Test
                            </>
                          )}
                        </button>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="inline-flex items-center justify-center py-3 px-6 border border-white/20 text-sm font-medium rounded-lg text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/30 transition-all duration-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl overflow-hidden border border-white/20">
                  <div className="px-6 py-5 sm:px-8 bg-gradient-to-r from-[#3373FF]/20 to-transparent border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-lg p-2 mr-3 shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl leading-6 font-bold text-white">Available Lab Tests</h2>
                          <p className="mt-1 max-w-2xl text-sm text-gray-300">List of all available lab tests.</p>
                        </div>
                      </div>
                      {labTests.length > 0 && (
                        <div className="flex items-center">
                          <span className="text-sm text-white/70 mr-2">{labTests.length} {labTests.length === 1 ? 'test' : 'tests'} available</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {labTests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg text-white/70">No lab tests available yet.</p>
                        <p className="text-sm text-white/50 mt-2">Add your first lab test using the form above.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                        {labTests.map((test) => (
                          <div key={test.id} className="bg-white/15 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden hover:bg-white/20 transition-all duration-200 shadow-md">
                            <div className="p-5">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="text-lg font-semibold text-white">{test.name}</h3>
                                  <div className="flex items-center mt-1">
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/30 text-white border border-blue-500/40 shadow-sm">
                                      Rs {test.price}
                                    </span>
                                    <span className="ml-2 text-xs text-white/80 flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {test.estimatedReportTime}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditLabTest(test)}
                                    className="inline-flex items-center p-1.5 border border-blue-500/50 text-xs font-medium rounded-md text-white bg-blue-500/30 hover:bg-blue-500/40 transition-colors duration-200 shadow-sm"
                                    title="Edit test"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLabTest(test.id)}
                                    className="inline-flex items-center p-1.5 border border-red-500/50 text-xs font-medium rounded-md text-white bg-red-500/30 hover:bg-red-500/40 transition-colors duration-200 shadow-sm"
                                    title="Delete test"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-white/90 mb-3 line-clamp-2">{test.description}</p>
                              {test.preparationInstructions && (
                                <div className="mt-3 pt-3 border-t border-white/20 bg-white/5 -mx-5 -mb-5 p-5">
                                  <h4 className="text-xs font-medium text-white flex items-center mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    PREPARATION INSTRUCTIONS
                                  </h4>
                                  <p className="text-xs text-white/80 line-clamp-2">{test.preparationInstructions}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled Tests Tab */}
            {activeTab === 'scheduledTests' && (
              <div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl mb-8 border border-white/20 overflow-hidden">
                  <div className="px-6 py-5 sm:px-8 bg-gradient-to-r from-[#3373FF]/20 to-transparent border-b border-white/10">
                    <div className="flex items-center">
                      <div className="bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-lg p-2 mr-3 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl leading-6 font-bold text-white">Scheduled Lab Tests</h2>
                        <p className="mt-1 max-w-2xl text-sm text-gray-300">Manage scheduled lab tests and upload reports.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Search and Filter Bar */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Search Input */}
                      <div className="flex-grow">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            placeholder="Search by patient name or test..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="bg-indigo-900/40 border border-indigo-500/30 text-white placeholder-white/50 rounded-lg py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          />
                        </div>
                      </div>
                      
                      {/* Status Filter */}
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => handleStatusFilterChange('all')}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-[#3373FF] text-white' : 'bg-indigo-900/40 text-white/70 hover:bg-indigo-800/50'}`}
                        >
                          All
                        </button>
                        <button 
                          onClick={() => handleStatusFilterChange('scheduled')}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'scheduled' ? 'bg-yellow-500/70 text-white' : 'bg-indigo-900/40 text-white/70 hover:bg-indigo-800/50'}`}
                        >
                          Scheduled
                        </button>
                        <button 
                          onClick={() => handleStatusFilterChange('test-taken')}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'test-taken' ? 'bg-blue-500/70 text-white' : 'bg-indigo-900/40 text-white/70 hover:bg-indigo-800/50'}`}
                        >
                          Test Taken
                        </button>
                        <button 
                          onClick={() => handleStatusFilterChange('completed')}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'completed' ? 'bg-green-500/70 text-white' : 'bg-indigo-900/40 text-white/70 hover:bg-indigo-800/50'}`}
                        >
                          Completed
                        </button>
                        <button 
                          onClick={() => handleStatusFilterChange('no-show')}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'no-show' ? 'bg-orange-500/70 text-white' : 'bg-indigo-900/40 text-white/70 hover:bg-indigo-800/50'}`}
                        >
                          No Show
                        </button>
                        <button 
                          onClick={() => handleStatusFilterChange('cancelled')}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'cancelled' ? 'bg-red-500/70 text-white' : 'bg-indigo-900/40 text-white/70 hover:bg-indigo-800/50'}`}
                        >
                          Cancelled
                        </button>
                      </div>
                    </div>
                    
                    {/* Results count */}
                    <div className="mt-3 text-sm text-white/70">
                      Found {filteredTests.length} {filteredTests.length === 1 ? 'test' : 'tests'}
                      {searchTerm && <span> matching "{searchTerm}"</span>}
                      {statusFilter !== 'all' && <span> with status "{statusFilter}"</span>}
                    </div>
                  </div>

                  {filteredTests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {searchTerm || statusFilter !== 'all' ? (
                        <>
                          <p className="text-lg text-white/70">No tests match your search criteria.</p>
                          <p className="text-sm text-white/50 mt-2">Try adjusting your search or filters.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg text-white/70">No scheduled tests available yet.</p>
                          <p className="text-sm text-white/50 mt-2">Scheduled tests will appear here once patients book them.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 space-y-6">
                      {filteredTests.map((test: ScheduledTest) => (
                        <div key={test.id} className="bg-indigo-900/20 backdrop-blur-sm rounded-xl border border-indigo-500/20 overflow-hidden hover:bg-indigo-900/30 transition-all duration-200 shadow-md">
                          {/* Test Header - Always visible */}
                          <div 
                            className="p-4 flex flex-wrap items-center justify-between cursor-pointer"
                            onClick={() => toggleExpandTest(test.id)}
                          >
                            <div className="flex items-center">
                              <div className="mr-4">
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${getStatusBadgeColor(test.status)}`}>
                                  {getStatusIcon(test.status)}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white">{test.patientName}</h3>
                                <div className="flex flex-wrap items-center text-sm text-white/70 gap-x-4">
                                  <span>{test.testName || (test.tests && test.tests.length > 0 ? test.tests[0].name : 'Unknown Test')}</span>
                                  <span>•</span>
                                  <span>{formatDate(test.date)} at {test.time}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium mr-3 ${getStatusBadgeClass(test.status)}`}>
                                {formatStatus(test.status)}
                              </span>
                              <button className="text-white/70 hover:text-white transition-colors">
                                {expandedTestId === test.id ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                          
                          {/* Expanded Content - Only visible when expanded */}
                          {expandedTestId === test.id && (
                            <div className="border-t border-indigo-500/20 p-4">
                              <ScheduledTestItem
                                test={test}
                                handleUpdateTestStatus={handleUpdateTestStatus}
                                handleSetReportTime={handleSetReportTime}
                                handleUploadReport={handleUploadReport}
                                handleFileChange={handleFileChange}
                                selectedFile={selectedFile}
                                selectedTestId={selectedTestId}
                                setSelectedTestId={setSelectedTestId}
                                uploadingReport={uploadingReport}
                                canMarkAsTaken={canMarkAsTaken}
                                canCancel={canCancel}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
