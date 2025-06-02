import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import * as bcryptjs from 'bcryptjs';

/**
 * Custom authentication system for doctors using Firestore instead of Firebase Auth
 */

// Hash a password using bcryptjs
export async function hashPassword(password: string): Promise<string> {
  try {
    // Generate a salt
    const salt = await bcryptjs.genSalt(10);
    // Hash the password with the salt
    const hashedPassword = await bcryptjs.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

// Verify a password against a hash
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcryptjs.compare(password, hashedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

// Doctor login function
export async function doctorLogin(email: string, password: string): Promise<{ success: boolean; doctorId?: string; error?: string }> {
  try {
    // Find doctor by email
    const doctorsRef = collection(db, 'doctors');
    const doctorsQuery = query(doctorsRef, where('email', '==', email));
    const querySnapshot = await getDocs(doctorsQuery);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    const doctorDoc = querySnapshot.docs[0];
    const doctorData = doctorDoc.data();
    
    // Check if the doctor has a hashed password
    if (!doctorData.hashedPassword) {
      return { success: false, error: 'Account setup incomplete. Please contact admin.' };
    }
    
    // Verify password
    const passwordMatch = await verifyPassword(password, doctorData.hashedPassword);
    
    if (!passwordMatch) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    // Return success with doctor ID
    return {
      success: true,
      doctorId: doctorDoc.id
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

// Create a doctor account with hashed password
export async function createDoctorAccount(doctorData: any, password: string): Promise<{ success: boolean; doctorId?: string; error?: string }> {
  try {
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Add to firestore with all info including hashed password
    const newDocRef = await addDoc(collection(db, 'doctors'), {
      ...doctorData,
      hashedPassword,
      createdAt: new Date().toISOString(),
    });
    
    return {
      success: true,
      doctorId: newDocRef.id
    };
  } catch (error) {
    console.error('Error creating doctor account:', error);
    return { success: false, error: 'Failed to create doctor account' };
  }
}

// Update doctor password
export async function updateDoctorPassword(doctorId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Attempting to update password for doctor ID: ${doctorId}`);
    
    // Verify the doctor exists
    const doctorRef = doc(db, 'doctors', doctorId);
    const doctorSnap = await getDoc(doctorRef);
    
    if (!doctorSnap.exists()) {
      console.error(`Doctor with ID ${doctorId} not found`);
      return { success: false, error: `Doctor with ID ${doctorId} not found` };
    }
    
    // Hash the new password
    console.log('Hashing new password...');
    const hashedPassword = await hashPassword(newPassword);
    console.log('Password hashed successfully');
    
    // Update the doctor document
    console.log('Updating doctor document with new hashed password...');
    await updateDoc(doctorRef, {
      hashedPassword,
      updatedAt: new Date().toISOString()
    });
    
    console.log('Password updated successfully for doctor ID:', doctorId);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating password:', errorMessage);
    return { success: false, error: `Failed to update password: ${errorMessage}` };
  }
}
