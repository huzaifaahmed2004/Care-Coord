import { useState } from 'react';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export default function MigrateLabTests() {
  const [status, setStatus] = useState<string>('');
  const [migrated, setMigrated] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleMigration = async () => {
    setLoading(true);
    setError(null);
    setStatus('Starting migration...');
    
    try {
      // Get all tests from the old collection
      const labTestsCollection = collection(db, 'labTests');
      const labTestsSnapshot = await getDocs(labTestsCollection);
      
      if (labTestsSnapshot.empty) {
        setStatus('No tests found in the old collection.');
        setLoading(false);
        return;
      }
      
      setStatus(`Found ${labTestsSnapshot.size} tests to migrate.`);
      let migratedCount = 0;
      
      // Migrate each test to the new collection
      for (const doc of labTestsSnapshot.docs) {
        const testData = doc.data();
        
        // Add to the new collection
        await addDoc(collection(db, 'scheduledLabTests'), {
          ...testData,
          // Ensure these fields exist for compatibility with LabOperatorPage
          status: testData.status || 'pending',
          updatedAt: testData.updatedAt ? testData.updatedAt : Timestamp.now(),
          scheduledDate: testData.date ? new Date(testData.date) : new Date(),
          testName: testData.tests && testData.tests.length > 0 ? testData.tests[0].name : 'Unknown Test'
        });
        
        migratedCount++;
        setMigrated(migratedCount);
        setStatus(`Migrated ${migratedCount} of ${labTestsSnapshot.size} tests.`);
      }
      
      setStatus(`Migration complete. ${migratedCount} tests migrated successfully.`);
    } catch (err) {
      console.error('Error during migration:', err);
      setError('An error occurred during migration. See console for details.');
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Lab Tests Migration Tool</h2>
      <p className="text-gray-600 mb-6">
        This tool will migrate tests from the old 'labTests' collection to the new 'scheduledLabTests' collection.
      </p>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {status && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p className="text-blue-700">{status}</p>
        </div>
      )}
      
      <button
        onClick={handleMigration}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-md text-white font-medium ${
          loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
        } transition-colors`}
      >
        {loading ? 'Migrating...' : 'Start Migration'}
      </button>
      
      {migrated > 0 && (
        <div className="mt-4 text-center">
          <p className="text-green-600 font-medium">
            {migrated} tests migrated successfully
          </p>
        </div>
      )}
    </div>
  );
}
