import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { updateDoctorPassword, verifyPassword } from './custom-auth';

/**
 * This script tests the password update functionality in the custom authentication system.
 * It finds a doctor by email, updates their password, and then verifies the new password.
 */

export async function testPasswordUpdate(doctorEmail: string, newPassword: string) {
  console.log('=== Testing Password Update ===');
  console.log(`Looking for doctor with email: ${doctorEmail}`);
  
  try {
    // Find the doctor by email
    const doctorsQuery = query(
      collection(db, 'doctors'),
      where('email', '==', doctorEmail)
    );
    
    const querySnapshot = await getDocs(doctorsQuery);
    
    if (querySnapshot.empty) {
      console.error('No doctor found with that email');
      return false;
    }
    
    const doctorDoc = querySnapshot.docs[0];
    const doctorId = doctorDoc.id;
    const doctorData = doctorDoc.data();
    
    console.log(`Found doctor: ${doctorData.name} (ID: ${doctorId})`);
    
    // Update the password
    console.log('Updating password...');
    const updateResult = await updateDoctorPassword(doctorId, newPassword);
    
    if (!updateResult.success) {
      console.error('Password update failed:', updateResult.error);
      return false;
    }
    
    console.log('Password updated successfully!');
    
    // Verify the new password works
    console.log('Fetching updated doctor data to verify password...');
    const updatedDoctorsQuery = query(
      collection(db, 'doctors'),
      where('email', '==', doctorEmail)
    );
    
    const updatedQuerySnapshot = await getDocs(updatedDoctorsQuery);
    
    if (updatedQuerySnapshot.empty) {
      console.error('Could not find doctor after update');
      return false;
    }
    
    const updatedDoctorData = updatedQuerySnapshot.docs[0].data();
    
    if (!updatedDoctorData.hashedPassword) {
      console.error('No hashed password found in doctor document');
      return false;
    }
    
    console.log('Verifying new password...');
    const passwordVerified = await verifyPassword(newPassword, updatedDoctorData.hashedPassword);
    
    if (passwordVerified) {
      console.log('✅ Password verification successful!');
      return true;
    } else {
      console.error('❌ Password verification failed!');
      return false;
    }
    
  } catch (error) {
    console.error('Error during password update test:', error);
    return false;
  }
}

// Example usage:
// testPasswordUpdate('doctor@example.com', 'newpassword123');
