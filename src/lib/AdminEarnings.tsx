import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db } from './firebase';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend, 
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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
  patientId?: string;
  patientName?: string;
  patientEmail?: string;
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
}

interface EarningsData {
  totalEarnings: number;
  appointmentEarnings: number;
  labTestEarnings: number;
  monthlyEarnings: {
    month: string;
    appointmentEarnings: number;
    labTestEarnings: number;
    totalEarnings: number;
  }[];
  recentAppointments: Appointment[];
  recentLabTests: LabTest[];
}

const AdminEarnings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    appointmentEarnings: 0,
    labTestEarnings: 0,
    monthlyEarnings: [],
    recentAppointments: [],
    recentLabTests: []
  });

  useEffect(() => {
    const fetchEarningsData = async () => {
      setLoading(true);
      try {
        // Fetch appointments
        const appointmentsQuery = query(collection(db, 'appointments'));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        
        // Get appointment data
        const appointments = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];
        
        // Fetch recent appointments
        const recentAppointmentsQuery = query(
          collection(db, 'appointments'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const recentAppointmentsSnapshot = await getDocs(recentAppointmentsQuery);
        const recentAppointments = recentAppointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];
        
        // Fetch lab tests
        const labTestsQuery = query(collection(db, 'labTests'));
        const labTestsSnapshot = await getDocs(labTestsQuery);
        
        // Get lab test data
        const labTests = labTestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LabTest[];
        
        // Get recent lab tests
        const recentLabTestsQuery = query(
          collection(db, 'labTests'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const recentLabTestsSnapshot = await getDocs(recentLabTestsQuery);
        const recentLabTests = recentLabTestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LabTest[];
        
        // Calculate earnings data
        // For this example, we'll assume each appointment costs Rs 50
        const appointmentPrice = 50;
        const completedAppointments = appointments.filter(app => app.status === 'completed').length;
        const appointmentEarnings = completedAppointments * appointmentPrice;
        
        // Calculate lab test earnings
        const labTestEarnings = labTests.reduce((total, test) => {
          // Only count completed tests
          if (test.status === 'completed') {
            return total + (test.totalPrice || 0);
          }
          return total;
        }, 0);
        
        // Calculate total earnings
        const totalEarnings = appointmentEarnings + labTestEarnings;
        
        // Calculate monthly earnings
        const last6MonthsData = getLast6Months();
        const monthlyEarnings = last6MonthsData.map(month => {
          const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
          
          // Calculate appointment earnings for this month
          const monthAppointments = appointments.filter(app => {
            const appDate = new Date(app.date);
            return appDate.getMonth() === month.getMonth() && 
                   appDate.getFullYear() === month.getFullYear() &&
                   app.status === 'completed';
          });
          const monthAppointmentEarnings = monthAppointments.length * appointmentPrice;
          
          // Calculate lab test earnings for this month
          const monthLabTests = labTests.filter(test => {
            const testDate = new Date(test.date);
            return testDate.getMonth() === month.getMonth() && 
                   testDate.getFullYear() === month.getFullYear() &&
                   test.status === 'completed';
          });
          const monthLabTestEarnings = monthLabTests.reduce((total, test) => {
            return total + (test.totalPrice || 0);
          }, 0);
          
          // Total monthly earnings
          const monthTotalEarnings = monthAppointmentEarnings + monthLabTestEarnings;
          
          return {
            month: month.toLocaleString('default', { month: 'short' }) + ' ' + month.getFullYear(),
            appointmentEarnings: monthAppointmentEarnings,
            labTestEarnings: monthLabTestEarnings,
            totalEarnings: monthTotalEarnings
          };
        });
        
        // Update state with all fetched data
        setEarningsData({
          totalEarnings,
          appointmentEarnings,
          labTestEarnings,
          monthlyEarnings,
          recentAppointments,
          recentLabTests
        });
      } catch (error) {
        console.error('Error fetching earnings data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEarningsData();
  }, []);

  // Helper function to get last 6 months
  const getLast6Months = () => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(month);
    }
    return months;
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#427DFF]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Earnings Overview</h2>
        <p className="text-gray-500">Financial summary of your hospital's revenue streams.</p>
      </div>
      
      {/* Earnings Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Total Earnings</h3>
            <div className="p-2 rounded-full bg-green-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">Rs {earningsData.totalEarnings.toLocaleString()}</div>
          <div className="text-sm text-green-500 mt-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
            All revenue sources
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Appointment Earnings</h3>
            <div className="p-2 rounded-full bg-blue-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">Rs {earningsData.appointmentEarnings.toLocaleString()}</div>
          <div className="text-sm text-blue-500 mt-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            From doctor visits
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Lab Test Earnings</h3>
            <div className="p-2 rounded-full bg-purple-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">Rs {earningsData.labTestEarnings.toLocaleString()}</div>
          <div className="text-sm text-purple-500 mt-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            From laboratory services
          </div>
        </div>
      </div>
      
      {/* Monthly Earnings Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Monthly Earnings Breakdown</h3>
          <div className="text-sm text-gray-500">
            Last 6 months
          </div>
        </div>
        <div className="h-80">
          <Bar 
            data={{
              labels: earningsData.monthlyEarnings.map(item => item.month),
              datasets: [
                {
                  label: 'Appointment Earnings',
                  data: earningsData.monthlyEarnings.map(item => item.appointmentEarnings),
                  backgroundColor: 'rgba(66, 125, 255, 0.7)',
                  borderColor: 'rgba(66, 125, 255, 1)',
                  borderWidth: 1,
                  stack: 'Stack 0',
                },
                {
                  label: 'Lab Test Earnings',
                  data: earningsData.monthlyEarnings.map(item => item.labTestEarnings),
                  backgroundColor: 'rgba(153, 102, 255, 0.7)',
                  borderColor: 'rgba(153, 102, 255, 1)',
                  borderWidth: 1,
                  stack: 'Stack 0',
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  grid: {
                    display: false
                  }
                },
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: function(value) {
                      return 'Rs ' + value;
                    }
                  }
                }
              },
              plugins: {
                legend: {
                  position: 'top',
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      let label = context.dataset.label || '';
                      if (label) {
                        label += ': ';
                      }
                      if (context.parsed.y !== null) {
                        label += 'Rs ' + context.parsed.y.toLocaleString();
                      }
                      return label;
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>
      
      {/* Revenue Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="w-3/4 h-full">
              <Doughnut 
                data={{
                  labels: ['Appointment Earnings', 'Lab Test Earnings'],
                  datasets: [{
                    label: 'Revenue Distribution',
                    data: [earningsData.appointmentEarnings, earningsData.labTestEarnings],
                    backgroundColor: [
                      'rgba(66, 125, 255, 0.7)',
                      'rgba(153, 102, 255, 0.7)'
                    ],
                    borderColor: [
                      'rgba(66, 125, 255, 1)',
                      'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.raw as number;
                          const total = (context.dataset.data as number[]).reduce((a, b) => (a as number) + (b as number), 0) as number;
                          const percentage = Math.round((value / total) * 100);
                          return `${label}: Rs ${value.toLocaleString()} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Earnings Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Revenue:</span>
              <span className="font-semibold">Rs {earningsData.totalEarnings.toLocaleString()}</span>
            </div>
            <div className="h-px bg-gray-200"></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Appointment Revenue:</span>
              <span className="font-semibold">Rs {earningsData.appointmentEarnings.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Lab Test Revenue:</span>
              <span className="font-semibold">Rs {earningsData.labTestEarnings.toLocaleString()}</span>
            </div>
            <div className="h-px bg-gray-200"></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Appointment Percentage:</span>
              <span className="font-semibold">{Math.round((earningsData.appointmentEarnings / earningsData.totalEarnings) * 100) || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Lab Test Percentage:</span>
              <span className="font-semibold">{Math.round((earningsData.labTestEarnings / earningsData.totalEarnings) * 100) || 0}%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Appointments */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Appointment Transactions</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {earningsData.recentAppointments.length > 0 ? (
                    earningsData.recentAppointments.map((appointment) => (
                      <tr key={appointment.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{appointment.doctorName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{formatDate(appointment.date)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">Rs 50</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No recent appointments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Recent Lab Tests */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Lab Test Transactions</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tests</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {earningsData.recentLabTests.length > 0 ? (
                    earningsData.recentLabTests.map((test) => (
                      <tr key={test.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{test.patientName || 'Patient'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{formatDate(test.date)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{test.tests.length} tests</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">Rs {test.totalPrice.toLocaleString()}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No recent lab tests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEarnings;
