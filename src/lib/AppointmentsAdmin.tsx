import { FirebaseError } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

// Interfaces
interface Doctor {
  id?: string;
  name: string;
  department?: string;
  speciality?: string;
  feePercentage?: number;
}

interface Patient {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Appointment {
  id?: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  departmentId?: string;
  departmentName?: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  baseFee?: number;
  totalFee?: number;
  paymentStatus?: "pending" | "paid" | "refunded";
  paymentDate?: string;
}

// --- Appointment Modal Component ---
function AppointmentModal({
  open,
  onClose,
  onSave,
  appointment,
  doctors,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (appointment: Appointment) => void;
  appointment?: Appointment | null;
  doctors: Doctor[];
}) {
  // State to store departments for fee calculation
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState<Appointment>(
    appointment || {
      patientId: "",
      patientName: "",
      patientEmail: "",
      patientPhone: "",
      doctorId: "",
      doctorName: "",
      departmentId: "",
      departmentName: "",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      status: "scheduled",
      notes: "",
      createdAt: new Date().toISOString(),
      baseFee: 1000, // Default base fee is 1000 Rs
      paymentStatus: "paid", // All appointments are automatically paid
      paymentDate: new Date().toISOString().split("T")[0],
    }
  );

  const [saving, setSaving] = useState(false);

  // Fetch departments for fee calculation
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const departmentsSnap = await getDocs(collection(db, "departments"));
        const departmentsData = departmentsSnap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        }));
        setDepartments(departmentsData);
      } catch (e) {
        console.error('Error fetching departments:', e);
      }
    }
    fetchDepartments();
  }, []);

  useEffect(() => {
    // Reset state when modal is opened or appointment changes
    if (appointment) {
      setForm(appointment);
    } else {
      setForm({
        patientId: "",
        patientName: "",
        patientEmail: "",
        patientPhone: "",
        doctorId: "",
        doctorName: "",
        departmentId: "",
        departmentName: "",
        date: new Date().toISOString().split("T")[0],
        time: "09:00",
        status: "scheduled",
        notes: "",
        createdAt: new Date().toISOString(),
        baseFee: 1000, // Default base fee is 1000 Rs
        totalFee: 1000, // Default total fee starts at base fee
        paymentStatus: "paid", // All appointments are automatically paid
        paymentDate: new Date().toISOString().split("T")[0],
      });
    }
    setSaving(false);
  }, [appointment]);

  // Calculate total fee when doctor, department, or base fee changes
  useEffect(() => {
    if (form.doctorId && form.departmentId && form.baseFee) {
      // Find the selected doctor and department to get their fee percentages
      const selectedDoctor = doctors.find(d => d.id === form.doctorId);
      const selectedDepartment = departments.find(d => d.id === form.departmentId);
      
      if (selectedDoctor && selectedDepartment) {
        const doctorFeePercentage = selectedDoctor.feePercentage || 0;
        const departmentFeePercentage = selectedDepartment.feePercentage || 0;
        
        // Calculate the doctor and department fees
        const doctorFee = form.baseFee * (doctorFeePercentage / 100);
        const departmentFee = form.baseFee * (departmentFeePercentage / 100);
        
        // Calculate the total fee
        const totalFee = form.baseFee + doctorFee + departmentFee;
        
        // Update the form with the calculated total fee
        setForm(prev => ({
          ...prev,
          totalFee: Math.round(totalFee)
        }));
      }
    }
  }, [form.doctorId, form.departmentId, form.baseFee, doctors, departments]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    
    if (name === "doctorId") {
      const selectedDoctor = doctors.find(d => d.id === value);
      const selectedDepartment = departments.find(d => d.id === selectedDoctor?.department);
      
      setForm(prev => ({
        ...prev,
        doctorId: value,
        doctorName: selectedDoctor?.name || "",
        departmentId: selectedDoctor?.department || "",
        departmentName: selectedDepartment?.name || "",
      }));
    } else if (name === "baseFee") {
      // Convert the value to a number for the base fee
      setForm(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("Form submitted with data:", form);

    try {
      // Show loading state
      setSaving(true);

      // Call save with form data
      onSave(form);
    } catch (error) {
      console.error('Error during form submission:', error);
      let errorMessage = 'Error saving appointment information.';
      if (error instanceof Error) {
        errorMessage += ' ' + error.message;
      }
      alert(errorMessage);
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white max-w-md w-full rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {appointment ? "Update" : "Add"} Appointment
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Patient Information */}
          <div className="mb-4">
            <h3 className="text-md font-semibold mb-2 text-gray-700 border-b pb-1">
              Patient Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient Name*
                </label>
                <input
                  type="text"
                  name="patientName"
                  value={form.patientName}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="patientEmail"
                  value={form.patientEmail || ""}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="patientPhone"
                  value={form.patientPhone || ""}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="mb-4">
            <h3 className="text-md font-semibold mb-2 text-gray-700 border-b pb-1">
              Appointment Details
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor*
                </label>
                <select
                  name="doctorId"
                  value={form.doctorId}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a doctor</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.speciality}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date*
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time*
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={form.time}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status*
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No Show</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={form.notes || ""}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Additional notes or reason for visit"
                />
              </div>
            </div>
          </div>
          
          {/* Payment Information */}
          <div className="mb-4">
            <h3 className="text-md font-semibold mb-2 text-gray-700 border-b pb-1">
              Payment Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Fee (Rs)
                </label>
                <div className="w-full border border-gray-300 bg-gray-50 rounded-lg px-3 py-2 text-gray-700">
                  Rs. {form.baseFee || 1000}
                </div>
                <p className="text-xs text-gray-500 mt-1">Appointment base fee (before doctor and department percentages)</p>
              </div>
              
              {/* Display calculated total fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Fee (Rs)
                </label>
                <div className="w-full border border-gray-300 bg-gray-50 rounded-lg px-3 py-2 text-gray-700">
                  Rs. {form.totalFee || form.baseFee || 1000}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total fee including doctor ({doctors.find(d => d.id === form.doctorId)?.feePercentage || 0}%) 
                  and department ({departments.find(d => d.id === form.departmentId)?.feePercentage || 0}%) percentages
                </p>
              </div>
              
              {/* Hidden fields to maintain the values */}
              <input type="hidden" name="baseFee" value={form.baseFee || 1000} />
              <input type="hidden" name="totalFee" value={form.totalFee || form.baseFee || 1000} />
              
              {/* Payment status is always paid and hidden from the UI */}
              <input type="hidden" name="paymentStatus" value="paid" />
              <input type="hidden" name="paymentDate" value={form.paymentDate || new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>{appointment ? "Update" : "Add"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main AppointmentsAdmin Component ---
export default function AppointmentsAdmin() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Load appointments and doctors
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch appointments
        const appointmentsSnap = await getDocs(collection(db, "appointments"));
        const appointmentsData = appointmentsSnap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        } as Appointment));
        setAppointments(appointmentsData);

        // Fetch doctors for the dropdown
        const doctorsSnap = await getDocs(collection(db, "doctors"));
        const doctorsData = doctorsSnap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        } as Doctor));
        setDoctors(doctorsData);
      } catch (e) {
        console.error('Error fetching data:', e);
        setError('Failed to load appointments.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Update existing appointment
  async function handleUpdate(updatedAppointment: Appointment) {
    console.log("handleUpdate called with:", updatedAppointment);
    setSaving(true);
    setError(null);
    try {
      if (!updatedAppointment.id) {
        throw new Error("Appointment ID is required for update");
      }

      const { id, ...appointmentData } = updatedAppointment;
      console.log("Updating appointment:", id, appointmentData);

      // Update the appointment in Firestore
      await updateDoc(doc(collection(db, 'appointments'), id), {
        ...appointmentData,
        updatedAt: new Date().toISOString(),
      });
      console.log("Appointment updated in Firestore");

      // Update local state
      setAppointments(prev => prev.map(a =>
        a.id === id ? { ...a, ...appointmentData, updatedAt: new Date().toISOString() } : a
      ));

      setModalOpen(false);
    } catch (e: unknown) {
      console.error("Error in handleUpdate:", e);
      const errorMessage =
        e instanceof FirebaseError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Update failed.';
      setError(errorMessage);
    }
    setSaving(false);
  }

  // Delete appointment
  async function handleDelete(appointmentId: string) {
    if (!confirm("Are you sure you want to delete this appointment?")) return;

    setSaving(true);
    setError(null);
    try {
      // Delete the document from Firestore
      await deleteDoc(doc(collection(db, "appointments"), appointmentId));

      // Update the local state
      setAppointments((appointments) => appointments.filter((a) => a.id !== appointmentId));
    } catch (e: unknown) {
      const errorMessage =
        e instanceof FirebaseError
          ? e.message
          : "Delete failed.";
      setError(errorMessage);
    }
    setSaving(false);
  }

  // Filter appointments by status
  const filteredAppointments = filterStatus === "all"
    ? appointments
    : appointments.filter(a => a.status === filterStatus);

  // Get status badge color
  function getStatusBadgeColor(status: string) {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no-show":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  // Format date for display
  function formatDate(dateString: string) {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  return (
    <div className="w-full min-h-[60vh] px-4 pb-10 bg-gray-50">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-700 -mx-4 px-6 py-8 mb-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Appointments Management
          </h1>
          <p className="text-teal-100 text-sm md:text-base">View and manage patient appointments</p>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">
              {filteredAppointments.length} {filteredAppointments.length === 1 ? 'Appointment' : 'Appointments'}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64 w-full">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mb-3"></div>
              <p className="text-gray-500">Loading appointments...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAppointments.length === 0 && (
          <div className="flex flex-col justify-center items-center h-64 w-full bg-white rounded-xl shadow-sm p-8 border border-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-1">No appointments found</h3>
            <p className="text-gray-500 mb-4 text-center">
              {filterStatus === "all" 
                ? "There are no appointments in the system yet."
                : `No appointments with status "${filterStatus}" found.`}
            </p>
          </div>
        )}

        {/* Appointments Table */}
        {!loading && filteredAppointments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
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
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                          {appointment.patientEmail && (
                            <div className="text-sm text-gray-500">{appointment.patientEmail}</div>
                          )}
                          {appointment.patientPhone && (
                            <div className="text-sm text-gray-500">{appointment.patientPhone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">{appointment.doctorName}</div>
                          {appointment.departmentName && (
                            <div className="text-sm text-gray-500">{appointment.departmentName}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(appointment.date)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.time}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelected(appointment);
                              setModalOpen(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-md transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (appointment.id) {
                                handleDelete(appointment.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <AppointmentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleUpdate}
          appointment={selected}
          doctors={doctors}
        />
        {saving && (
          <div className="fixed bottom-2 right-2 bg-teal-600 text-white px-5 py-2 rounded shadow z-50">
            Saving...
          </div>
        )}
      </div>
    </div>
  );
}
