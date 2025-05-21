import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';
import { FirebaseError } from 'firebase/app';

export default function RegisterForm() {
  const { register } = useAuth() ?? {};
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register?.(email, password);
      navigate('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof FirebaseError ? (err as FirebaseError).message : 'Registration failed.';
      setError(errorMessage);
    }
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof FirebaseError ? (err as FirebaseError).message : 'Google sign up failed.';
      setError(errorMessage);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-[#F6F8FB] px-2 sm:px-4 py-2 sm:py-10 w-full">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 max-w-md w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#14396D] mb-4 sm:mb-6 text-center">Create your CareCoord Account</h1>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div>
            <label className="block mb-1 font-medium text-sm">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 sm:px-4 sm:py-2 focus:outline-[#FF3D71]"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 sm:px-4 sm:py-2 focus:outline-[#FF3D71]"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">Confirm Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 sm:px-4 sm:py-2 focus:outline-[#FF3D71]"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-[#FF3D71] hover:bg-[#ff5996] text-white font-semibold py-2 px-3 sm:px-4 rounded w-full mt-1 sm:mt-2 text-sm sm:text-base"
            disabled={loading}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
        <div className="my-3 sm:my-4 text-center text-xs sm:text-sm text-gray-500">OR</div>
        <button
          className="w-full bg-white text-[#14396D] border hover:bg-[#F6F8FB] font-semibold py-2 px-3 sm:px-4 rounded flex items-center justify-center gap-2 mb-2 text-sm sm:text-base"
          onClick={handleGoogleSignup} disabled={loading}
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png" className="w-5 h-5" alt="Google logo" />
          Continue with Google
        </button>
        <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-[#3373FF] hover:underline font-semibold">Sign in</button>
        </div>
      </div>
    </div>
  );
}
