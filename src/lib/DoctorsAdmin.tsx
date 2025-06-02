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
// Firebase Storage imports removed as we're using Base64 encoding instead
import { useEffect, useState, useRef } from "react";
import { db } from "./firebase";
import { uploadFileToS3, convertImageToBase64 } from './imageUtils';
import { createDoctorAccount, updateDoctorPassword } from './custom-auth';

// --- Doctor Images ---
// Higher quality doctor avatars with professional appearance
const defaultAvatar = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80";

// Fallback professional doctor images
const fallbackAvatars = [
  // Male doctors
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80",
  // Female doctors
  "https://images.unsplash.com/photo-1594824476967-48c8b964273f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80"
];

interface Department {
  id?: string;
  name: string;
  description?: string;
  location?: string;
  headDoctor?: string;
  contactEmail?: string;
  contactPhone?: string;
  imgUrl?: string;
}

interface Doctor {
  id?: string;
  name: string;
  gender: string;
  age: string;
  department: string;
  departmentId?: string; // Reference to the department ID
  speciality: string;
  email: string;
  password?: string; // Make password optional for display purposes
  imgUrl?: string;
  feePercentage?: number;
}

// --- Responsive modal ---
function DoctorModal({
  open,
  onClose,
  onSave,
  doctor,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (doctor: Doctor, email: string, password: string) => void;
  doctor?: Doctor | null;
}) {
  const [form, setForm] = useState<Doctor>(
    doctor || {
      name: "",
      gender: "",
      age: "",
      department: "",
      departmentId: "",
      speciality: "",
      email: "",
      imgUrl: "",
      feePercentage: 10,
    }
  );
  const [email, setEmail] = useState(doctor?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch departments for dropdown
  useEffect(() => {
    async function fetchDepartments() {
      if (!open) return;

      setLoadingDepartments(true);
      try {
        const snap = await getDocs(collection(db, "departments"));
        const deptData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Department));
        setDepartments(deptData);
      } catch (e) {
        console.error('Error fetching departments:', e);
      } finally {
        setLoadingDepartments(false);
      }
    }
    fetchDepartments();
  }, [open]);

  // Reset form function to ensure clean state
  const resetForm = () => {
    setForm({
      name: "",
      gender: "",
      age: "",
      department: "",
      departmentId: "",
      speciality: "",
      email: "",
      imgUrl: "",
      feePercentage: 10,
    });
    setEmail("");
    setPassword("");
    setImagePreview(null);
    setImageFile(null);
    setSaving(false);
  };

  // Reset state when modal is opened or doctor changes
  useEffect(() => {
    if (!open) {
      // When modal closes, don't reset yet to avoid flashing
      return;
    }
    
    if (doctor) {
      setForm(doctor);
      setEmail(doctor.email);
      setImagePreview(doctor.imgUrl || null);
    } else {
      resetForm();
    }
  }, [doctor, open]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
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

      // Generate a deterministic avatar based on the doctor's name or email
      const seed = form.name || form.email || Math.random().toString();
      const seedIndex = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const avatarIndex = seedIndex % fallbackAvatars.length;
      const fallbackAvatar = fallbackAvatars[avatarIndex];

      console.log("Using fallback avatar URL:", fallbackAvatar);
      return fallbackAvatar;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Validate form data
      if (!form.name || !form.gender || !form.age || !form.departmentId || !form.speciality) {
        throw new Error('Please fill out all required fields');
      }
      
      if (!doctor && (!email || !password)) {
        throw new Error('Email and password are required for new doctors');
      }
      
      // Process image if needed
      let finalImageUrl = form.imgUrl;
      if (imageFile) {
        try {
          finalImageUrl = await uploadImage();
        } catch (error) {
          console.error('Image upload failed:', error);
          throw new Error('Failed to upload image. Please try again.');
        }
      }
      
      // Create final form data with image URL
      const finalForm: Doctor = {
        ...form,
        imgUrl: finalImageUrl || defaultAvatar
      };
      
      // Call onSave with the form data
      onSave(finalForm, email, password);
    } catch (error) {
      console.error('Form submission error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
      setSaving(false);
    }
  }

  function triggerFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-40">
      <div className="bg-white max-w-md w-full rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {doctor ? "Update" : "Add"} Doctor
        </h2>

        {/* Image Upload Preview */}
        <div className="mb-6 flex flex-col items-center">
          <div
            className="w-24 h-24 rounded-full bg-gray-200 mb-2 overflow-hidden relative cursor-pointer"
            onClick={triggerFileInput}
          >
            {(imagePreview || form.imgUrl) ? (
              <img
                src={imagePreview || form.imgUrl || defaultAvatar}
                alt="Doctor preview"
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
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 text-sm font-medium">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded p-2"
              placeholder="doctor@example.com"
              disabled={doctor !== null} // Disable email field for existing doctors
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!doctor} // Only required for new doctors
                className="w-full border rounded p-2 pr-10"
                placeholder={doctor ? "Change password (optional)" : "Password"}
                minLength={6}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
            {doctor && (
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to keep current password
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="block mb-1 text-sm font-medium">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                required
                className="w-full border rounded p-2"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="w-1/2">
              <label className="block mb-1 text-sm font-medium">Age</label>
              <input
                name="age"
                value={form.age}
                onChange={handleChange}
                type="number"
                min={20}
                max={100}
                required
                className="w-full border rounded p-2"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="block mb-1 text-sm font-medium">
                Department
              </label>
              <select
                name="departmentId"
                value={form.departmentId || ''}
                onChange={(e) => {
                  const selectedDept = departments.find(d => d.id === e.target.value);
                  setForm(prev => ({
                    ...prev,
                    departmentId: e.target.value,
                    department: selectedDept?.name || ''
                  }));
                }}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a department</option>
                {loadingDepartments ? (
                  <option disabled>Loading departments...</option>
                ) : (
                  departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="w-1/2">
              <label className="block mb-1 text-sm font-medium">
                Speciality
              </label>
              <input
                name="speciality"
                value={form.speciality}
                onChange={handleChange}
                required
                className="w-full border rounded p-2"
              />
            </div>
          </div>
          
          <div>
            <label className="block mb-1 text-sm font-medium">Fee Percentage (%)</label>
            <input
              name="feePercentage"
              value={form.feePercentage}
              onChange={handleChange}
              type="number"
              min={0}
              max={100}
              className="w-full border rounded p-2"
            />
          </div>

          <div className="flex justify-end mt-6 space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              className="bg-[#427DFF] text-white px-4 py-2 rounded hover:bg-[#285ccc]"
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <>{doctor ? "Update" : "Add"} Doctor</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DoctorsAdmin() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  // For future sidebar details
  const [showDetail, setShowDetail] = useState<Doctor | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [specialties, setSpecialties] = useState<string[]>([]);

  // Load doctors and departments
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch doctors
        const doctorsSnap = await getDocs(collection(db, "doctors"));
        const doctorsList = doctorsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor));
        setDoctors(doctorsList);
        setFilteredDoctors(doctorsList);
        
        // Extract unique specialties
        const uniqueSpecialties = Array.from(new Set(doctorsList.map(doc => doc.speciality)));
        setSpecialties(uniqueSpecialties);
        
        // Fetch departments
        const departmentsSnap = await getDocs(collection(db, "departments"));
        setDepartments(
          departmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Department))
        );
      } catch (e) {
        console.error('Error fetching data:', e);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  
  // Filter doctors based on search term and filters
  useEffect(() => {
    if (!doctors.length) return;
    
    let filtered = [...doctors];
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(term) || 
        doc.speciality.toLowerCase().includes(term) || 
        doc.email.toLowerCase().includes(term)
      );
    }
    
    // Apply department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(doc => doc.departmentId === selectedDepartment);
    }
    
    // Apply specialty filter
    if (specialtyFilter !== 'all') {
      filtered = filtered.filter(doc => doc.speciality === specialtyFilter);
    }
    
    setFilteredDoctors(filtered);
  }, [doctors, searchTerm, selectedDepartment, specialtyFilter]);

  // Add new doctor (using custom auth system)
  async function handleAdd(docData: Doctor, email: string, password: string) {
    console.log("handleAdd called with:", docData);
    setSaving(true);
    setError(null);
    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      console.log("Creating doctor account with email:", email);
      
      // Create doctor account using custom auth system
      const result = await createDoctorAccount(
        {
          ...docData,
          email,
          departmentId: docData.departmentId,
          createdAt: new Date().toISOString(),
        },
        password
      );
      
      if (!result.success || !result.doctorId) {
        throw new Error(result.error || 'Failed to create doctor account');
      }
      
      console.log("Doctor added to Firestore:", result.doctorId);

      // Add to local state
      const newDoctor = {
        id: result.doctorId,
        ...docData,
        email,
      };
      setDoctors([...doctors, newDoctor]);
      setModalOpen(false);
    } catch (e: unknown) {
      console.error("Error in handleAdd:", e);
      const errorMessage =
        e instanceof FirebaseError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to add doctor.';
      setError(errorMessage);
    }
    setSaving(false);
  }

  // Update existing doctor
  async function handleUpdate(id: string, doctorData: Doctor, email: string, password: string) {
    setSaving(true);
    setError(null);
    try {
      console.log("Updating doctor with ID:", id);
      console.log("Password provided:", password ? "Yes (length: " + password.length + ")" : "No");
      
      // Update the document in Firestore
      const docRef = doc(collection(db, "doctors"), id);
      
      // Remove password from data to be stored
      const { password: _, ...dataToUpdate } = doctorData;
      
      await updateDoc(docRef, dataToUpdate);
      console.log("Basic doctor info updated successfully");
      
      // If password is provided, update it using the custom auth system
      if (password && password.trim() !== '') {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long");
        }
        
        console.log("Updating password for doctor ID:", id);
        // Update doctor password using custom auth system
        const result = await updateDoctorPassword(id, password);
        console.log("Password update result:", result);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update password');
        }
        
        console.log("Doctor password updated successfully");
        
        // Log success but don't show alert
        console.log("Doctor information and password updated successfully");
      } else {
        // Log success but don't show alert
        console.log("Doctor information updated successfully");
      }

      // Update local state
      setDoctors(prev => prev.map(d =>
        d.id === id ? { ...d, ...doctorData } : d
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
      console.error("Error: " + errorMessage);
    }
    setSaving(false);
  }

  // Delete doctor
  async function handleDelete(docId: string) {
    if (!confirm("Are you sure you want to delete this doctor?")) return;

    setSaving(true);
    setError(null);
    try {
      // Delete the document from Firestore
      await deleteDoc(doc(collection(db, "doctors"), docId));

      // Update the local state
      setDoctors((doctors) => doctors.filter((d) => d.id !== docId));
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 -mx-4 px-6 py-8 mb-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Doctors Management
          </h1>
          <p className="text-blue-100 text-sm md:text-base">Manage your medical staff with ease</p>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto">
        {/* Search and Filter Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="col-span-1 md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Doctors</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="search"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Search by name, specialty, or email"
                />
              </div>
            </div>
            
            {/* Department Filter */}
            <div>
              <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                id="department-filter"
                name="department-filter"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Specialty Filter */}
            <div>
              <label htmlFor="specialty-filter" className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
              <select
                id="specialty-filter"
                name="specialty-filter"
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Specialties</option>
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">
              {filteredDoctors.length} {filteredDoctors.length === 1 ? 'Doctor' : 'Doctors'} {filteredDoctors.length !== doctors.length && `(filtered from ${doctors.length})`}
            </span>
          </div>
          <button
            onClick={() => {
              // First set selected to null to ensure we're not using previous doctor data
              setSelected(null);
              // Then open the modal
              setTimeout(() => setModalOpen(true), 0);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 transition-colors duration-200 flex items-center gap-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Doctor
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
              <p className="text-gray-500">Loading doctors...</p>
            </div>
          </div>
        )}

        {/* Empty State - No doctors at all */}
        {!loading && doctors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-1">No doctors found</h3>
            <p className="text-gray-500 mb-4 text-center">Start by adding your first doctor to the system</p>
            <button
              onClick={() => {
                setSelected(null);
                setModalOpen(true);
              }}
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-5 py-2.5 transition-colors duration-200 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Your First Doctor
            </button>
          </div>
        )}
        
        {/* Empty State - No doctors after filtering */}
        {!loading && doctors.length > 0 && filteredDoctors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-1">No matching doctors found</h3>
            <p className="text-gray-500 mb-4 text-center">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setSpecialtyFilter('all');
              }}
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-5 py-2.5 transition-colors duration-200 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Reset Filters
            </button>
          </div>
        )}

        {/* Card Grid Layout */}
        {!loading && filteredDoctors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 overflow-hidden max-w-md w-full mx-auto"
              >
                {/* Card Header with blue background and dot pattern */}
                <div className="h-32 w-full bg-blue-600 relative ">
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="grid grid-cols-12 gap-1 h-full w-full">
                      {Array(48).fill(0).map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-white"></div>
                      ))}
                    </div>
                  </div>

                  {/* Doctor avatar - overlapping the header */}
                  <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 ">
                    <div className="w-36 h-36 rounded-full bg-white border-4 border-white shadow-md overflow-hidden">
                      <img
                        src={doc.imgUrl || (doc.gender === "Female" ?
                          fallbackAvatars[Math.floor(Math.random() * 3) + 3] :
                          fallbackAvatars[Math.floor(Math.random() * 3)])}
                        alt={doc.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="px-5 pt-10 pb-5 text-center">
                  {/* Doctor Name */}
                  <h3 className="font-bold text-lg text-blue-900">{doc.name}</h3>

                  {/* Doctor Specialty */}
                  <p className="text-gray-600 text-sm mb-2">{doc.speciality}</p>

                  {/* Department Badge */}
                  <div className="mb-4">
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {doc.department}
                    </span>
                  </div>

                  {/* Doctor Info */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Age: {doc.age}</span>
                    </div>
                    <div className="flex items-center justify-end">
                      <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{doc.gender}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-center truncate mt-1">
                      <svg className="w-4 h-4 mr-1 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{doc.email}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => {
                        setSelected(doc);
                        setModalOpen(true);
                      }}
                      className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition-colors duration-200 flex items-center justify-center"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        if (doc.id) {
                          handleDelete(doc.id);
                        }
                      }}
                      className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-medium transition-colors duration-200 flex items-center justify-center"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


        <DoctorModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            // After modal is closed, reset selected to ensure clean state for next open
            setTimeout(() => setSelected(null), 300);
          }}
          onSave={(doctor, email, password) => {
            if (selected && selected.id) {
              handleUpdate(selected.id, doctor, email, password);
            } else {
              handleAdd(doctor, email, password);
            }
          }}
          doctor={selected}
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

/**
 * --- Firebase Firestore collection setup ---
 *
 * 1. Ensure Firestore is enabled for your Firebase project.
 * 2. In the Firestore console, create a collection named 'doctors'.
 * 3. Each document will have at least:
 *    { name, gender, age, department, speciality, email, authUid (added automatically) }
 * 4. When adding a new doctor, a Firebase Auth user is also created (email/password only).
 * 5. This UI is fully responsive and all actions save to Firestore.
 *
 * --- AWS S3 Setup for Image Upload ---
 * 1. Create an S3 bucket in the AWS Console.
 * 2. Create an IAM user with permissions to put objects in the bucket.
 * 3. Set the bucket's CORS policy to allow uploads from your app's origin (e.g., http://localhost:5173).
 * 4. Add AWS credentials (Access Key ID, Secret Access Key, Region, Bucket Name) to your project's .env file.
 * 5. Ensure the s3Upload utility function is correctly implemented and imported.
 * 6. Note: Deleting images from S3 upon doctor deletion is not implemented in this code.
 */
