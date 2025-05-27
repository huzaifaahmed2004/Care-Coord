import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, Timestamp, doc, setDoc, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useSettings } from './SettingsContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Define possible date types for flexibility
type DateType = Timestamp | Date | string | { seconds: number; nanoseconds?: number } | { toDate(): Date } | { toMillis(): number };

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  doctorId: string;
  departmentId: string;
  departmentName: string;
  date: DateType;
  status: string;
  baseFee: number;
  totalFee: number;
  paymentStatus: string;
}

interface Doctor {
  id: string;
  name: string;
  feePercentage: number;
}

interface Department {
  id: string;
  name: string;
  feePercentage: number;
}

interface EarningsByPeriod {
  labels: string[];
  data: number[];
}

interface EarningsByEntity {
  labels: string[];
  data: number[];
}

interface LabTest {
  id: string;
  tests: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  date: DateType;
  time: string;
  status: string;
  totalPrice: number;
  createdAt: DateType;
  patientId?: string;
  patientName?: string;
  patientEmail?: string;
}

export default function EarningsAdmin() {
  const settings = useSettings();
  
  // Base appointment fee in Rs (configurable)
  const [baseAppointmentFee, setBaseAppointmentFee] = useState<number>(settings?.baseAppointmentFee || 1000);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // State for data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filters
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateError, setDateError] = useState<string | null>(null);
  
  // State for earnings data
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [appointmentEarnings, setAppointmentEarnings] = useState(0);
  const [labTestEarnings, setLabTestEarnings] = useState(0);
  const [earningsByPeriod, setEarningsByPeriod] = useState<EarningsByPeriod>({ labels: [], data: [] });
  const [labEarningsByPeriod, setLabEarningsByPeriod] = useState<EarningsByPeriod>({ labels: [], data: [] });
  const [combinedEarningsByPeriod, setCombinedEarningsByPeriod] = useState<{ labels: string[], datasets: any[] }>({ labels: [], datasets: [] });
  const [earningsByDoctor, setEarningsByDoctor] = useState<EarningsByEntity>({ labels: [], data: [] });
  const [earningsByDepartment, setEarningsByDepartment] = useState<EarningsByEntity>({ labels: [], data: [] });
  const [recentLabTests, setRecentLabTests] = useState<LabTest[]>([]);
  
  // Update local state when context values change
  useEffect(() => {
    if (settings?.baseAppointmentFee) {
      setBaseAppointmentFee(settings.baseAppointmentFee);
    }
  }, [settings?.baseAppointmentFee]);
  
  // Fetch doctors and departments
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch doctors
        const doctorsQuery = query(collection(db, 'doctors'));
        const doctorSnapshot = await getDocs(doctorsQuery);
        const doctorsList = doctorSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          feePercentage: doc.data().feePercentage || 0
        }));
        setDoctors(doctorsList);
        
        // Fetch departments
        const departmentsQuery = query(collection(db, 'departments'));
        const departmentSnapshot = await getDocs(departmentsQuery);
        const departmentsList = departmentSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          feePercentage: doc.data().feePercentage || 0
        }));
        setDepartments(departmentsList);
      } catch (e) {
        console.error('Error fetching data:', e);
        setError('Failed to load doctors and departments');
      }
      
      setLoading(false);
    }
    
    fetchData();
  }, []);
  
  // Fetch appointments when date range changes
  useEffect(() => {
    async function fetchAppointments() {
      if (!doctors.length || !departments.length) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // First, check if there are any appointments at all
        const allAppointmentsQuery = query(collection(db, 'appointments'));
        const allAppointmentsSnapshot = await getDocs(allAppointmentsQuery);
        
       
        if (allAppointmentsSnapshot.size === 0) {
          console.log('No appointments found in the database');
          setAppointments([]);
          calculateEarnings([], [], doctors, departments);
          setLoading(false);
          return;
        }
        
        // If we have appointments, proceed with date filtering
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of the day
        
       
        // Fetch all appointments first, then filter client-side
        // This is more reliable than using Firestore filters when date formats might vary
        const appointmentsQuery = query(
          collection(db, 'appointments')
        );
        
        console.log('Fetching all appointments without date filters');
        
        const appointmentSnapshot = await getDocs(appointmentsQuery);
       
        const appointmentsList: Appointment[] = [];
        
        appointmentSnapshot.forEach(doc => {
          const data = doc.data();
          console.log('Appointment data:', data);
          
          const doctorData = doctors.find(d => d.id === data.doctorId) || { feePercentage: 0, name: 'Unknown' };
          const departmentData = departments.find(d => d.id === data.departmentId) || { feePercentage: 0, name: 'Unknown' };
          
          // Use the totalFee from the appointment data if available, otherwise calculate it
          const appointmentBaseFee = data.baseFee || baseAppointmentFee;
          let totalFee = data.totalFee;
          
          // If totalFee is not available in the data, calculate it
          if (!totalFee) {
            const doctorFee = appointmentBaseFee * (doctorData.feePercentage / 100);
            const departmentFee = appointmentBaseFee * (departmentData.feePercentage / 100);
            totalFee = appointmentBaseFee + doctorFee + departmentFee;
          }
          
          // Convert date to Timestamp if it's not already
          let appointmentDate;
          let appointmentJsDate;
          
          if (data.date) {
            if (typeof data.date === 'string') {
              // If date is a string, convert to Date object
              appointmentJsDate = new Date(data.date);
              appointmentDate = Timestamp.fromDate(appointmentJsDate);
            } else if (data.date instanceof Timestamp) {
              // If it's already a Timestamp, use it directly
              appointmentDate = data.date;
              appointmentJsDate = appointmentDate.toDate();
            } else if (data.date.toDate && typeof data.date.toDate === 'function') {
              // If it has toDate method, it's likely a Firestore Timestamp
              appointmentDate = data.date;
              appointmentJsDate = appointmentDate.toDate();
            } else if (data.date.seconds && data.date.nanoseconds) {
              // If it has seconds and nanoseconds, convert to Timestamp
              appointmentDate = new Timestamp(data.date.seconds, data.date.nanoseconds);
              appointmentJsDate = appointmentDate.toDate();
            } else {
              // Fallback to current date
              console.warn('Unknown date format:', data.date);
              appointmentJsDate = new Date();
              appointmentDate = Timestamp.fromDate(appointmentJsDate);
            }
          } else {
            // If no date, use current date
            appointmentJsDate = new Date();
            appointmentDate = Timestamp.fromDate(appointmentJsDate);
          }
          
          // Filter by date range client-side
          if (appointmentJsDate < start || appointmentJsDate > end) {
            console.log(`Appointment ${doc.id} outside date range: ${appointmentJsDate}`);
            return; // Skip this appointment
          }
          
          appointmentsList.push({
            id: doc.id,
            patientName: data.patientName || 'Unknown',
            doctorName: doctorData.name,
            doctorId: data.doctorId,
            departmentId: data.departmentId,
            departmentName: departmentData.name,
            date: appointmentDate,
            status: data.status || 'scheduled',
            baseFee: appointmentBaseFee,
            totalFee: Math.round(totalFee),
            paymentStatus: data.paymentStatus || 'paid'
          });
          
          console.log(`Added appointment ${doc.id} to list`);
        });
        
        console.log(`Final appointments list length: ${appointmentsList.length}`);
        setAppointments(appointmentsList);
        
        // Fetch lab tests
        try {
          // Fetch lab tests
          const labTestsQuery = query(
            collection(db, 'labTests'),
            where('date', '>=', start.toISOString().split('T')[0]),
            where('date', '<=', end.toISOString().split('T')[0])
          );
          
          const labTestSnapshot = await getDocs(labTestsQuery);
          const labTestsList = labTestSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              tests: data.tests || [],
              date: data.date,
              time: data.time || '',
              status: data.status || 'pending',
              totalPrice: data.totalPrice || 0,
              createdAt: data.createdAt,
              patientId: data.patientId || '',
              patientName: data.patientName || 'Unknown',
              patientEmail: data.patientEmail || ''
            };
          });
          
          // Fetch recent lab tests
          const recentLabTestsQuery = query(
            collection(db, 'labTests'),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          
          const recentLabTestSnapshot = await getDocs(recentLabTestsQuery);
          const recentLabTestsList = recentLabTestSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              tests: data.tests || [],
              date: data.date,
              time: data.time || '',
              status: data.status || 'pending',
              totalPrice: data.totalPrice || 0,
              createdAt: data.createdAt,
              patientId: data.patientId || '',
              patientName: data.patientName || 'Unknown',
              patientEmail: data.patientEmail || ''
            };
          });
          
          setLabTests(labTestsList);
          setRecentLabTests(recentLabTestsList);
          
          // Calculate earnings with both appointments and lab tests
          calculateEarnings(appointmentsList, labTestsList, doctors, departments);
          
        } catch (e) {
          console.error('Error fetching lab tests:', e);
          setLabTests([]);
          setRecentLabTests([]);
          calculateEarnings(appointmentsList, [], doctors, departments);
        }
      } catch (e) {
        console.error('Error fetching appointments:', e);
        setError('Failed to load appointments');
        calculateEarnings([], [], doctors, departments);
      }
      
      setLoading(false);
    }
    
    fetchAppointments();
  }, [doctors, departments, startDate, endDate]);
  
  // Calculate earnings metrics
  const calculateEarnings = (appointmentsList: Appointment[], labTestsList: LabTest[], doctors: Doctor[], departments: Department[]) => {
    // Calculate total earnings
    let total = 0;
    let appointmentTotal = 0;
    let labTestTotal = 0;
    
    // Calculate appointment earnings
    appointmentsList.forEach(appointment => {
      // Include all appointments except cancelled ones in earnings calculation
      if (appointment.status !== 'cancelled') {
        appointmentTotal += appointment.totalFee;
      }
    });
    
    // Calculate lab test earnings
    labTestsList.forEach(labTest => {
      // Include all lab tests except cancelled ones in earnings calculation
      if (labTest.status !== 'cancelled') {
        labTestTotal += labTest.totalPrice;
      }
    });
    
    // Set total earnings (appointments + lab tests)
    total = appointmentTotal + labTestTotal;
    setTotalEarnings(total);
    setAppointmentEarnings(appointmentTotal);
    setLabTestEarnings(labTestTotal);
    
    // Calculate earnings by period
    calculateEarningsByPeriod(appointmentsList);
    calculateLabEarningsByPeriod(labTestsList);
    
    // Calculate earnings by doctor
    calculateEarningsByDoctor(appointmentsList);
    
    // Calculate earnings by department
    calculateEarningsByDepartment(appointmentsList);
    
    // Combine period earnings for the chart
    combinePeriodEarnings();
  };
  
  // Calculate earnings by time period (monthly by default)
  const calculateEarningsByPeriod = (appointmentsList: Appointment[]) => {
    const periodMap = new Map<string, number>();
    
    // Helper function to safely get date
    const getDateFromAppointment = (appointment: Appointment) => {
      try {
        const date = appointment.date as any;
        if (date instanceof Timestamp) {
          return date.toMillis();
        } else if (date && typeof date === 'object' && 'toMillis' in date && typeof date.toMillis === 'function') {
          return (date as { toMillis(): number }).toMillis();
        } else if (date instanceof Date) {
          return date.getTime();
        } else if (typeof date === 'string') {
          return new Date(date).getTime();
        } else if (date && typeof date === 'object' && 'seconds' in date) {
          // Handle Firestore timestamp-like objects
          return new Date(((date as { seconds: number }).seconds || 0) * 1000).getTime();
        } else {
          console.warn('Unknown date format in sorting:', date);
          return 0;
        }
      } catch (e) {
        console.error('Error getting date for sorting:', e);
        return 0;
      }
    };
    
    // Sort appointments by date
    const sortedAppointments = [...appointmentsList].sort((a, b) => {
      return getDateFromAppointment(a) - getDateFromAppointment(b);
    });
    
    if (sortedAppointments.length === 0) {
      setEarningsByPeriod({ labels: [], data: [] });
      return;
    }
    
    sortedAppointments.forEach(appointment => {
      // Include all appointments except cancelled ones
      if (appointment.status === 'cancelled') return;
      
      // Safely get date from appointment
      let date;
      try {
        const appointmentDate = appointment.date as any;
        if (appointmentDate instanceof Timestamp) {
          date = appointmentDate.toDate();
        } else if (appointmentDate && typeof appointmentDate === 'object' && 'toDate' in appointmentDate && typeof appointmentDate.toDate === 'function') {
          date = (appointmentDate as { toDate(): Date }).toDate();
        } else if (appointmentDate instanceof Date) {
          date = appointmentDate;
        } else if (typeof appointmentDate === 'string') {
          date = new Date(appointmentDate);
        } else if (appointmentDate && typeof appointmentDate === 'object' && 'seconds' in appointmentDate) {
          // Handle Firestore timestamp-like objects
          date = new Date(((appointmentDate as { seconds: number }).seconds || 0) * 1000);
        } else {
          console.warn('Unknown date format:', appointmentDate);
          date = new Date();
        }
      } catch (e) {
        console.error('Error converting date:', e);
        date = new Date();
      }
      
      // Use monthly period by default
      const periodKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      const currentTotal = periodMap.get(periodKey) || 0;
      periodMap.set(periodKey, currentTotal + appointment.totalFee);
    });
    
    // Convert map to arrays for chart
    const labels: string[] = [];
    const data: number[] = [];
    
    periodMap.forEach((value, key) => {
      labels.push(key);
      data.push(value);
    });
    
    // Sort chronologically
    const monthOrder: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    // Sort by year and month
    const sortedIndices = labels.map((_, i) => i).sort((a, b) => {
      const labelA = labels[a].split(' ');
      const labelB = labels[b].split(' ');
      const yearA = parseInt(labelA[1]);
      const yearB = parseInt(labelB[1]);
      if (yearA !== yearB) return yearA - yearB;
      return monthOrder[labelA[0]] - monthOrder[labelB[0]];
    });
    
    const sortedLabels = sortedIndices.map(i => labels[i]);
    const sortedData = sortedIndices.map(i => data[i]);
    
    setEarningsByPeriod({ labels: sortedLabels, data: sortedData });
  };
  
  // Calculate earnings by doctor
  const calculateEarningsByDoctor = (appointmentsList: Appointment[]) => {
    const doctorMap = new Map<string, number>();
    
    appointmentsList.forEach(appointment => {
      // Include all appointments except cancelled ones
      if (appointment.status === 'cancelled') return;
      
      const doctorName = appointment.doctorName;
      const currentTotal = doctorMap.get(doctorName) || 0;
      doctorMap.set(doctorName, currentTotal + appointment.totalFee);
    });
    
    // Convert map to arrays for chart
    const labels: string[] = [];
    const data: number[] = [];
    
    doctorMap.forEach((value, key) => {
      labels.push(key);
      data.push(value);
    });
    
    // Sort by earnings (descending)
    const sortedIndices = data.map((_, i) => i).sort((a, b) => data[b] - data[a]);
    const sortedLabels = sortedIndices.map(i => labels[i]);
    const sortedData = sortedIndices.map(i => data[i]);
    
    setEarningsByDoctor({ labels: sortedLabels, data: sortedData });
  };
  
  // Calculate earnings by department
  const calculateEarningsByDepartment = (appointmentsList: Appointment[]) => {
    const departmentMap = new Map<string, number>();
    
    appointmentsList.forEach(appointment => {
      // Include all appointments except cancelled ones
      if (appointment.status === 'cancelled') return;
      
      const departmentName = appointment.departmentName;
      const currentTotal = departmentMap.get(departmentName) || 0;
      departmentMap.set(departmentName, currentTotal + appointment.totalFee);
    });
    
    // Convert map to arrays for chart
    const labels: string[] = [];
    const data: number[] = [];
    
    departmentMap.forEach((value, key) => {
      labels.push(key);
      data.push(value);
    });
    
    // Sort by earnings (descending)
    const sortedIndices = data.map((_, i) => i).sort((a, b) => data[b] - data[a]);
    const sortedLabels = sortedIndices.map(i => labels[i]);
    const sortedData = sortedIndices.map(i => data[i]);
    
    setEarningsByDepartment({ labels: sortedLabels, data: sortedData });
  };
  
  // Calculate lab test earnings by period
  const calculateLabEarningsByPeriod = (labTestsList: LabTest[]) => {
    const periodMap = new Map<string, number>();
    
    // Helper function to safely get date
    const getDateFromLabTest = (labTest: LabTest) => {
      try {
        const date = labTest.date as any;
        if (date instanceof Timestamp) {
          return date.toMillis();
        } else if (date && typeof date === 'object' && 'toMillis' in date && typeof date.toMillis === 'function') {
          return (date as { toMillis(): number }).toMillis();
        } else if (date instanceof Date) {
          return date.getTime();
        } else if (typeof date === 'string') {
          return new Date(date).getTime();
        } else if (date && typeof date === 'object' && 'seconds' in date) {
          // Handle Firestore timestamp-like objects
          return new Date(((date as { seconds: number }).seconds || 0) * 1000).getTime();
        } else {
          console.warn('Unknown date format in sorting:', date);
          return 0;
        }
      } catch (e) {
        console.error('Error getting date for sorting:', e);
        return 0;
      }
    };
    
    // Sort lab tests by date
    const sortedLabTests = [...labTestsList].sort((a, b) => {
      return getDateFromLabTest(a) - getDateFromLabTest(b);
    });
    
    if (sortedLabTests.length === 0) {
      setLabEarningsByPeriod({ labels: [], data: [] });
      return;
    }
    
    sortedLabTests.forEach(labTest => {
      // Include all lab tests except cancelled ones
      if (labTest.status === 'cancelled') return;
      
      // Safely get date from lab test
      let date;
      try {
        const labTestDate = labTest.date as any;
        if (labTestDate instanceof Timestamp) {
          date = labTestDate.toDate();
        } else if (labTestDate && typeof labTestDate === 'object' && 'toDate' in labTestDate && typeof labTestDate.toDate === 'function') {
          date = (labTestDate as { toDate(): Date }).toDate();
        } else if (labTestDate instanceof Date) {
          date = labTestDate;
        } else if (typeof labTestDate === 'string') {
          date = new Date(labTestDate);
        } else if (labTestDate && typeof labTestDate === 'object' && 'seconds' in labTestDate) {
          // Handle Firestore timestamp-like objects
          date = new Date(((labTestDate as { seconds: number }).seconds || 0) * 1000);
        } else {
          console.warn('Unknown date format:', labTestDate);
          date = new Date();
        }
      } catch (e) {
        console.error('Error converting date:', e);
        date = new Date();
      }
      
      // Use monthly period by default
      const periodKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      const currentTotal = periodMap.get(periodKey) || 0;
      periodMap.set(periodKey, currentTotal + labTest.totalPrice);
    });
    
    // Convert map to arrays for chart
    const labels: string[] = [];
    const data: number[] = [];
    
    periodMap.forEach((value, key) => {
      labels.push(key);
      data.push(value);
    });
    
    // Sort chronologically
    const monthOrder: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    // Sort by year and month
    const sortedIndices = labels.map((_, i) => i).sort((a, b) => {
      const labelA = labels[a].split(' ');
      const labelB = labels[b].split(' ');
      const yearA = parseInt(labelA[1]);
      const yearB = parseInt(labelB[1]);
      if (yearA !== yearB) return yearA - yearB;
      return monthOrder[labelA[0]] - monthOrder[labelB[0]];
    });
    
    const sortedLabels = sortedIndices.map(i => labels[i]);
    const sortedData = sortedIndices.map(i => data[i]);
    
    setLabEarningsByPeriod({ labels: sortedLabels, data: sortedData });
  };
  
  // Combine appointment and lab test earnings for the chart
  const combinePeriodEarnings = () => {
    // Get all unique period labels
    const allLabels = new Set<string>([...earningsByPeriod.labels, ...labEarningsByPeriod.labels]);
    const sortedLabels = Array.from(allLabels).sort((a, b) => {
      const monthOrderMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const labelA = a.split(' ');
      const labelB = b.split(' ');
      const yearA = parseInt(labelA[1]);
      const yearB = parseInt(labelB[1]);
      if (yearA !== yearB) return yearA - yearB;
      return monthOrderMap[labelA[0]] - monthOrderMap[labelB[0]];
    });
    
    // Create datasets for appointments and lab tests
    const appointmentData = sortedLabels.map(label => {
      const index = earningsByPeriod.labels.indexOf(label);
      return index !== -1 ? earningsByPeriod.data[index] : 0;
    });
    
    const labTestData = sortedLabels.map(label => {
      const index = labEarningsByPeriod.labels.indexOf(label);
      return index !== -1 ? labEarningsByPeriod.data[index] : 0;
    });
    
    // Set combined earnings data
    setCombinedEarningsByPeriod({
      labels: sortedLabels,
      datasets: [
        {
          label: 'Appointment Earnings',
          data: appointmentData,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',  // Light blue - matching the legend
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Lab Test Earnings',
          data: labTestData,
          backgroundColor: 'rgba(255, 99, 132, 0.7)',  // Pink - matching the legend and the doughnut chart
          borderColor: 'rgb(61, 41, 46)',
          borderWidth: 1,
        },
      ],
    });
  };
  
  // Handle saving base appointment fee
  const handleSaveBaseFee = async () => {
    if (!settings) return;
    
    setSaving(true);
    setSuccess(false);
    
    try {
      await settings.updateBaseAppointmentFee(baseAppointmentFee);
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save base fee settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Earnings</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {/* Date Range Filter */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Filter by Date Range</h2>
         
        </div>
        {dateError && (
          <div className="mb-4 p-2 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            {dateError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={startDate}
              max={endDate}
              onChange={(e) => {
                const newStartDate = e.target.value;
                if (new Date(newStartDate) > new Date(endDate)) {
                  setDateError('Start date cannot be after end date');
                } else {
                  setDateError(null);
                  setStartDate(newStartDate);
                }
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={endDate}
              min={startDate}
              onChange={(e) => {
                const newEndDate = e.target.value;
                if (new Date(newEndDate) < new Date(startDate)) {
                  setDateError('End date cannot be before start date');
                } else {
                  setDateError(null);
                  setEndDate(newEndDate);
                }
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-l-blue-600 border-t border-r border-b border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center mb-3">
            <div className="rounded-full bg-blue-100 p-2.5 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Total Earnings</h3>
          </div>
          <p className="text-3xl font-bold text-[#14396D] mb-1">{formatCurrency(totalEarnings)}</p>
          <p className="text-sm text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
            </svg>
            All non-cancelled services
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-l-indigo-600 border-t border-r border-b border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center mb-3">
            <div className="rounded-full bg-indigo-100 p-2.5 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Appointment Earnings</h3>
          </div>
          <p className="text-3xl font-bold text-indigo-600 mb-1">{formatCurrency(appointmentEarnings)}</p>
          <p className="text-sm text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            From doctor consultations
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-l-pink-600 border-t border-r border-b border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center mb-3">
            <div className="rounded-full bg-pink-100 p-2.5 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Lab Test Earnings</h3>
          </div>
          <p className="text-3xl font-bold text-pink-600 mb-1">{formatCurrency(labTestEarnings)}</p>
          <p className="text-sm text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            From laboratory services
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-l-purple-600 border-t border-r border-b border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center mb-3">
            <div className="rounded-full bg-purple-100 p-2.5 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
              </svg>
            </div>
            <h3 className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Average Fee</h3>
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-1">
            {(() => {
              // Count all non-cancelled appointments
              const validAppointments = appointments.filter(a => a.status !== 'cancelled');
              if (validAppointments.length > 0) {
                return formatCurrency(Math.round(appointmentEarnings / validAppointments.length));
              }
              return 'N/A';
            })()}
          </p>
          <p className="text-sm text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Average fee per appointment
          </p>
        </div>
      </div>
      
      {/* Default Base Fee Configuration - Separated */}
      <div className="mb-6">
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-l-green-600 border-t border-r border-b border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center mb-4">
            <div className="rounded-full bg-green-100 p-2.5 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-gray-700 text-lg font-semibold">Default Base Fee Configuration</h3>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 mt-2">
            <div className="relative rounded-md shadow-sm w-full md:w-1/3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">Rs.</span>
              </div>
              <input 
                type="number" 
                value={baseAppointmentFee}
                onChange={(e) => setBaseAppointmentFee(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full pl-12 py-3 border rounded-lg text-xl font-bold text-green-600 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                min="0"
                required
              />
            </div>
            <button
              onClick={handleSaveBaseFee}
              disabled={saving || settings?.loading}
              className={`px-6 py-3 rounded-lg text-white font-medium ${
                saving || settings?.loading
                  ? 'bg-green-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } transition-all w-full md:w-auto`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            This is the default base fee applied to all new appointments
          </p>
          {success && (
            <div className="mt-3 p-3 bg-green-50 text-green-800 text-sm rounded-md border border-green-200 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Base fee updated successfully!
            </div>
          )}
        </div>
      </div>
      

      

      
      {/* Revenue Distribution Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Revenue Distribution</h2>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading chart data...</p>
          </div>
        ) : (appointmentEarnings > 0 || labTestEarnings > 0) ? (
          <div className="h-64">
            <Doughnut
              data={{
                labels: ['Appointment Earnings', 'Lab Test Earnings'],
                datasets: [
                  {
                    data: [appointmentEarnings, labTestEarnings],
                    backgroundColor: [
                      'rgba(54, 162, 235, 0.7)',
                      'rgba(255, 99, 132, 0.7)',
                    ],
                    borderColor: [
                      'rgba(54, 162, 235, 1)',
                      'rgba(255, 99, 132, 1)',
                    ],
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.raw as number;
                        const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                      }
                    }
                  }
                },
              }}
            />
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p>No revenue data available for the selected period</p>
          </div>
        )}
      </div>
      
      {/* Recent Lab Tests */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Laboratory Tests</h2>
          <div className="rounded-full bg-pink-100 p-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <p>Loading lab tests...</p>
          </div>
        ) : recentLabTests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tests</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLabTests.map((labTest) => {
                  // Safely get date from lab test
                  let formattedDate = 'N/A';
                  try {
                    const labTestDate = labTest.date as any;
                    if (labTestDate instanceof Timestamp) {
                      formattedDate = labTestDate.toDate().toLocaleDateString();
                    } else if (labTestDate && typeof labTestDate === 'object' && 'toDate' in labTestDate && typeof labTestDate.toDate === 'function') {
                      formattedDate = (labTestDate as { toDate(): Date }).toDate().toLocaleDateString();
                    } else if (labTestDate instanceof Date) {
                      formattedDate = labTestDate.toLocaleDateString();
                    } else if (typeof labTestDate === 'string') {
                      formattedDate = new Date(labTestDate).toLocaleDateString();
                    }
                  } catch (e) {
                    console.error('Error formatting date:', e);
                  }
                  
                  return (
                    <tr key={labTest.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{labTest.patientName || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formattedDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {labTest.tests.length > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {labTest.tests.length} {labTest.tests.length === 1 ? 'test' : 'tests'}
                          </span>
                        ) : 'No tests'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(labTest.totalPrice)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          labTest.status === 'completed' ? 'bg-green-100 text-green-800' :
                          labTest.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          labTest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {labTest.status.charAt(0).toUpperCase() + labTest.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex justify-center items-center h-32 text-gray-500">
            <p>No recent lab tests found</p>
          </div>
        )}
      </div>
      
      {/* Earnings by Doctor and Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Earnings by Doctor */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Top Earning Doctors</h2>
            <div className="rounded-full bg-blue-100 p-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading doctor data...</p>
            </div>
          ) : earningsByDoctor.labels.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {earningsByDoctor.labels.slice(0, 5).map((doctor, index) => (
                    <tr key={doctor}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{doctor}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{formatCurrency(earningsByDoctor.data[index])}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p>No doctor earnings data available</p>
            </div>
          )}
        </div>
        
        {/* Earnings by Department */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Top Earning Departments</h2>
            <div className="rounded-full bg-green-100 p-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading department data...</p>
            </div>
          ) : earningsByDepartment.labels.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {earningsByDepartment.labels.slice(0, 5).map((department, index) => (
                    <tr key={department}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{department}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{formatCurrency(earningsByDepartment.data[index])}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p>No department earnings data available</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Appointments */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-100 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Appointments</h2>
          <div className="rounded-full bg-purple-100 p-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading appointments...</p>
          </div>
        ) : appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.slice(0, 10).map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.doctorName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.departmentName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(() => {
                          try {
                            const date = appointment.date as any;
                            if (date instanceof Timestamp) {
                              return date.toDate().toLocaleDateString();
                            } else if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
                              return (date as { toDate(): Date }).toDate().toLocaleDateString();
                            } else if (date instanceof Date) {
                              return date.toLocaleDateString();
                            } else if (typeof date === 'string') {
                              return new Date(date).toLocaleDateString();
                            } else if (date && typeof date === 'object' && 'seconds' in date) {
                              // Handle Firestore timestamp-like objects
                              return new Date(((date as { seconds: number }).seconds || 0) * 1000).toLocaleDateString();
                            } else {
                              return 'Invalid date';
                            }
                          } catch (e) {
                            console.error('Error formatting date:', e);
                            return 'Invalid date';
                          }
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">{formatCurrency(appointment.totalFee)}</div>
                      <div className="text-xs text-gray-500">
                        {appointment.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p>No appointments found for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
}
