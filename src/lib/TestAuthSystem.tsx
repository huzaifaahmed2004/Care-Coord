import React, { useState } from 'react';
import { testPasswordUpdate } from './test-password-update';
import { doctorLogin } from './custom-auth';

/**
 * A simple component to test the custom authentication system
 */
const TestAuthSystem: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('Testing login...');
    
    try {
      const loginResult = await doctorLogin(email, password);
      
      if (loginResult.success) {
        setResult(`✅ Login successful! Doctor ID: ${loginResult.doctorId}`);
      } else {
        setResult(`❌ Login failed: ${loginResult.error}`);
      }
    } catch (error) {
      setResult(`❌ Error during login: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('Testing password update...');
    
    try {
      const updateResult = await testPasswordUpdate(email, newPassword);
      
      if (updateResult) {
        setResult(`✅ Password update successful!`);
      } else {
        setResult(`❌ Password update failed.`);
      }
    } catch (error) {
      setResult(`❌ Error during password update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg mt-10">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">Custom Auth System Tester</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">Test Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Login'}
          </button>
        </form>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">Test Password Update</h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Doctor Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded p-2"
              required
              minLength={6}
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Password Update'}
          </button>
        </form>
      </div>
      
      {result && (
        <div className={`p-4 rounded ${result.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
};

export default TestAuthSystem;
