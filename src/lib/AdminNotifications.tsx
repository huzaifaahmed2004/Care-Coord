import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from './firebase';

interface Notification {
  id: string;
  type: string;
  doctorEmail?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  subject?: string;
  newPassword?: string;
  status: string;
  createdAt: string;
  read: boolean;
  message?: string;
}

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Subscribe to notifications collection with real-time updates
    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.read).length);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const promises = notifications
        .filter(notification => !notification.read)
        .map(notification => {
          const notificationRef = doc(db, 'notifications', notification.id);
          return updateDoc(notificationRef, { read: true });
        });
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'password_reset':
      case 'admin_password_change':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        );
      case 'password_reset_confirmation':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'contact_message':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        );
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'password_reset':
        return `Doctor with email ${notification.doctorEmail} requested a password reset`;
      case 'admin_password_change':
        return `Password change for doctor ${notification.doctorEmail}`;
      case 'password_reset_confirmation':
        return notification.message || 'Password reset confirmation';
      case 'contact_message':
        return `Contact message from ${notification.userName} (${notification.userEmail})`;
      default:
        return 'New notification';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-2 px-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-4 px-4 text-center text-gray-500">
                <svg className="animate-spin h-5 w-5 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-4 px-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.type === 'password_reset' || notification.type === 'admin_password_change' || notification.type === 'contact_message') {
                      setSelectedNotification(notification);
                    }
                  }}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                        {getNotificationMessage(notification)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="ml-3 flex-shrink-0">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="py-2 px-4 border-t border-gray-100 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Password Reset Modal */}
      {selectedNotification && (selectedNotification.type === 'password_reset' || selectedNotification.type === 'admin_password_change' || selectedNotification.type === 'contact_message') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">
              {selectedNotification.type === 'password_reset' ? 'Password Reset Request' : 
               selectedNotification.type === 'admin_password_change' ? 'Admin Password Change' : 
               'Contact Form Message'}
            </h3>
            
            <div className="space-y-4">
              {selectedNotification.type === 'contact_message' ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-500">From</p>
                    <p className="text-gray-900">{selectedNotification.userName}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-gray-900">{selectedNotification.userEmail}</p>
                  </div>
                  
                  {selectedNotification.userPhone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-gray-900">{selectedNotification.userPhone}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Subject</p>
                    <p className="text-gray-900">{selectedNotification.subject || 'No subject'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Message</p>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-100">{selectedNotification.message}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Received At</p>
                    <p className="text-gray-900">{formatDate(selectedNotification.createdAt)}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Doctor Email</p>
                    <p className="text-gray-900">{selectedNotification.doctorEmail}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">New Password</p>
                    <p className="text-gray-900 font-mono bg-gray-100 p-2 rounded">
                      {selectedNotification.newPassword || 'Not specified'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Requested At</p>
                    <p className="text-gray-900">{formatDate(selectedNotification.createdAt)}</p>
                  </div>
                </>  
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className={`${
                  selectedNotification.status === 'pending' ? 'text-yellow-600' :
                  selectedNotification.status === 'approved' ? 'text-green-600' :
                  'text-red-600'
                }`}>
                  {selectedNotification.status.charAt(0).toUpperCase() + selectedNotification.status.slice(1)}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              
              {selectedNotification.type === 'contact_message' ? (
                <button
                  onClick={() => {
                    // Open default email client with pre-filled email
                    const subject = encodeURIComponent(`Re: ${selectedNotification.subject || 'Your message to CareCoord'}`);
                    const body = encodeURIComponent(`Dear ${selectedNotification.userName},\n\nThank you for contacting CareCoord. We received your message:\n\n"${selectedNotification.message}"\n\n`);
                    window.location.href = `mailto:${selectedNotification.userEmail}?subject=${subject}&body=${body}`;
                    
                    // Mark as responded
                    (async () => {
                      try {
                        const notificationRef = doc(db, 'notifications', selectedNotification.id);
                        await updateDoc(notificationRef, {
                          status: 'responded',
                          read: true,
                          processedAt: new Date().toISOString()
                        });
                      } catch (error) {
                        console.error('Error updating notification status:', error);
                      }
                    })();
                  }}
                  className="px-4 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-700"
                >
                  Send Email Response
                </button>
              ) : selectedNotification.status === 'pending' && (
                <>
                  <button
                    onClick={async () => {
                      setProcessing(true);
                      try {
                        // Update the notification status
                        const notificationRef = doc(db, 'notifications', selectedNotification.id);
                        await updateDoc(notificationRef, {
                          status: 'rejected',
                          read: true,
                          processedAt: new Date().toISOString()
                        });
                        
                        setSelectedNotification(null);
                        setIsOpen(false);
                      } catch (error) {
                        console.error('Error rejecting password reset:', error);
                        alert('Failed to reject password reset request. Please try again.');
                      } finally {
                        setProcessing(false);
                      }
                    }}
                    disabled={processing}
                    className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                  >
                    {processing ? 'Processing...' : 'Reject'}
                  </button>
                  
                  <button
                    onClick={async () => {
                      setProcessing(true);
                      try {
                        // Find the doctor in the database
                        const doctorsQuery = query(
                          collection(db, 'doctors'),
                          where('email', '==', selectedNotification.doctorEmail)
                        );
                        const querySnapshot = await getDocs(doctorsQuery);
                        
                        if (!querySnapshot.empty) {
                          // Update the notification status
                          const notificationRef = doc(db, 'notifications', selectedNotification.id);
                          await updateDoc(notificationRef, {
                            status: 'approved',
                            read: true,
                            processedAt: new Date().toISOString()
                          });
                          
                          // Add a confirmation message for the admin
                          await addDoc(collection(db, 'notifications'), {
                            type: 'password_reset_confirmation',
                            doctorEmail: selectedNotification.doctorEmail,
                            status: 'completed',
                            createdAt: new Date().toISOString(),
                            read: false,
                            message: `Password for ${selectedNotification.doctorEmail} has been reset successfully.`
                          });
                          
                          setSelectedNotification(null);
                          setIsOpen(false);
                        } else {
                          throw new Error('Doctor not found');
                        }
                      } catch (error) {
                        console.error('Error processing password reset:', error);
                        alert('Failed to process password reset request. Please try again.');
                      } finally {
                        setProcessing(false);
                      }
                    }}
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

export default AdminNotifications;
