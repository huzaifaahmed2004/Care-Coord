import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "./firebase";

interface Patient {
  id: string;
  name: string;
  dob: string;
}

export default function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "patients"), orderBy("name"));
    getDocs(q)
      .then((snapshot) =>
        setPatients(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Patient, "id">),
          })),
        ),
      )
      .catch((e) => setError(e.message || "Failed to load patients"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto pt-10 pb-24 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-[#004B8D]">Patients</h1>
        <Link to="/patients/new">
          <button className="bg-[#004B8D] text-white rounded px-6 py-2 font-semibold hover:bg-blue-700 transition">
            Add Patient
          </button>
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-12">{error}</div>
        ) : patients.length === 0 ? (
          <div className="text-gray-500 text-center py-12">
            No patients found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">Date of Birth</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id} className="border-t hover:bg-blue-50/50">
                  <td className="py-2 px-2">{patient.name}</td>
                  <td className="py-2 px-2">{patient.dob}</td>
                  <td className="py-2 px-2 text-right">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="text-[#004B8D] hover:underline font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
