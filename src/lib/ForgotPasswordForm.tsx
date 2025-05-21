import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Link } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';

export default function ForgotPasswordForm() {
  const auth = useAuth();
  const resetPassword = auth?.resetPassword ?? (() => Promise.resolve());
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage('Password reset email sent!');
      setEmail('');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof FirebaseError
          ? err.message
          : 'Failed to send password reset email';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-20 px-4">
      <h2 className="text-3xl font-bold mb-4 text-[#004B8D] text-center">Forgot Password?</h2>
      <form className="space-y-4 bg-white rounded-xl shadow p-6" onSubmit={handleSubmit}>
        <div>
          <label className="block mb-1 font-medium text-gray-700">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>
        {error && <div className="text-red-600 text-center text-sm">{error}</div>}
        {message && <div className="text-green-600 text-center text-sm">{message}</div>}
        <button type="submit" className="w-full bg-[#004B8D] text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition" disabled={loading}>
          {loading ? 'Sending...' : 'Send password reset link'}
        </button>
        <div className="flex justify-between text-sm mt-2">
          <Link to="/login" className="text-gray-600 hover:underline">Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}
