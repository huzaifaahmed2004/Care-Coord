import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, where, Timestamp } from 'firebase/firestore';
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
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import AdminNotifications from './AdminNotifications';

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
  ArcElement,
  Filler
);

interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  recentAppointments: Appointment[];
  patientGrowthData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
      fill: boolean;
    }[];
  };
  appointmentStatusData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }[];
  };
  departmentDistributionData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }[];
  };
  appointmentTrendsData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
    }[];
  };
}

const AdminDashboardHome: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    scheduledAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    recentAppointments: [],
    patientGrowthData: {
      labels: [],
      datasets: [{
        label: 'New Patients',
        data: [],
        borderColor: 'rgba(66, 125, 255, 1)',
        backgroundColor: 'rgba(66, 125, 255, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    appointmentStatusData: {
      labels: ['Scheduled', 'Confirmed', 'Cancelled'],
      datasets: [{
        label: 'Appointment Status',
        data: [0, 0, 0],
        backgroundColor: [
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 99, 132, 0.7)'
        ],
        borderColor: [
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }]
    },
    departmentDistributionData: {
      labels: [],
      datasets: [{
        label: 'Appointments by Department',
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1
      }]
    },
    appointmentTrendsData: {
      labels: [],
      datasets: [{
        label: 'Appointments per Day',
        data: [],
        backgroundColor: 'rgba(66, 125, 255, 0.5)',
        borderColor: 'rgba(66, 125, 255, 1)',
        borderWidth: 1
      }]
    }
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch total patients
        const patientsQuery = query(collection(db, 'patients'));
        const patientsSnapshot = await getDocs(patientsQuery);
        const totalPatients = patientsSnapshot.size;
        
        // Get patient registration dates for growth chart
        const patientDates = patientsSnapshot.docs.map(doc => {
          const data = doc.data();
          return data.createdAt ? new Date(data.createdAt) : new Date();
        });
        
        // Group patients by month for growth chart
        const last6Months = getLast6Months();
        const patientsByMonth = last6Months.map(month => {
          return patientDates.filter(date => 
            date.getMonth() === month.getMonth() && 
            date.getFullYear() === month.getFullYear()
          ).length;
        });
        
        // Fetch total doctors
        const doctorsQuery = query(collection(db, 'doctors'));
        const doctorsSnapshot = await getDocs(doctorsQuery);
        const totalDoctors = doctorsSnapshot.size;
        
        // Fetch appointments
        const appointmentsQuery = query(collection(db, 'appointments'));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const totalAppointments = appointmentsSnapshot.size;
        
        // Count appointments by status
        const appointments = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];
        
        const scheduledAppointments = appointments.filter(app => app.status === 'scheduled').length;
        const completedAppointments = appointments.filter(app => app.status === 'completed').length;
        const cancelledAppointments = appointments.filter(app => app.status === 'cancelled').length;
        
        // Recent appointments
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
        
        // Department distribution
        const departmentCounts: Record<string, number> = {};
        const departmentNames: Record<string, string> = {};
        
        // First, get all department names
        const departmentsQuery = query(collection(db, 'departments'));
        const departmentsSnapshot = await getDocs(departmentsQuery);
        departmentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          departmentNames[doc.id] = data.name || 'Unknown';
          departmentCounts[doc.id] = 0;
        });
        
        // Count appointments by department
        appointments.forEach(app => {
          if (app.departmentId && departmentCounts[app.departmentId] !== undefined) {
            departmentCounts[app.departmentId]++;
          }
        });
        
        // Prepare department distribution data
        const departmentLabels = Object.keys(departmentCounts).map(id => departmentNames[id] || 'Unknown');
        const departmentData = Object.values(departmentCounts);
        
        // Generate colors for departments
        const departmentColors = generateColors(departmentLabels.length);
        
        // Appointment trends (last 7 days)
        const last7Days = getLast7Days();
        const appointmentsByDay = last7Days.map(day => {
          const dayStr = day.toISOString().split('T')[0];
          return appointments.filter(app => {
            const appDate = app.date;
            return appDate === dayStr;
          }).length;
        });
        
        // Update state with all fetched data
        setStats({
          totalPatients,
          totalDoctors,
          totalAppointments,
          scheduledAppointments,
          completedAppointments,
          cancelledAppointments,
          recentAppointments,
          patientGrowthData: {
            labels: last6Months.map(date => `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`),
            datasets: [{
              label: 'New Patients',
              data: patientsByMonth,
              borderColor: 'rgba(66, 125, 255, 1)',
              backgroundColor: 'rgba(66, 125, 255, 0.1)',
              tension: 0.4,
              fill: true
            }]
          },
          appointmentStatusData: {
            labels: ['Scheduled', 'Completed', 'Cancelled'],
            datasets: [{
              label: 'Appointment Status',
              data: [scheduledAppointments, completedAppointments, cancelledAppointments],
              backgroundColor: [
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(255, 99, 132, 0.7)'
              ],
              borderColor: [
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(255, 99, 132, 1)'
              ],
              borderWidth: 1
            }]
          },
          departmentDistributionData: {
            labels: departmentLabels,
            datasets: [{
              label: 'Appointments by Department',
              data: departmentData,
              backgroundColor: departmentColors.map(color => `rgba(${color}, 0.7)`),
              borderColor: departmentColors.map(color => `rgba(${color}, 1)`),
              borderWidth: 1
            }]
          },
          appointmentTrendsData: {
            labels: last7Days.map(date => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })),
            datasets: [{
              label: 'Appointments per Day',
              data: appointmentsByDay,
              backgroundColor: 'rgba(66, 125, 255, 0.5)',
              borderColor: 'rgba(66, 125, 255, 1)',
              borderWidth: 1
            }]
          }
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
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

  // Helper function to get last 7 days
  const getLast7Days = () => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      days.push(day);
    }
    return days;
  };

  // Helper function to generate colors
  const generateColors = (count: number) => {
    const colors = [
      '66, 125, 255', // Blue
      '255, 99, 132', // Red
      '75, 192, 192', // Teal
      '255, 206, 86', // Yellow
      '153, 102, 255', // Purple
      '255, 159, 64', // Orange
      '54, 162, 235', // Light Blue
      '255, 99, 71', // Tomato
      '50, 205, 50', // Lime Green
      '255, 0, 255', // Magenta
    ];
    
    // If we need more colors than we have predefined, generate random ones
    if (count > colors.length) {
      for (let i = colors.length; i < count; i++) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        colors.push(`${r}, ${g}, ${b}`);
      }
    }
    
    return colors.slice(0, count);
  };

  // Format date for display
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
      {/* Notification Bell in top right */}
      <div className="absolute top-0 right-0 p-4 z-10">
        <AdminNotifications />
      </div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboard Overview</h2>
        <p className="text-gray-500">Welcome to your admin dashboard. Here's a summary of your hospital's performance.</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Total Patients</h3>
            <div className="p-2 rounded-full bg-blue-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#427DFF]" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{stats.totalPatients}</div>
          <div className="text-sm text-green-500 mt-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
            Growing steadily
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Total Doctors</h3>
            <div className="p-2 rounded-full bg-indigo-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{stats.totalDoctors}</div>
          <div className="text-sm text-indigo-500 mt-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Medical staff
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Total Appointments</h3>
            <div className="p-2 rounded-full bg-green-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{stats.totalAppointments}</div>
          <div className="text-sm text-green-500 mt-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Scheduled visits
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Scheduled Appointments</h3>
            <div className="p-2 rounded-full bg-yellow-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{stats.scheduledAppointments}</div>
          <div className="text-sm text-yellow-500 mt-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Upcoming visits
          </div>
        </div>
      </div>
      
      {/* Charts - First Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Patient Growth</h3>
          <div className="h-64">
            <Line 
              data={stats.patientGrowthData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointment Status</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="w-3/4 h-full">
              <Doughnut 
                data={stats.appointmentStatusData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts - Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointments by Department</h3>
          <div className="h-64">
            <Bar 
              data={stats.departmentDistributionData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointment Trends (Last 7 Days)</h3>
          <div className="h-64">
            <Line 
              data={stats.appointmentTrendsData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>
      
      {/* Recent Appointments */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Appointments</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentAppointments.length > 0 ? (
                stats.recentAppointments.map((appointment: Appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.doctorName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(appointment.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
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
  );
};

export default AdminDashboardHome;
