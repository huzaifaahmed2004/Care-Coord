import { FirebaseError } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { db } from "./firebase";
import { convertImageToBase64 } from './imageUtils';

// --- Department Images ---
const defaultImage = "https://images.unsplash.com/photo-1538108149393-fbbd81895907?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2128&q=80";

// High-quality medical department fallback images
const fallbackImages = [
  "https://images.unsplash.com/photo-1516549655169-df83a0774514?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Modern hospital corridor
  "https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Laboratory
  "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Surgery
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Cardiology
  "https://images.unsplash.com/photo-1631815588090-d1bcbe9a8537?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", // Pediatrics
  "https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"  // Radiology
];

// Interfaces
interface Doctor {
  id?: string;
  name: string;
  gender?: string;
  age?: string;
  department?: string;
  departmentId?: string;
  speciality?: string;
  email?: string;
  imgUrl?: string;
}

interface Department {
  id?: string;
  name: string;
  description: string;
  location: string;
  headDoctor: string;
  headDoctorId?: string; // Reference to the doctor ID
  contactEmail: string;
  contactPhone: string;
  imgUrl?: string;
  feePercentage: number; // Percentage added to base appointment fee
}

// --- Department Modal Component ---
function DepartmentModal({
  open,
  onClose,
  onSave,
  department,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (dept: Department) => void;
  department?: Department | null;
}) {
  const [form, setForm] = useState<Department>(
    department || {
      name: "",
      description: "",
      location: "",
      headDoctor: "",
      headDoctorId: "",
      contactEmail: "",
      contactPhone: "",
      imgUrl: "",
      feePercentage: 5, // Default 5% fee percentage
    }
  );

  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch doctors for dropdown
  useEffect(() => {
    async function fetchDoctors() {
      if (!open) return;
      
      setLoadingDoctors(true);
      try {
        // If we're editing an existing department, only fetch doctors from that department
        if (department?.id) {
          // Get doctors that belong to this department
          const q = query(
            collection(db, "doctors"),
            where("departmentId", "==", department.id)
          );
          const snap = await getDocs(q);
          const doctorData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor));
          
          // If the current head doctor is not in the filtered list, we need to fetch and add them
          if (department.headDoctorId && !doctorData.some(d => d.id === department.headDoctorId)) {
            try {
              const headDoctorDoc = await getDocs(
                query(collection(db, "doctors"), where("id", "==", department.headDoctorId))
              );
              if (!headDoctorDoc.empty) {
                const headDoctorData = { 
                  id: headDoctorDoc.docs[0].id, 
                  ...headDoctorDoc.docs[0].data() 
                } as Doctor;
                doctorData.push(headDoctorData);
              }
            } catch (err) {
              console.error('Error fetching head doctor:', err);
            }
          }
          
          setDoctors(doctorData);
        } else {
          // For new departments, show all doctors
          const snap = await getDocs(collection(db, "doctors"));
          const doctorData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor));
          setDoctors(doctorData);
        }
      } catch (e) {
        console.error('Error fetching doctors:', e);
      } finally {
        setLoadingDoctors(false);
      }
    }
    fetchDoctors();
  }, [open, department?.id, department?.headDoctorId]);

  useEffect(() => {
    // Reset state when modal is opened or department changes
    setForm(
      department || {
        name: "",
        description: "",
        location: "",
        headDoctor: "",
        headDoctorId: "",
        contactEmail: "",
        contactPhone: "",
        imgUrl: "",
        feePercentage: 5, // Default 5% fee percentage
      }
    );
    setImagePreview(department?.imgUrl || null);
    setImageFile(null);
    setSaving(false);
  }, [department]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function uploadImage(): Promise<string> {
    if (!imageFile) {
      console.log("No image file to upload, returning existing URL:", form.imgUrl || '');
      return form.imgUrl || ''; // Return existing URL if no new image
    }

    console.log("Starting image upload for file:", imageFile.name);

    try {
      // Check file size before attempting conversion
      if (imageFile.size > 800 * 1024) {
        throw new Error('Image must be less than 800KB for Base64 storage');
      }

      // Convert image to Base64 string for storage in Firestore
      const base64Image = await convertImageToBase64(imageFile);
      console.log("Image converted to Base64, length:", base64Image.length);
      
      return base64Image;
    } catch (error: any) {
      console.error('Error processing image:', error);
      let errorMessage = error.message || 'Unknown error';
      
      // Alert the user about the error
      if (errorMessage.includes('800KB')) {
        alert('Image is too large. Please select an image smaller than 800KB.');
      } else {
        alert(`Error processing image: ${errorMessage}`);
      }
      
      // Generate a deterministic avatar based on the department's name
      const seed = form.name || Math.random().toString();
      const seedIndex = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const avatarIndex = seedIndex % fallbackImages.length;
      const fallbackImage = fallbackImages[avatarIndex];
      
      console.log("Using fallback image URL:", fallbackImage);
      return fallbackImage;
    }
  }

  function triggerFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("Form submitted with data:", form);

    try {
      // Show loading state
      setSaving(true);

      // First upload image if exists
      console.log("Starting image upload process...");
      const imageUrl = await uploadImage();
      console.log("Image uploaded, URL:", imageUrl);

      // Call save with updated form data including image URL
      const departmentData = {
        ...form,
        imgUrl: imageUrl
      };

      console.log("Submitting department data:", departmentData);
      onSave(departmentData);
    } catch (error) {
      console.error('Error during form submission:', error);
      let errorMessage = 'Error saving department information.';
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
          {department ? "Update" : "Add"} Department
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Department Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department Name*
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Cardiology"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description*
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Brief description of the department"
            />
          </div>

          {/* Location */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location*
            </label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Building A, Floor 3"
            />
          </div>

          {/* Head Doctor */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Head Doctor*
            </label>
            <select
              name="headDoctorId"
              value={form.headDoctorId || ''}
              onChange={(e) => {
                const selectedDoctor = doctors.find(d => d.id === e.target.value);
                setForm(prev => ({
                  ...prev,
                  headDoctorId: e.target.value,
                  headDoctor: selectedDoctor?.name || ''
                }));
              }}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a head doctor</option>
              {loadingDoctors ? (
                <option disabled>Loading doctors...</option>
              ) : doctors.length === 0 ? (
                <option disabled>No doctors available for this department</option>
              ) : (
                doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.speciality}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Contact Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email*
              </label>
              <input
                type="email"
                name="contactEmail"
                value={form.contactEmail}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone*
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Percentage (%)*
              </label>
              <input
                type="number"
                name="feePercentage"
                value={form.feePercentage}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                  setForm({ ...form, feePercentage: value });
                }}
                min="0"
                max="100"
                className="w-full p-2 border rounded"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Additional percentage added to base appointment fee</p>
            </div>
          </div>

          {/* Department Image */}
          <div className="mb-6 flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 self-start">
              Department Image
            </label>
            <div
              className="w-24 h-24 rounded-full bg-gray-200 mb-2 overflow-hidden relative cursor-pointer"
              onClick={triggerFileInput}
            >
              {(imagePreview || form.imgUrl) ? (
                <img
                  src={imagePreview || form.imgUrl || defaultImage}
                  alt="Department preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <span>Add Photo</span>
                </div>
              )}

              {/* Overlay for hover effect */}
              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium">Change</span>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />

            <button
              type="button"
              onClick={triggerFileInput}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {form.imgUrl || imagePreview ? 'Change Photo' : 'Upload Photo'}
            </button>
            <p className="text-xs text-gray-500 mt-1">Upload an image representing this department</p>
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
                <>{department ? "Update" : "Add"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main DepartmentsAdmin Component ---
export default function DepartmentsAdmin() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Load departments
  useEffect(() => {
    async function fetchDepartments() {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "departments"));
        setDepartments(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Department))
        );
      } catch (e) {
        console.error('Error fetching departments:', e);
        setError('Failed to load departments.');
      } finally {
        setLoading(false);
      }
    }
    fetchDepartments();
  }, []);

  // Add new department
  async function handleAdd(deptData: Department) {
    console.log("handleAdd called with:", deptData);
    setSaving(true);
    setError(null);
    try {
      // Add to firestore
      const newDeptRef = await addDoc(collection(db, 'departments'), {
        ...deptData,
        headDoctorId: deptData.headDoctorId,
        createdAt: new Date().toISOString(),
      });
      console.log("Department added to Firestore:", newDeptRef.id);

      // Update local state with the new department
      const newDepartment: Department = {
        id: newDeptRef.id,
        ...deptData,
      };

      setDepartments(prev => [...prev, newDepartment]);
      setModalOpen(false);
    } catch (e: unknown) {
      console.error("Error in handleAdd:", e);
      let errorMessage = 'Could not create department.';

      if (e instanceof FirebaseError) {
        errorMessage = e.message;
      } else if (e instanceof Error) {
        errorMessage = e.message;
      }

      setError(errorMessage);
    }
    setSaving(false);
  }

  // Update existing department
  async function handleUpdate(newDept: Department) {
    console.log("handleUpdate called with:", newDept);
    setSaving(true);
    setError(null);
    try {
      if (!newDept.id) {
        throw new Error("Department ID is required for update");
      }

      const { id, ...deptData } = newDept;
      console.log("Updating department:", id, deptData);

      // Update the department in Firestore
      await updateDoc(doc(collection(db, 'departments'), id), {
        ...deptData,
        headDoctorId: deptData.headDoctorId,
        updatedAt: new Date().toISOString(),
      });
      console.log("Department updated in Firestore");

      // Update local state
      setDepartments(prev => prev.map(d =>
        d.id === id ? { ...d, ...deptData } : d
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

  // Delete department
  async function handleDelete(deptId: string) {
    if (!confirm("Are you sure you want to delete this department?")) return;

    setSaving(true);
    setError(null);
    try {
      // Delete the document from Firestore
      await deleteDoc(doc(collection(db, "departments"), deptId));

      // Update the local state
      setDepartments((departments) => departments.filter((d) => d.id !== deptId));
    } catch (e: unknown) {
      const errorMessage =
        e instanceof FirebaseError
          ? e.message
          : "Delete failed.";
      setError(errorMessage);
    }
    setSaving(false);
  }

  return (
    <div className="w-full min-h-[60vh] px-4 pb-10 bg-gray-50">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 -mx-4 px-6 py-8 mb-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Departments Management
          </h1>
          <p className="text-indigo-100 text-sm md:text-base">Organize and manage hospital departments</p>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">
              {departments.length} {departments.length === 1 ? 'Department' : 'Departments'}
            </span>
          </div>
          <button
            onClick={() => {
              setSelected(null);
              setModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 transition-colors duration-200 flex items-center gap-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Department
          </button>
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
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-3"></div>
              <p className="text-gray-500">Loading departments...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && departments.length === 0 && (
          <div className="flex flex-col justify-center items-center h-64 w-full bg-white rounded-xl shadow-sm p-8 border border-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-1">No departments found</h3>
            <p className="text-gray-500 mb-4 text-center">Start by adding your first department to the system</p>
            <button
              onClick={() => {
                setSelected(null);
                setModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 transition-colors duration-200 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Your First Department
            </button>
          </div>
        )}

        {/* Card Grid Layout */}
        {!loading && departments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 hover:border-indigo-200 cursor-pointer transform hover:-translate-y-1"
                onClick={() => {
                  setSelected(dept);
                  setModalOpen(true);
                }}
              >
                {/* Card Header with Department Image */}
                <div className="h-48 w-full relative overflow-hidden">
                  <img 
                    src={dept.imgUrl || fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}
                    alt={dept.name}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                    <div className="p-4 w-full">
                      <h3 className="font-bold text-xl text-white drop-shadow-md">{dept.name}</h3>
                      <p className="text-white/80 text-sm truncate mt-1">{dept.description}</p>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 pt-3">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {dept.location}
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {dept.headDoctor}
                    </div>
                    <div className="flex items-center text-gray-600 text-sm truncate">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{dept.contactEmail}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {dept.contactPhone}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex justify-between gap-2 pt-4 mt-2 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(dept);
                        setModalOpen(true);
                      }}
                      className="flex-1 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 hover:shadow-md"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dept.id) {
                          handleDelete(dept.id);
                        }
                      }}
                      className="flex-1 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 hover:shadow-md"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <DepartmentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={selected ? handleUpdate : handleAdd}
          department={selected}
        />
        {saving && (
          <div className="fixed bottom-2 right-2 bg-indigo-600 text-white px-5 py-2 rounded shadow z-50">
            Saving...
          </div>
        )}
      </div>
    </div>
  );
}
