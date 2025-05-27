import { useState, useEffect } from 'react';
import { FirebaseError } from 'firebase/app';
import { collection, addDoc, getDocs, query, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

interface TestType {
  id: string;
  name: string;
  description: string;
  price: number;
  preparationInstructions: string;
}

export default function BookLabTestForm() {
  const { user } = useAuth() ?? {};
  
  // Form data
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  
  // Form fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    specialInstructions: '',
  });
  
  // Time validation
  const [minTime, setMinTime] = useState('09:00');
  const [maxTime, setMaxTime] = useState('17:00');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch available lab tests that Lab Operator has defined
  useEffect(() => {
    async function fetchAvailableLabTests() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch available lab tests from Firestore that Lab Operator has defined
        const availableTestsQuery = query(collection(db, 'availableLabTests'));
        const availableTestsSnapshot = await getDocs(availableTestsQuery);
        
        if (availableTestsSnapshot.empty) {
          setTestTypes([]);
          setError('No lab tests are currently available. Please check back later.');
          console.log('No lab tests found');
        } else {
          // Use the available lab tests from Firestore
          const availableTestsList = availableTestsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            description: doc.data().description,
            price: doc.data().price,
            preparationInstructions: doc.data().preparationInstructions || ''
          } as TestType));
          
          setTestTypes(availableTestsList);
          console.log('Fetched available lab tests:', availableTestsList.length);
        }
      } catch (e) {
        console.error('Error fetching available lab tests:', e);
        setError('Failed to load available lab tests. Please try again.');
      }
      
      setLoading(false);
    }
    
    fetchAvailableLabTests();
  }, []);
  
  // Calculate total price when selected tests change
  useEffect(() => {
    const price = selectedTests.reduce((total, testId) => {
      const test = testTypes.find(t => t.id === testId);
      return total + (test?.price || 0);
    }, 0);
    
    setTotalPrice(price);
  }, [selectedTests, testTypes]);
  
  // Function to check and update time restrictions based on selected date
  const updateTimeRestrictions = (selectedDate: string, currentSelectedTime: string) => {
    // If selected date is today, restrict time selection to future times
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate === today) {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      
      // Round up to the nearest 30 minutes
      minutes = Math.ceil(minutes / 30) * 30;
      if (minutes >= 60) {
        hours += 1;
        minutes = 0;
      }
      
      // Format time as HH:MM
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const currentTime = `${formattedHours}:${formattedMinutes}`;
      
      // Set minimum time to current time (rounded up)
      setMinTime(currentTime);
      
      // If the current selected time is before the new minimum time, update it
      if (currentSelectedTime < currentTime) {
        return currentTime;
      }
      return currentSelectedTime;
    } else {
      // For future dates, allow full time range
      setMinTime('09:00');
      return currentSelectedTime;
    }
  };
  
  // Handle date change to update time restrictions
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Get the updated time based on the new date
    const updatedTime = updateTimeRestrictions(value, formData.time);
    
    // Update form data with the new date and potentially updated time
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // If the date changed, we might need to update the time as well
      time: name === 'date' ? updatedTime : prev.time
    }));
  };
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // If time is being changed, validate it against the current date
    if (name === 'time') {
      // Get the updated time based on the current date
      const updatedTime = updateTimeRestrictions(formData.date, value);
      
      setFormData(prev => ({
        ...prev,
        [name]: updatedTime // Use the validated time
      }));
    } else {
      // For other fields, just update normally
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle test selection
  const handleTestSelection = (testId: string) => {
    setSelectedTests(prev => {
      if (prev.includes(testId)) {
        return prev.filter(id => id !== testId);
      } else {
        return [...prev, testId];
      }
    });
  };
  
  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to schedule a lab test.');
      return;
    }
    
    if (selectedTests.length === 0) {
      setError('Please select at least one test.');
      return;
    }
    
    // Final validation of date and time
    const today = new Date().toISOString().split('T')[0];
    if (formData.date === today) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Format current time as HH:MM for comparison
      const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Check if selected time is in the past
      if (formData.time < currentTime) {
        setError('You cannot schedule a test for a time that has already passed. Please select a future time.');
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get patient information
      const patientQuery = query(collection(db, 'patients'), where('email', '==', user.email));
      const patientSnapshot = await getDocs(patientQuery);
      
      if (patientSnapshot.empty) {
        setError('Patient profile not found. Please complete your profile first.');
        setLoading(false);
        return;
      }
      
      const patientDoc = patientSnapshot.docs[0];
      const patientId = patientDoc.id;
      const patientData = patientDoc.data();
      
      // Get selected test details
      const selectedTestDetails = testTypes
        .filter(test => selectedTests.includes(test.id))
        .map(test => ({
          id: test.id,
          name: test.name,
          price: test.price
        }));
      
      // Create lab test record
      await addDoc(collection(db, 'labTests'), {
        patientId,
        patientName: patientData.name,
        patientEmail: patientData.email,
        date: formData.date,
        time: formData.time,
        tests: selectedTestDetails,
        totalPrice,
        specialInstructions: formData.specialInstructions,
        status: 'scheduled', // scheduled, completed, cancelled
        results: null, // Will be populated by lab staff later
        resultFileUrl: null, // Will be populated by lab staff later
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        specialInstructions: ''
      });
      setSelectedTests([]);
    } catch (e) {
      console.error('Error scheduling lab test:', e);
      const errorMessage = e instanceof FirebaseError 
        ? e.message 
        : 'Failed to schedule lab test. Please try again.';
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
          <h3 className="text-2xl font-bold text-[#14396D] mb-4">Lab Test Scheduled Successfully!</h3>
          <p className="text-gray-600 mb-6">
            Your lab test has been scheduled. You will receive a confirmation email shortly with preparation instructions.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => setSuccess(false)}
              className="bg-[#14396D] hover:bg-[#2C5078] text-white px-6 py-3 rounded-md font-semibold transition-colors duration-300"
            >
              Schedule Another Test
            </button>
            <button 
              onClick={() => window.location.href = '/laboratory'}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-md font-semibold transition-colors duration-300"
            >
              View My Tests
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Schedule Your Lab Test</h2>
        <p className="text-gray-600">Select the tests you need and choose a convenient date and time.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Test Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Select Tests*
            </span>
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testTypes.map(test => (
              <div 
                key={test.id} 
                className={`border rounded-xl shadow-sm overflow-hidden transition-all ${
                  selectedTests.includes(test.id) 
                    ? 'border-[#3373FF] ring-2 ring-blue-100' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow'
                }`}
                onClick={() => handleTestSelection(test.id)}
              >
                <div className="flex flex-col h-full">
                  {/* Header with test name and radio button */}
                  <div className="bg-gray-50 px-5 py-3 flex items-center border-b border-gray-200">
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 border ${
                      selectedTests.includes(test.id) 
                        ? 'bg-[#3373FF] border-[#3373FF]' 
                        : 'border-gray-400'
                    } flex items-center justify-center mr-3`}>
                      {selectedTests.includes(test.id) && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-800 flex-grow">{test.name}</h4>
                  </div>
                  
                  {/* Test description */}
                  <div className="p-5">
                    <p className="text-sm text-gray-600">{test.description}</p>
                    
                    {/* Preparation instructions */}
                    {test.preparationInstructions && (
                      <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-md p-3">
                        <p className="text-xs text-gray-700 italic">
                          <span className="font-medium block mb-1">Preparation:</span>
                          {test.preparationInstructions}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Price footer */}
                  <div className="mt-auto border-t border-gray-200 px-5 py-3 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Price:</span>
                      <span className="text-[#3373FF] font-bold text-lg">Rs {test.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {selectedTests.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">Total Price:</span>
                <span className="text-lg font-bold text-[#3373FF]">Rs {totalPrice.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Date and Time Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Preferred Date*
              </span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleDateChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF]"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Preferred Time*
              </span>
            </label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              min={minTime}
              max={maxTime}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF]"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Our lab is open from 9:00 AM to 5:00 PM</p>
          </div>
        </div>
        
        {/* Special Instructions */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#3373FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Special Instructions (Optional)
            </span>
          </label>
          <textarea
            name="specialInstructions"
            value={formData.specialInstructions}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF]"
            placeholder="Any special requirements or health conditions we should know about"
          ></textarea>
        </div>
        
        {/* Submit Button */}
        <div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#3373FF] to-[#5D93FF] hover:from-[#2860e0] hover:to-[#4a7edf] text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md flex items-center justify-center"
            disabled={loading || selectedTests.length === 0}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                Schedule Lab Test
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
