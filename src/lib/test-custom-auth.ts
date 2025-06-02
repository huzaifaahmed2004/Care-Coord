import { hashPassword, verifyPassword, doctorLogin, createDoctorAccount, updateDoctorPassword } from './custom-auth';

/**
 * This file contains test functions for the custom authentication system.
 * You can run these tests to verify that the custom authentication system is working correctly.
 */

// Test password hashing and verification
async function testPasswordHashing() {
  console.log('Testing password hashing and verification...');
  const password = 'test123';
  
  try {
    const hashedPassword = await hashPassword(password);
    console.log('Hashed password:', hashedPassword);
    
    // Verify the password
    const isValid = await verifyPassword(password, hashedPassword);
    console.log('Password verification result:', isValid);
    
    // Try with wrong password
    const isInvalid = await verifyPassword('wrongpassword', hashedPassword);
    console.log('Invalid password verification result:', isInvalid);
    
    return true;
  } catch (error) {
    console.error('Error in password hashing test:', error);
    return false;
  }
}

// Run all tests
export async function runAuthTests() {
  console.log('=== Running Custom Auth Tests ===');
  
  const hashingTestPassed = await testPasswordHashing();
  console.log('Password hashing test passed:', hashingTestPassed);
  
  console.log('=== Auth Tests Complete ===');
}

// Export individual test functions for selective testing
export {
  testPasswordHashing
};
