import React, { useState, useRef, useEffect } from 'react';
import { generateText } from './gemini-config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { collection, getDocs, query, orderBy, addDoc, Timestamp, where, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface Doctor {
  id: string;
  name: string;
  department: string;
  availability?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface LabTest {
  id: string;
  name: string;
  description?: string;
  price?: number;
  preparationInstructions?: string;
}

const HealthAssistant: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth() ?? {};
  const [isOpen, setIsOpen] = useState(false);
  const [showHelpBubble, setShowHelpBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your assistant for Care-Coord. I can help you with health information, navigating the website, or booking appointments and lab tests. How can I assist you today?',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  
  // State for doctors, departments, and lab tests
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // State for appointment booking process
  const [appointmentState, setAppointmentState] = useState({
    inProgress: false,
    doctorId: '',
    doctorName: '',
    department: '',
    date: '',
    time: '',
    reason: '',
    symptoms: '',
    previousVisit: 'no',
    step: 0 // 0: not started, 1: doctor selected, 2: date provided, 3: time provided, 4: reason provided, 5: symptoms provided, 6: previousVisit provided
  });
  
  // State for lab test scheduling process
  const [labTestState, setLabTestState] = useState({
    inProgress: false,
    selectedTests: [] as string[],
    date: '',
    time: '',
    specialInstructions: '',
    step: 0 // 0: not started, 1: tests selected, 2: date provided, 3: time provided, 4: special instructions provided
  });
  
  // Check if user is logged in
  const isLoggedIn = (): boolean => {
    return user !== null && user !== undefined;
  };
  
  // Show help bubble after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShowHelpBubble(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [isOpen]);
  
  // Hide help bubble when chat is opened
  useEffect(() => {
    if (isOpen) {
      setShowHelpBubble(false);
    }
  }, [isOpen]);
  
  // Function to schedule a lab test in the database
  const scheduleLabTest = async (selectedTestIds: string[], dateStr: string, timeStr: string, specialInstructions: string) => {
    try {
      if (!user) {
        console.error('Cannot schedule lab test: User not logged in');
        return false;
      }
      
      // Get user's patient profile
      const patientQuery = query(collection(db, 'patients'), where('email', '==', user.email));
      const patientSnapshot = await getDocs(patientQuery);
      
      if (patientSnapshot.empty) {
        console.error('Patient profile not found');
        return false;
      }
      
      const patientDoc = patientSnapshot.docs[0];
      const patientData = patientDoc.data();
      
      // Format the date properly and validate it's not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to beginning of day for date comparison
      
      // Parse date from natural language
      let parsedDate = new Date();
      const lowerDateStr = dateStr.toLowerCase();
      
      try {
        // Handle common date phrases
        if (lowerDateStr.includes('tomorrow')) {
          parsedDate = new Date();
          parsedDate.setDate(parsedDate.getDate() + 1);
        } 
        else if (lowerDateStr.includes('next week')) {
          parsedDate = new Date();
          parsedDate.setDate(parsedDate.getDate() + 7);
        }
        else if (lowerDateStr.includes('next month')) {
          parsedDate = new Date();
          parsedDate.setMonth(parsedDate.getMonth() + 1);
        }
        else if (lowerDateStr.match(/next (mon|tues|wednes|thurs|fri|satur|sun)day/)) {
          // Handle "next Monday", "next Tuesday", etc.
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const todayDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Find which day was mentioned
          let targetDayIndex = -1;
          for (let i = 0; i < dayNames.length; i++) {
            if (lowerDateStr.includes(dayNames[i])) {
              targetDayIndex = i;
              break;
            }
          }
          
          if (targetDayIndex !== -1) {
            // Calculate days to add
            let daysToAdd = targetDayIndex - todayDayIndex;
            if (daysToAdd <= 0) daysToAdd += 7; // If it's in the past or today, go to next week
            
            parsedDate = new Date();
            parsedDate.setDate(parsedDate.getDate() + daysToAdd);
          }
        }
        else {
          // Try standard date parsing
          const attemptedParse = new Date(dateStr);
          if (!isNaN(attemptedParse.getTime())) {
            parsedDate = attemptedParse;
          }
        }
        
        // Check if date is in the past
        if (parsedDate < today) {
          console.log('Cannot schedule a lab test for a past date, using today instead');
          parsedDate = new Date(); // Use today instead
        }
      } catch (error) {
        console.log('Could not parse date, using current date as fallback');
        parsedDate = new Date();
      }
      
      // Format the date as YYYY-MM-DD
      const formattedDate = parsedDate.toISOString().split('T')[0];
      
      // Format the time - ensure it's in HH:MM format
      let formattedTime = timeStr;
      if (!timeStr.match(/^\d{1,2}:\d{2}$/)) {
        // If not in HH:MM format, try to convert
        if (timeStr.toLowerCase().includes('morning')) {
          formattedTime = '09:00';
        } else if (timeStr.toLowerCase().includes('afternoon')) {
          formattedTime = '14:00';
        } else if (timeStr.toLowerCase().includes('evening')) {
          formattedTime = '17:00';
        } else {
          formattedTime = '09:00'; // Default
        }
      }
      
      // Check if appointment is for today and time has already passed
      const isToday = formattedDate === new Date().toISOString().split('T')[0];
      if (isToday) {
        const now = new Date();
        const [hours, minutes] = formattedTime.split(':').map(Number);
        const appointmentTime = new Date();
        appointmentTime.setHours(hours, minutes, 0, 0);
        
        if (appointmentTime < now) {
          // If time has already passed, set to next available hour (rounded up)
          const nextHour = now.getHours() + 1;
          formattedTime = `${nextHour.toString().padStart(2, '0')}:00`;
          console.log('Cannot schedule a lab test for a time that has already passed, using next available hour:', formattedTime);
        }
      }
      
      // Get selected test details
      const selectedTestDetails = labTests
        .filter(test => selectedTestIds.includes(test.id))
        .map(test => ({
          id: test.id,
          name: test.name,
          price: test.price || 0
        }));
      
      // Calculate total price
      const totalPrice = selectedTestDetails.reduce((total, test) => total + (test.price || 0), 0);
      
      // Create lab test record
      await addDoc(collection(db, 'labTests'), {
        patientId: patientDoc.id,
        patientName: patientData.name || user.displayName || 'Patient',
        patientEmail: patientData.email || user.email,
        date: formattedDate,
        time: formattedTime,
        tests: selectedTestDetails,
        totalPrice,
        specialInstructions,
        status: 'scheduled', // scheduled, completed, cancelled
        results: null, // Will be populated by lab staff later
        resultFileUrl: null, // Will be populated by lab staff later
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log('Lab test scheduled successfully');
      return true;
    } catch (error) {
      console.error('Error scheduling lab test:', error);
      return false;
    }
  };
  
  // Function to create an appointment in the database
  const createAppointment = async (doctorId: string, doctorName: string, department: string, dateStr: string, timeStr: string, reason: string) => {
    try {
      if (!user) {
        console.error('Cannot create appointment: User not logged in');
        return false;
      }
      
      // Get user's patient profile
      const patientQuery = query(collection(db, 'patients'), where('email', '==', user.email));
      const patientSnapshot = await getDocs(patientQuery);
      
      if (patientSnapshot.empty) {
        console.error('Patient profile not found');
        return false;
      }
      
      const patientDoc = patientSnapshot.docs[0];
      const patientData = patientDoc.data();
      
      // Get department details
      const departmentsQuery = query(collection(db, 'departments'), where('name', '==', department));
      const departmentSnapshot = await getDocs(departmentsQuery);
      let departmentId = '';
      let departmentFeePercentage = 0;
      
      if (!departmentSnapshot.empty) {
        const departmentData = departmentSnapshot.docs[0].data();
        departmentId = departmentSnapshot.docs[0].id;
        departmentFeePercentage = departmentData.feePercentage || 0;
      }
      
      // Get doctor details including fee percentage
      const doctorDocRef = doc(db, 'doctors', doctorId);
      const doctorDoc = await getDoc(doctorDocRef);
      let doctorFeePercentage = 0;
      
      if (doctorDoc.exists()) {
        doctorFeePercentage = doctorDoc.data().feePercentage || 0;
      }
      
      // Format the date properly and validate it's not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to beginning of day for date comparison
      
      // Parse date from natural language
      let parsedDate = new Date();
      const lowerDateStr = dateStr.toLowerCase();
      
      try {
        // Handle common date phrases
        if (lowerDateStr.includes('tomorrow')) {
          parsedDate = new Date();
          parsedDate.setDate(parsedDate.getDate() + 1);
          console.log('Parsed "tomorrow" as:', parsedDate.toISOString().split('T')[0]);
        } 
        else if (lowerDateStr.includes('next week')) {
          parsedDate = new Date();
          parsedDate.setDate(parsedDate.getDate() + 7);
        }
        else if (lowerDateStr.includes('next month')) {
          parsedDate = new Date();
          parsedDate.setMonth(parsedDate.getMonth() + 1);
        }
        else if (lowerDateStr.match(/next (mon|tues|wednes|thurs|fri|satur|sun)day/)) {
          // Handle "next Monday", "next Tuesday", etc.
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const today = new Date();
          const todayDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Find which day was mentioned
          let targetDayIndex = -1;
          for (let i = 0; i < dayNames.length; i++) {
            if (lowerDateStr.includes(dayNames[i])) {
              targetDayIndex = i;
              break;
            }
          }
          
          if (targetDayIndex !== -1) {
            // Calculate days to add
            let daysToAdd = targetDayIndex - todayDayIndex;
            if (daysToAdd <= 0) daysToAdd += 7; // If it's in the past or today, go to next week
            
            parsedDate = new Date();
            parsedDate.setDate(parsedDate.getDate() + daysToAdd);
          }
        }
        else {
          // Try standard date parsing
          const attemptedParse = new Date(dateStr);
          if (!isNaN(attemptedParse.getTime())) {
            parsedDate = attemptedParse;
          }
        }
        
        // Check if date is in the past
        if (parsedDate < today) {
          console.log('Cannot book an appointment for a past date, using today instead');
          parsedDate = new Date(); // Use today instead
        }
      } catch (error) {
        console.log('Could not parse date, using current date as fallback');
        parsedDate = new Date();
      }
      
      // Format the date as YYYY-MM-DD
      const formattedDate = parsedDate.toISOString().split('T')[0];
      
      // Format the time - ensure it's in HH:MM format
      let formattedTime = timeStr;
      if (!timeStr.match(/^\d{1,2}:\d{2}$/)) {
        // If not in HH:MM format, try to convert
        if (timeStr.toLowerCase().includes('morning')) {
          formattedTime = '09:00';
        } else if (timeStr.toLowerCase().includes('afternoon')) {
          formattedTime = '14:00';
        } else if (timeStr.toLowerCase().includes('evening')) {
          formattedTime = '17:00';
        } else {
          formattedTime = '09:00'; // Default
        }
      }
      
      // Check if appointment is for today and time has already passed
      const isToday = formattedDate === new Date().toISOString().split('T')[0];
      if (isToday) {
        const now = new Date();
        const [hours, minutes] = formattedTime.split(':').map(Number);
        const appointmentTime = new Date();
        appointmentTime.setHours(hours, minutes, 0, 0);
        
        if (appointmentTime < now) {
          // If time has already passed, set to next available hour (rounded up)
          const nextHour = now.getHours() + 1;
          formattedTime = `${nextHour.toString().padStart(2, '0')}:00`;
          console.log('Cannot book an appointment for a time that has already passed, using next available hour:', formattedTime);
        }
      }
      
      // Get base appointment fee from global settings
      const globalDocRef = doc(db, 'global', 'baseAppointmentFee');
      const globalDoc = await getDoc(globalDocRef);
      const baseAppointmentFee = globalDoc.exists() ? globalDoc.data()?.value || 1200 : 1200;
      
      // Calculate total fee using the same formula as in BookAppointmentForm
      const doctorFee = Math.round(baseAppointmentFee * doctorFeePercentage / 100);
      const departmentFee = Math.round(baseAppointmentFee * departmentFeePercentage / 100);
      const totalFee = baseAppointmentFee + doctorFee + departmentFee;
      
      // Create appointment with the same structure as BookAppointmentForm
      const appointmentData = {
        patientId: patientDoc.id,
        patientName: patientData.name || user.displayName || 'Patient',
        patientEmail: patientData.email || user.email,
        patientPhone: patientData.phone || '',
        doctorId: doctorId,
        doctorName: doctorName,
        departmentId: departmentId,
        departmentName: department,
        date: formattedDate,
        time: formattedTime,
        reason: reason,
        symptoms: appointmentState.symptoms, // Use the symptoms collected separately
        previousVisit: appointmentState.previousVisit,
        status: 'scheduled',
        baseFee: baseAppointmentFee,
        totalFee: totalFee,
        paymentStatus: 'paid', // Set to paid as requested
        paymentDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'appointments'), appointmentData);
      console.log('Appointment created successfully with fee:', totalFee);
      return true;
    } catch (error) {
      console.error('Error creating appointment:', error);
      return false;
    }
  };
  
  // Helper function to detect navigation intents
  const detectNavigationIntent = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('home page') || lowerText.includes('go to home') || lowerText.includes('open home') || lowerText.includes('main page')) {
      return '/';
    } else if (lowerText.includes('appointment') || lowerText.includes('book appointment') || lowerText.includes('schedule appointment')) {
      return '/appointment';
    } else if (lowerText.includes('lab test') || lowerText.includes('laboratory') || lowerText.includes('book test')) {
      return '/laboratory';
    } else if (lowerText.includes('doctor') || lowerText.includes('find doctor')) {
      return '/doctors';
    } else if (lowerText.includes('department')) {
      return '/departments';
    } else if (lowerText.includes('contact')) {
      return '/contact';
    } else if (lowerText.includes('about')) {
      return '/about';
    } else if (lowerText.includes('profile') || lowerText.includes('my account')) {
      return '/profile';
    } else if (lowerText.includes('login') || lowerText.includes('sign in')) {
      return '/login';
    } else if (lowerText.includes('register') || lowerText.includes('sign up')) {
      return '/register';
    }
    
    return null;
  };
  
  // Helper function to handle direct navigation requests
  const handleNavigationRequest = (path: string): boolean => {
    const pageName = path === '/' ? 'home' : path.substring(1);
    
    const navigationMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: `I'll take you to the ${pageName} page now.`,
      sender: 'assistant',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, navigationMessage]);
    setIsLoading(false);
    
    // Navigate to the requested page after a short delay
    setTimeout(() => {
      navigate(path);
    }, 1000);
    
    return true;


  };
  
  // Process the AI response for navigation or booking actions
  const processResponse = async (userInput: string, aiResponse: string): Promise<string> => {
    // Check for navigation intent in user input
    const navigationPath = detectNavigationIntent(userInput);
    const lowerInput = userInput.toLowerCase();
    
    // Check for booking intent
    const isAppointmentRequest = lowerInput.includes('appointment') || 
                               (lowerInput.includes('book') && !lowerInput.includes('test')) || 
                               lowerInput.includes('schedule appointment');
                               
    // Only consider 'doctor' if it's clearly about booking with a doctor
    const isDoctorMention = lowerInput.includes('doctor') && 
                           (lowerInput.includes('book') || lowerInput.includes('appointment') || 
                            lowerInput.includes('schedule') || lowerInput.includes('see'));
                               
    const isGeneralAppointmentRequest = isAppointmentRequest || isDoctorMention;
                               
    const isLabTestRequest = lowerInput.includes('lab test') || 
                           lowerInput.includes('laboratory') || 
                           lowerInput.includes('test') || 
                           lowerInput.includes('blood test');
    
    // Handle appointment booking requests
    if (isGeneralAppointmentRequest) {
      // Check if user is logged in for booking
      if (!isLoggedIn()) {
        // Automatically navigate to login page after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        
        return `I'll help you book an appointment, but you need to be logged in first. Taking you to the login page now...`;
      } else {
        // User is logged in, provide detailed appointment booking guidance
        // Instead of immediately navigating, provide helpful information first
        
        // Check if a doctor's name is mentioned
        let selectedDoctor: Doctor | undefined;
        for (const doctor of doctors) {
          const doctorNameLower = doctor.name.toLowerCase();
          if (lowerInput.includes(doctorNameLower)) {
            selectedDoctor = doctor;
            break;
          }
        }
        
        // Check if a department is mentioned - more strict matching for better accuracy
        let selectedDepartment: Department | undefined;
        for (const department of departments) {
          const departmentNameLower = department.name.toLowerCase();
          // Check if the department name is the main focus of the message
          if (lowerInput === departmentNameLower || 
              lowerInput.startsWith(departmentNameLower) || 
              lowerInput.endsWith(departmentNameLower) || 
              lowerInput.includes(` ${departmentNameLower} `) || 
              lowerInput.includes(`department ${departmentNameLower}`) || 
              (department.description && (
                lowerInput.includes(department.description.toLowerCase()) || 
                department.description.toLowerCase().split(' ').some(word => 
                  word.length > 3 && lowerInput.includes(word.toLowerCase())
                )
              ))) {
            selectedDepartment = department;
            break;
          }
        }
        
        // For a general appointment request ("make an appointment"), always show departments first
        if (isAppointmentRequest && !selectedDoctor && !selectedDepartment) {
          let response = `I can help you book an appointment. First, which department do you need?\n\n`;
          
          // List all departments from the database
          if (departments.length > 0) {
            departments.forEach(dept => {
              response += `- ${dept.name}${dept.description ? ` (${dept.description})` : ''}\n`;
            });
          } else {
            // Fallback if no departments are found
            response += `- Cardiology (heart-related issues)\n` +
                       `- Neurology (brain and nervous system)\n` +
                       `- Pediatrics (children's health)\n` +
                       `- Orthopedics (bone and joint issues)\n` +
                       `- Dermatology (skin conditions)\n`;
          }
          
          response += '\nPlease select a department, and I\'ll show you the available doctors.';
          return response;
        }
        // If the user has selected a specific doctor or wants to proceed to booking
        else if (selectedDoctor || lowerInput.includes('make appointment now')) {
          setTimeout(() => {
            navigate('/appointment');
          }, 1500);
          
          return `Great! I'm taking you to the appointment booking page now where you can complete your booking.`;
        } 
        // If the user has selected a department, show doctors from that department
        else if (selectedDepartment) {
          // Find doctors in this department
          const departmentDoctors = doctors.filter(doctor => 
            doctor.department.toLowerCase() === selectedDepartment?.name.toLowerCase());
          
          if (departmentDoctors.length > 0) {
            let response = `For ${selectedDepartment.name}, we have the following doctors available:\n\n`;
            
            departmentDoctors.forEach(doctor => {
              response += `- ${doctor.name}${doctor.availability ? ` (${doctor.availability})` : ''}\n`;
            });
            
            response += '\nWould you like to book an appointment with one of these doctors?';
            return response;
          } else {
            return `We don't currently have doctors available in the ${selectedDepartment.name} department. Would you like to check another department?`;
          }
        } 
        // Default case - show department list
        else {
          let response = `I can help you book an appointment. First, which department do you need?\n\n`;
          
          // List all departments from the database
          if (departments.length > 0) {
            departments.forEach(dept => {
              response += `- ${dept.name}${dept.description ? ` (${dept.description})` : ''}\n`;
            });
          } else {
            // Fallback if no departments are found
            response += `- Cardiology (heart-related issues)\n` +
                       `- Neurology (brain and nervous system)\n` +
                       `- Pediatrics (children's health)\n` +
                       `- Orthopedics (bone and joint issues)\n` +
                       `- Dermatology (skin conditions)\n`;
          }
          
          response += '\nPlease select a department, and I\'ll show you the available doctors.';
          return response;
        }
      }
    }
    
    // Handle lab test booking requests
    if (isLabTestRequest) {
      // Check if user is logged in for booking
      if (!isLoggedIn()) {
        // Automatically navigate to login page after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        
        return `I'll help you schedule a lab test, but you need to be logged in first. Taking you to the login page now...`;
      } else {
        // User is logged in, provide detailed lab test booking guidance
        // Check if a specific lab test is mentioned
        let selectedTest: LabTest | undefined;
        for (const test of labTests) {
          const testNameLower = test.name.toLowerCase();
          if (lowerInput.includes(testNameLower) || 
              (test.description && lowerInput.includes(test.description.toLowerCase()))) {
            selectedTest = test;
            break;
          }
        }
        
        // If the user has selected a specific test or wants to proceed to booking
        if (selectedTest || lowerInput.includes('schedule test now')) {
          setTimeout(() => {
            navigate('/laboratory');
          }, 1500);
          
          return `Great! I'm taking you to the lab test booking page now where you can complete your booking for ${selectedTest ? selectedTest.name : 'your test'}.`;
        } else {
          // If the user hasn't provided specific info, provide options from the database
          let response = `I can help you schedule a lab test. Please select from the following options:\n\n`;
          
          // List all lab tests from the database
          if (labTests.length > 0) {
            labTests.forEach(test => {
              response += `- ${test.name}${test.description ? ` (${test.description})` : ''}\n`;
            });
          } else {
            // Fallback if no lab tests are found
            response += `- Complete Blood Count (CBC)\n` +
                       `- Comprehensive Metabolic Panel\n` +
                       `- Lipid Panel (Cholesterol Test)\n` +
                       `- Thyroid Function Tests\n` +
                       `- Urinalysis\n` +
                       `- COVID-19 Testing\n` +
                       `- Diabetes Screening\n`;
          }
          
          response += '\nWhich test would you like to schedule?';
          return response;
        }
      }
    }
    
    // Handle navigation requests
    if (navigationPath) {
      // Automatically navigate after a short delay
      setTimeout(() => {
        navigate(navigationPath);
      }, 1500);
      
      return `I'll take you to the ${navigationPath.replace('/', '') || 'home'} page now...`;
    }
    
    // Return the original response if no special handling is needed
    return aiResponse;
  };
  
  // Fetch doctors, departments, and lab tests from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch doctors
        const doctorsQuery = query(collection(db, 'doctors'), orderBy('name'));
        const doctorsSnapshot = await getDocs(doctorsQuery);
        const doctorsData: Doctor[] = [];
        doctorsSnapshot.forEach((doc) => {
          doctorsData.push({ id: doc.id, ...doc.data() } as Doctor);
        });
        setDoctors(doctorsData);
        
        // Fetch departments
        const departmentsQuery = query(collection(db, 'departments'), orderBy('name'));
        const departmentsSnapshot = await getDocs(departmentsQuery);
        const departmentsData: Department[] = [];
        departmentsSnapshot.forEach((doc) => {
          departmentsData.push({ id: doc.id, ...doc.data() } as Department);
        });
        setDepartments(departmentsData);
        
        // Fetch lab tests
        const labTestsQuery = query(collection(db, 'availableLabTests'), orderBy('name'));
        const labTestsSnapshot = await getDocs(labTestsQuery);
        const labTestsData: LabTest[] = [];
        labTestsSnapshot.forEach((doc) => {
          labTestsData.push({ id: doc.id, ...doc.data() } as LabTest);
        });
        setLabTests(labTestsData);
        
        setDataLoaded(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Use fallback data if database fetch fails
        setDoctors([
          { id: '1', name: 'Dr. Sarah Johnson', department: 'Cardiology' },
          { id: '2', name: 'Dr. Michael Chen', department: 'Neurology' },
          { id: '3', name: 'Dr. Emily Rodriguez', department: 'Pediatrics' },
          { id: '4', name: 'Dr. David Kim', department: 'Orthopedics' },
          { id: '5', name: 'Dr. Lisa Patel', department: 'Dermatology' }
        ]);
        
        setDepartments([
          { id: '1', name: 'Cardiology', description: 'Heart-related issues' },
          { id: '2', name: 'Neurology', description: 'Brain and nervous system' },
          { id: '3', name: 'Pediatrics', description: 'Children\'s health' },
          { id: '4', name: 'Orthopedics', description: 'Bone and joint issues' },
          { id: '5', name: 'Dermatology', description: 'Skin conditions' }
        ]);
        
        setLabTests([
          { id: '1', name: 'Complete Blood Count (CBC)' },
          { id: '2', name: 'Comprehensive Metabolic Panel' },
          { id: '3', name: 'Lipid Panel' },
          { id: '4', name: 'Thyroid Function Tests' },
          { id: '5', name: 'Urinalysis' },
          { id: '6', name: 'COVID-19 Testing' },
          { id: '7', name: 'Diabetes Screening' }
        ]);
        
        setDataLoaded(true);
      }
    };
    
    fetchData();
  }, []);
  
  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle clicks outside the chat to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node) && isOpen) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Reset unread count when opening the chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);
  
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };
  
  // Helper function to identify lab test from common abbreviations
  const getLabTestFromAbbreviation = (abbr: string): string[] => {
    const lowerAbbr = abbr.toLowerCase().trim();
    const testIds: string[] = [];
    
    // Map common abbreviations to test names
    if (lowerAbbr === 'lft' || lowerAbbr.includes('liver')) {
      // Find liver function test
      const liverTest = labTests.find(test => 
        test.name.toLowerCase().includes('liver') || 
        test.description?.toLowerCase().includes('liver'));
      if (liverTest) testIds.push(liverTest.id);
    }
    
    if (lowerAbbr === 'cbc' || lowerAbbr.includes('blood count')) {
      // Find complete blood count test
      const cbcTest = labTests.find(test => 
        test.name.toLowerCase().includes('blood count') || 
        test.name.toLowerCase().includes('cbc'));
      if (cbcTest) testIds.push(cbcTest.id);
    }
    
    if (lowerAbbr === 'rft' || lowerAbbr.includes('kidney')) {
      // Find kidney function test
      const kidneyTest = labTests.find(test => 
        test.name.toLowerCase().includes('kidney') || 
        test.description?.toLowerCase().includes('kidney'));
      if (kidneyTest) testIds.push(kidneyTest.id);
    }
    
    if (lowerAbbr === 'lipid' || lowerAbbr.includes('cholesterol')) {
      // Find lipid profile test
      const lipidTest = labTests.find(test => 
        test.name.toLowerCase().includes('lipid') || 
        test.name.toLowerCase().includes('cholesterol'));
      if (lipidTest) testIds.push(lipidTest.id);
    }
    
    return testIds;
  };
  
  // Helper function to handle lab test requests
  const handleLabTestRequest = (specificTest?: string): boolean => {
    if (!isLoggedIn()) {
      const loginMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'You need to be logged in to schedule a lab test. Let me take you to the login page.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, loginMessage]);
      setIsLoading(false);
      
      // Navigate to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      
      return true;
    }
    
    // If a specific test was requested directly (like 'LFT'), skip to date selection
    if (specificTest) {
      const selectedTestIds = getLabTestFromAbbreviation(specificTest);
      
      if (selectedTestIds.length > 0) {
        // Get the names of the selected tests for the message
        const selectedTestNames = labTests
          .filter(test => selectedTestIds.includes(test.id))
          .map(test => test.name);
        
        // Set lab test scheduling in progress with pre-selected test
        setLabTestState({
          ...labTestState,
          inProgress: true,
          selectedTests: selectedTestIds,
          step: 2 // Skip to date selection
        });
        
        const dateMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `I'll help you schedule a ${selectedTestNames.join(', ')}. What date would you prefer for your lab test? (e.g., tomorrow, next Monday, June 15th)`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, dateMessage]);
        setIsLoading(false);
        return true;
      }
    }
    
    // User is logged in, show available lab tests
    let testsList = '';
    if (labTests.length > 0) {
      testsList = 'Available Lab Tests:\n\n';
      labTests.forEach((test, index) => {
        testsList += `${index + 1}. ${test.name}${test.description ? ` (${test.description})` : ''}${test.price ? ` - Rs. ${test.price}` : ''}\n\n`;
      });
    } else {
      // Fallback if no lab tests are found
      testsList = 'Available Lab Tests:\n\n' +
                 `1. Complete Blood Count (CBC)\n\n` +
                 `2. Lipid Profile\n\n` +
                 `3. Blood Glucose Test\n\n` +
                 `4. Liver Function Test (LFT)\n\n` +
                 `5. Kidney Function Test (RFT)\n\n`;
    }
    
    const labTestsMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: `I can help you schedule a lab test. Here are the available tests:\n\n${testsList}\nPlease let me know which test(s) you'd like to schedule by name or number. You can select multiple tests by listing them.`,
      sender: 'assistant',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, labTestsMessage]);
    setIsLoading(false);
    
    // Set lab test scheduling in progress
    setLabTestState({
      ...labTestState,
      inProgress: true,
      step: 1 // Waiting for test selection
    });
    
    return true;
  };
  
  // Function to handle appointment requests directly
  const handleAppointmentRequest = () => {
    // Check if user is logged in
    if (!isLoggedIn()) {
      const loginMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I'll help you book an appointment, but you need to be logged in first. Taking you to the login page now...`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, loginMessage]);
      setIsLoading(false);
      
      // Navigate to login page
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
      return true;
    }
    
    // User is logged in, show department selection
    let departmentsList = '';
    if (departments.length > 0) {
      departmentsList = 'Available Departments:\n\n';
      departments.forEach((dept, index) => {
        departmentsList += `${index + 1}. ${dept.name}${dept.description ? ` (${dept.description})` : ''}\n\n`;
      });
    } else {
      // Fallback if no departments are found
      departmentsList = 'Available Departments:\n\n' +
                       `1. Cardiology (heart-related issues)\n\n` +
                       `2. Neurology (brain and nervous system)\n\n` +
                       `3. Pediatrics (children's health)\n\n` +
                       `4. Orthopedics (bone and joint issues)\n\n` +
                       `5. Dermatology (skin conditions)\n\n`;
    }
    
    const departmentMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: `I can help you book an appointment. First, which department do you need?\n\n${departmentsList}\nPlease select a department by name or number, and I'll show you the available doctors.`,
      sender: 'assistant',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, departmentMessage]);
    setIsLoading(false);
    return true;
  };
  
  // Function to check if input is a doctor selection
  const isDoctorSelection = (input: string): Doctor | undefined => {
    const lowerInput = input.toLowerCase();
    
    // Check for doctor name mentions that might be direct selections
    for (const doctor of doctors) {
      const doctorName = doctor.name.toLowerCase();
      
      // Very strict matching for doctor name responses
      if (lowerInput === doctorName || 
          lowerInput === `${doctorName}.` || 
          lowerInput === `${doctorName}!` || 
          lowerInput === `dr. ${doctorName}` || 
          lowerInput === `doctor ${doctorName}` || 
          lowerInput === `i want ${doctorName}` || 
          lowerInput === `i choose ${doctorName}`) {
        return doctor;
      }
    }
    
    return undefined;
  };
  
  // Function to check if input is a department selection
  const isDepartmentSelection = (input: string): Department | undefined => {
    const lowerInput = input.toLowerCase();
    
    // Check for single-word department mentions that might be direct selections
    for (const department of departments) {
      const departmentName = department.name.toLowerCase();
      
      // Very strict matching for single-word responses
      if (lowerInput === departmentName || 
          lowerInput === `${departmentName}.` || 
          lowerInput === `${departmentName}!` || 
          lowerInput === `the ${departmentName}` || 
          lowerInput === `${departmentName} department` || 
          lowerInput === `i need ${departmentName}` || 
          lowerInput === `i want ${departmentName}`) {
        return department;
      }
    }
    
    return undefined;
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Check for direct navigation requests first
    const lowerInput = input.toLowerCase();
    
    // Check for navigation intents like "open home page" or "go to main page"
    if (lowerInput.includes('open') || lowerInput.includes('go to') || lowerInput.includes('take me to') || lowerInput.includes('navigate to') || lowerInput.includes('show me')) {
      const navigationPath = detectNavigationIntent(input);
      if (navigationPath) {
        // Navigate directly to the requested page
        const pageName = navigationPath === '/' ? 'home' : navigationPath.substring(1);
        
        const navigationMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `I'll take you to the ${pageName} page now.`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, navigationMessage]);
        
        // Navigate to the requested page after a short delay
        setTimeout(() => {
          navigate(navigationPath);
        }, 1000);
        
        setIsLoading(false);
        return;
      }
    }
    
    // Check if this is a direct appointment booking request
    const isGeneralAppointmentRequest = 
      ((lowerInput.includes('appointment') || lowerInput.includes('book') || lowerInput.includes('make')) && 
       !lowerInput.includes('test') && !lowerInput.includes('lab')) ||
      (lowerInput.includes('see') && lowerInput.includes('doctor'));
    
    // Check if this is a doctor selection (response to doctor list)
    const selectedDoctor = isDoctorSelection(input);
    if (selectedDoctor) {
      // User has selected a specific doctor, ask for appointment details
      const detailsMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Great! You've selected Dr. ${selectedDoctor.name}. Let's collect some details for your appointment:\n\n` +
              `What date would you prefer? (e.g., tomorrow, next Monday, June 15th)`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      // Update appointment state
      setAppointmentState({
        ...appointmentState,
        inProgress: true,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        department: selectedDoctor.department,
        step: 1 // Doctor selected, now collecting date
      });
      
      setMessages(prev => [...prev, detailsMessage]);
      setIsLoading(false);
      
      return;
    }
    
    // Check if we're in the lab test scheduling flow
    if (labTestState.inProgress) {
      // Handle different steps of the lab test scheduling process
      if (labTestState.step === 1) {
        // User provided test selection, now ask for date
        // Parse the selected tests from the input
        const selectedTestIds: string[] = [];
        const lowerInput = input.toLowerCase();
        
        // Check which tests were mentioned in the input
        for (const test of labTests) {
          const testName = test.name.toLowerCase();
          if (lowerInput.includes(testName)) {
            selectedTestIds.push(test.id);
          }
        }
        
        // If no tests were found, try to match with common test names
        if (selectedTestIds.length === 0) {
          if (lowerInput.includes('blood') || lowerInput.includes('cbc')) {
            // Find a test that matches blood count or CBC
            const bloodTest = labTests.find(t => 
              t.name.toLowerCase().includes('blood') || 
              t.name.toLowerCase().includes('cbc'));
            if (bloodTest) selectedTestIds.push(bloodTest.id);
          }
          
          if (lowerInput.includes('lipid') || lowerInput.includes('cholesterol')) {
            // Find a test that matches lipid profile
            const lipidTest = labTests.find(t => 
              t.name.toLowerCase().includes('lipid') || 
              t.name.toLowerCase().includes('cholesterol'));
            if (lipidTest) selectedTestIds.push(lipidTest.id);
          }
          
          // Add more common test name checks as needed
        }
        
        // If still no tests were found, ask the user to be more specific
        if (selectedTestIds.length === 0) {
          const clarificationMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `I'm sorry, I couldn't identify which test(s) you'd like to schedule. Please specify the exact name of the test(s) from the list I provided.`,
            sender: 'assistant',
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, clarificationMessage]);
          setIsLoading(false);
          return;
        }
        
        // Update the lab test state with selected tests
        setLabTestState({
          ...labTestState,
          selectedTests: selectedTestIds,
          step: 2 // Now collecting date
        });
        
        // Get the names of the selected tests for the message
        const selectedTestNames = labTests
          .filter(test => selectedTestIds.includes(test.id))
          .map(test => test.name);
        
        const dateMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Great! You've selected: ${selectedTestNames.join(', ')}. What date would you prefer for your lab test? (e.g., tomorrow, next Monday, June 15th)`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, dateMessage]);
        setIsLoading(false);
        return;
      }
      else if (labTestState.step === 2) {
        // User provided a date, now ask for time
        setLabTestState({
          ...labTestState,
          date: input,
          step: 3
        });
        
        const timeMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Got it! You'd like to schedule for ${input}. What specific time would you prefer? Please provide the time in HH:MM format (e.g., 09:30, 14:00). Our lab is open from 9:00 AM to 5:00 PM.`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, timeMessage]);
        setIsLoading(false);
        return;
      }
      else if (labTestState.step === 3) {
        // User provided a time, now ask for special instructions
        setLabTestState({
          ...labTestState,
          time: input,
          step: 4
        });
        
        const instructionsMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Perfect! Do you have any special instructions or requirements for your lab test? If not, just say 'none'.`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, instructionsMessage]);
        setIsLoading(false);
        return;
      }
      else if (labTestState.step === 4) {
        // User provided special instructions, now schedule the lab test
        const specialInstructions = input.toLowerCase() === 'none' ? '' : input;
        
        setLabTestState({
          ...labTestState,
          specialInstructions,
          step: 5
        });
        
        // Schedule the lab test
        const success = await scheduleLabTest(
          labTestState.selectedTests,
          labTestState.date,
          labTestState.time,
          specialInstructions
        );
        
        // Get the names of the selected tests for the confirmation message
        const selectedTestNames = labTests
          .filter(test => labTestState.selectedTests.includes(test.id))
          .map(test => test.name);
        
        let confirmationMessage: Message;
        
        if (success) {
          confirmationMessage = {
            id: (Date.now() + 1).toString(),
            text: `Thank you! Your lab test(s) ${selectedTestNames.join(', ')} have been scheduled for ${labTestState.date} at ${labTestState.time}.\n\n` +
                  `${specialInstructions ? `Special instructions: ${specialInstructions}\n\n` : ''}` +
                  `Your lab test has been confirmed. You can view and manage your lab tests in the lab tests section.`,
            sender: 'assistant',
            timestamp: new Date(),
          };
        } else {
          confirmationMessage = {
            id: (Date.now() + 1).toString(),
            text: `I apologize, but there was an issue scheduling your lab test. This could be because your patient profile is not complete. Please visit the lab test booking page directly or contact support for assistance.`,
            sender: 'assistant',
            timestamp: new Date(),
          };
        }
        
        setMessages(prev => [...prev, confirmationMessage]);
        setIsLoading(false);
        
        // Reset lab test state
        setLabTestState({
          inProgress: false,
          selectedTests: [],
          date: '',
          time: '',
          specialInstructions: '',
          step: 0
        });
        
        return;
      }
    }
    
    // Check if we're in the appointment booking flow
    if (appointmentState.inProgress) {
      // Handle different steps of the appointment booking process
      if (appointmentState.step === 1) {
        // User provided a date, now ask for time
        setAppointmentState({
          ...appointmentState,
          date: input,
          step: 2
        });
        
        const timeMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Got it! You'd like to book for ${input}. What specific time would you prefer? Please provide the time in HH:MM format (e.g., 09:30, 14:00).`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, timeMessage]);
        setIsLoading(false);
        return;
      } 
      else if (appointmentState.step === 2) {
        // User provided a time, now ask for reason
        setAppointmentState({
          ...appointmentState,
          time: input,
          step: 3
        });
        
        const reasonMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Perfect! What is the reason for your visit? (brief description of your concern)`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, reasonMessage]);
        setIsLoading(false);
        return;
      }
      else if (appointmentState.step === 3) {
        // User provided a reason, now ask for symptoms
        setAppointmentState({
          ...appointmentState,
          reason: input,
          step: 4
        });
        
        const symptomsMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Thank you. Could you please describe your symptoms in more detail? This will help the doctor prepare for your visit.`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, symptomsMessage]);
        setIsLoading(false);
        return;
      }
      else if (appointmentState.step === 4) {
        // User provided symptoms, now ask about previous visits
        setAppointmentState({
          ...appointmentState,
          symptoms: input,
          step: 5
        });
        
        const previousVisitMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Have you previously visited Dr. ${appointmentState.doctorName} for this or a related issue? Please answer with 'yes' or 'no'.`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, previousVisitMessage]);
        setIsLoading(false);
        return;
      }
      else if (appointmentState.step === 5) {
        // User provided previous visit info, now create the appointment
        const previousVisit = input.toLowerCase().includes('yes') ? 'yes' : 'no';
        
        setAppointmentState({
          ...appointmentState,
          previousVisit: previousVisit,
          step: 6
        });
        
        // Create the appointment in the database
        const success = await createAppointment(
          appointmentState.doctorId, 
          appointmentState.doctorName, 
          appointmentState.department, 
          appointmentState.date, 
          appointmentState.time, 
          appointmentState.reason
        );
        
        let confirmationMessage: Message;
        
        if (success) {
          confirmationMessage = {
            id: (Date.now() + 1).toString(),
            text: `Thank you! Your appointment with Dr. ${appointmentState.doctorName} has been scheduled for ${appointmentState.date} at ${appointmentState.time}.\n\n` +
                  `Reason for visit: ${appointmentState.reason}\n` +
                  `Symptoms: ${appointmentState.symptoms}\n` +
                  `Previous visit: ${previousVisit === 'yes' ? 'Yes' : 'No'}\n\n` +
                  `Your appointment has been confirmed and payment has been marked as completed. You can view and manage your appointments in the appointments section.`,
            sender: 'assistant',
            timestamp: new Date(),
          };
        } else {
          confirmationMessage = {
            id: (Date.now() + 1).toString(),
            text: `I apologize, but there was an issue creating your appointment. This could be because your patient profile is not complete. Please visit the appointment booking page directly or contact support for assistance.`,
            sender: 'assistant',
            timestamp: new Date(),
          };
        }
        
        setMessages(prev => [...prev, confirmationMessage]);
        setIsLoading(false);
        
        // Reset appointment state
        setAppointmentState({
          inProgress: false,
          doctorId: '',
          doctorName: '',
          department: '',
          date: '',
          time: '',
          reason: '',
          symptoms: '',
          previousVisit: 'no',
          step: 0
        });
        
        return;
      }
    }
    
    // Check if this is a department selection (response to "which department?")
    const selectedDepartment = isDepartmentSelection(input);
    if (selectedDepartment) {
      // User has selected a department, show doctors for this department
      const departmentDoctors = doctors.filter(doctor => 
        doctor.department.toLowerCase() === selectedDepartment.name.toLowerCase());
      
      let response = '';
      if (departmentDoctors.length > 0) {
        response = `For ${selectedDepartment.name}, we have the following doctors available:\n\nAvailable Doctors:\n\n`;
        
        departmentDoctors.forEach((doctor, index) => {
          response += `${index + 1}. ${doctor.name}${doctor.availability ? ` (${doctor.availability})` : ''}\n\n`;
        });
        
        response += 'Would you like to book an appointment with one of these doctors? Please select by name or number.';
      } else {
        response = `We don't currently have doctors available in the ${selectedDepartment.name} department. Would you like to check another department?`;
      }
      
      const doctorListMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, doctorListMessage]);
      setIsLoading(false);
      return;
    }
    
    // Check if this is a lab test request - more comprehensive detection
    const isLabTestRequest = 
      // Direct mentions of lab tests
      lowerInput === 'lab tests' ||
      lowerInput === 'lab test' ||
      lowerInput === 'tests' ||
      lowerInput === 'test' ||
      (lowerInput.includes('lab') || lowerInput.includes('test')) && 
      (lowerInput.includes('schedule') || lowerInput.includes('book') || lowerInput.includes('make')) ||
      // Common test abbreviations
      lowerInput === 'lft' || 
      lowerInput === 'cbc' || 
      lowerInput === 'rft' || 
      // Common test names
      lowerInput.includes('liver function') ||
      lowerInput.includes('blood count') ||
      lowerInput.includes('kidney function') ||
      lowerInput.includes('lipid profile') ||
      lowerInput.includes('glucose test') ||
      // Gemini's response about lab tests
      lowerInput.includes("i'll help you schedule a lab test");
    
    if (isLabTestRequest) {
      // Check for direct test abbreviations (LFT, CBC, etc.)
      const directTestRequest = lowerInput === 'lft' || lowerInput === 'cbc' || lowerInput === 'rft' || 
                              lowerInput.trim() === 'liver function test' || 
                              lowerInput.trim() === 'complete blood count';
      
      // Use our dedicated lab test handler, passing the specific test if it's a direct request
      if (handleLabTestRequest(directTestRequest ? input : undefined)) {
        return;
      }
    }
    
    // If this is a general appointment request, directly show department selection
    if (isGeneralAppointmentRequest) {
      // Use our dedicated appointment handler
      if (handleAppointmentRequest()) {
        return;
      }
    }
    
    try {
      
      let response;
      try {
        // Try to get response from Gemini
        const rawResponse = await generateText(input);
        
        // Process the response for navigation or booking actions
        response = await processResponse(input, rawResponse);
      } catch (apiError: any) {
        console.log('API error:', apiError?.message || 'Unknown error');
        
        // Check if it's a rate limit error
        const isRateLimitError = apiError?.message?.includes('429') || 
                                apiError?.message?.includes('quota') || 
                                apiError?.message?.includes('rate limit');
        
        if (isRateLimitError) {
          response = "I'm currently experiencing high demand and have reached my usage limits. Please try again in a few minutes. In the meantime, for health-related questions, I recommend consulting with a healthcare professional for personalized advice.";
        } else {
          // General fallback responses for other API errors
          const fallbackResponses = [
            "I recommend consulting with a healthcare professional about this. They can provide personalized advice based on your specific situation.",
            "This is an important health question that would be best addressed by your doctor who knows your medical history.",
            "For this type of question, it's best to speak with a medical professional who can give you proper guidance.",
            "I'd suggest discussing this with your healthcare provider who can give you personalized advice.",
            "This sounds like something that should be discussed with a healthcare professional who can assess your specific situation."
          ];
          // Select a random fallback response
          response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        }
      }
      
      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Process the response for navigation or booking actions
      await processResponse(input, response);
      
      // If chat is closed, increment unread count
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error getting response from Gemini:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error processing your request. Please try again later.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-50" ref={chatRef}>
      {/* Chat Button */}
      <button
        onClick={toggleChat}
        className="hover:scale-105 transition-all duration-300 relative group"
        aria-label="Open health assistant chat"
      >
        {!isOpen ? (
          <>
            <div className="relative">
              {/* Outer pulsing ring */}
              <div className="absolute -inset-3 rounded-full bg-blue-500 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-700 animate-ping-slow"></div>
              {/* Second pulsing ring with different timing */}
              <div className="absolute -inset-2 rounded-full bg-blue-600 opacity-15 blur-lg animate-pulse-slow"></div>
              {/* Inner glow */}
              <div className="absolute inset-0 rounded-full bg-blue-400 opacity-40 blur-md animate-pulse group-hover:opacity-60 group-hover:scale-110 transition-all duration-500"></div>
              {/* Shadow effect */}
              <div className="absolute inset-0 rounded-full shadow-xl shadow-blue-400 animate-pulse"></div>
              {/* Rotating highlight effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-20 group-hover:opacity-40 animate-rotate-glow"></div>
              {/* Contrasting edge */}
              <div className="absolute -inset-1 rounded-full border-2 border-blue-500 opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              {/* Main image with hover animation */}
              <img 
                src="/images/Chat bot Icon.png" 
                alt="AI Health Assistant" 
                className="relative h-16 w-16 object-cover rounded-full shadow-lg z-10 group-hover:rotate-6 transition-transform duration-300" 
              />
            </div>
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {unreadCount}
              </div>
            )}
            
            {/* Help Message Bubble */}
            {showHelpBubble && (
              <div className="absolute -top-16 -left-32 bg-white rounded-xl shadow-lg p-3 w-48 animate-fade-in z-20">
                <div className="relative">
                  <p className="text-sm font-medium text-[#14396D]">Hello! Need any help?</p>
                  <p className="text-xs text-gray-500 mt-1">I'm your AI health assistant</p>
                  <div className="absolute -bottom-7 right-2 w-4 h-4 bg-white transform rotate-45"></div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHelpBubble(false);
                    }}
                    className="absolute top-0 right-0 text-gray-400 hover:text-gray-600"
                    aria-label="Close help message"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-full p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#14396D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </button>
      
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 sm:w-96 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col transition-all duration-300 animate-fade-in-up" style={{height: '500px'}}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#14396D] to-[#2C5078] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="relative mr-3">
                  <div className="absolute -inset-1 rounded-full bg-blue-500 opacity-30 blur-md animate-pulse-slow"></div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-25 animate-rotate-glow-fast"></div>
                  <div className="absolute inset-0 rounded-full border border-blue-500 opacity-40"></div>
                  <img 
                    src="/images/Chat bot Icon.png" 
                    alt="AI Health Assistant" 
                    className="relative h-10 w-10 object-cover rounded-full shadow-md z-10 hover:rotate-6 transition-transform duration-300" 
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">AI Health Assistant</h3>
                  <p className="text-xs text-white/70">Powered by Google Gemini</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.sender === 'user' ? 'flex justify-end' : 'flex justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    message.sender === 'user'
                      ? 'bg-[#14396D] text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-[#14396D] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#14396D] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#14396D] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white">
            <div className="flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about health, navigation, or booking..."
                className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14396D] focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-[#14396D] to-[#2C5078] text-white px-3 py-2 rounded-r-lg hover:from-[#2C5078] hover:to-[#14396D] transition-all duration-300 disabled:opacity-50"
                disabled={isLoading || !input.trim()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Note: This assistant helps with website navigation, booking, and health information. Medical information is general only and not a substitute for professional advice.
            </p>
          </form>
        </div>
      )}
    </div>
  );
};

export default HealthAssistant;
