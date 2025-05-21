import { useParams } from 'react-router-dom';

export default function PatientDetails() {
  const { id } = useParams();
  return (
    <div className="max-w-3xl mx-auto pt-10 px-4">
      <h1 className="text-3xl font-bold text-[#004B8D] mb-6">Patient Details</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-400">Patient ID: {id}</div>
        <div className="py-12 text-center text-gray-500">Details coming soon.</div>
      </div>
    </div>
  );
}
