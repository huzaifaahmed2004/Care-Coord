import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PatientForm() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/patients');
    }, 900);
  }

  return (
    <div className="max-w-xl mx-auto pt-10 px-4">
      <h1 className="text-2xl font-bold text-[#004B8D] mb-4">Add New Patient</h1>
      <form className="bg-white p-6 rounded-lg shadow space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block mb-1 font-medium">Full Name</label>
          <input className="w-full px-3 py-2 border border-gray-300 rounded" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1 font-medium">Date of Birth</label>
          <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded" value={dob} onChange={e => setDob(e.target.value)} required />
        </div>
        {/* More fields can be added here... */}
        <button type="submit" className="bg-[#004B8D] text-white font-semibold py-2 px-6 rounded hover:bg-blue-700 transition" disabled={loading}>
          {loading ? 'Saving...' : 'Save Patient'}
        </button>
      </form>
    </div>
  );
}
