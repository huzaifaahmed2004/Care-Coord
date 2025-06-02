import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { updateDoctorPassword } from './custom-auth';

interface PasswordResetRequest {
  id: string;
  type: string;
  doctorEmail: string;
  newPassword?: string;
  status: string;
  createdAt: string;
  read: boolean;
  message?: string;
}

const AdminPasswordManager: React.FC = () => {
  const [passwordRequests, setPasswordRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Subscribe to password reset notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('type', 'in', ['password_reset', 'admin_password_change']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PasswordResetRequest));
      
      setPasswordRequests(requests);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleApproveRequest = async (request: PasswordResetRequest) => {
    setProcessing(true);
    try {
      console.log('Processing password reset request for:', request.doctorEmail);
      
      // Find the doctor in the database
      const doctorsQuery = query(
        collection(db, 'doctors'),
        where('email', '==', request.doctorEmail)
      );
      const querySnapshot = await getDocs(doctorsQuery);
      
      if (querySnapshot.empty) {
        throw new Error(`Doctor with email ${request.doctorEmail} not found`);
      }
      
      const doctorDoc = querySnapshot.docs[0];
      const doctorId = doctorDoc.id;
      
      console.log('Found doctor with ID:', doctorId);
      
      // Generate a new secure password if one wasn't provided
      const newPassword = request.newPassword || generateSecurePassword();
      console.log('Using password:', newPassword ? '(provided in request)' : '(newly generated)');
      
      // Update the doctor's password using our custom auth system
      console.log('Updating password for doctor ID:', doctorId);
      const passwordUpdateResult = await updateDoctorPassword(doctorId, newPassword);
      
      if (!passwordUpdateResult.success) {
        throw new Error(passwordUpdateResult.error || 'Failed to update password');
      }
      
      console.log('Password updated successfully');
      
      // Update the notification status
      const notificationRef = doc(db, 'notifications', request.id);
      await updateDoc(notificationRef, {
        status: 'approved',
        read: true,
        processedAt: new Date().toISOString(),
        newPassword: newPassword // Store the new password in the notification for reference
      });
      
      // Add a confirmation message for the admin
      await addDoc(collection(db, 'notifications'), {
        type: 'password_reset_confirmation',
        doctorEmail: request.doctorEmail,
        status: 'completed',
        createdAt: new Date().toISOString(),
        read: false,
        message: `Password for ${request.doctorEmail} has been reset successfully to: ${newPassword}`
      });
      
      console.log(`Password for ${request.doctorEmail} has been reset successfully to: ${newPassword}`);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error processing password reset:', error);
      console.error('Failed to process password reset request: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };
  
  // Generate a secure random password
  const generateSecurePassword = (): string => {
    const length = 10;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  };

  const handleRejectRequest = async (request: PasswordResetRequest) => {
    setProcessing(true);
    try {
      // Update the notification status
      const notificationRef = doc(db, 'notifications', request.id);
      await updateDoc(notificationRef, {
        status: 'rejected',
        read: true,
        processedAt: new Date().toISOString()
      });
      
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error rejecting password reset:', error);
      alert('Failed to reject password reset request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Password Management</h2>
      
      {passwordRequests.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No password reset requests found
        </div>
      ) : (
        <div className="space-y-4">
          {passwordRequests.map(request => (
            <div 
              key={request.id} 
              className={`border rounded-lg p-4 ${request.read ? 'bg-gray-50' : 'bg-blue-50'} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => setSelectedRequest(request)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {request.type === 'password_reset' ? 'Password Reset Request' : 'Admin Password Change'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Doctor: {request.doctorEmail}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(request.createdAt)}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">
              {selectedRequest.type === 'password_reset' ? 'Password Reset Request' : 'Admin Password Change'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Doctor Email</p>
                <p className="text-gray-900">{selectedRequest.doctorEmail}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">New Password</p>
                <p className="text-gray-900 font-mono bg-gray-100 p-2 rounded">
                  {selectedRequest.newPassword || 'Not specified'}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Requested At</p>
                <p className="text-gray-900">{formatDate(selectedRequest.createdAt)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className={`${
                  selectedRequest.status === 'pending' ? 'text-yellow-600' :
                  selectedRequest.status === 'approved' ? 'text-green-600' :
                  'text-red-600'
                }`}>
                  {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                </p>
              </div>
              
              {selectedRequest.message && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Message</p>
                  <p className="text-gray-900">{selectedRequest.message}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleRejectRequest(selectedRequest)}
                    disabled={processing}
                    className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                  >
                    {processing ? 'Processing...' : 'Reject'}
                  </button>
                  
                  <button
                    onClick={() => handleApproveRequest(selectedRequest)}
                    disabled={processing}
                    className="px-4 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-700"
                  >
                    {processing ? 'Processing...' : 'Approve'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPasswordManager;
