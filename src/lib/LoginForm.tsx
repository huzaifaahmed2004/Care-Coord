import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';

export default function LoginForm() {
  const { login, loginWithGoogle, user, isNewUser } = useAuth() ?? {};
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get redirect path from location state, default to home
  const from = location.state?.from || '/';
  
  // Redirect to patient registration form if user is authenticated but has no profile
  useEffect(() => {
    if (user && isNewUser) {
      navigate('/register', { state: { from } });
    } else if (user && !isNewUser) {
      navigate(from);
    }
  }, [user, isNewUser, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login?.(email, password);
      // Navigation will be handled by the useEffect hook
    } catch (err: unknown) {
      const errorMessage = err instanceof FirebaseError ? (err as FirebaseError).message : 'Failed to log in.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle?.();
      // Navigation will be handled by the useEffect hook based on isNewUser
    } catch (err: unknown) {
      const errorMessage = err instanceof FirebaseError ? (err as FirebaseError).message : 'Google login failed.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-[#F6F8FB] px-2 sm:px-4 py-2 sm:py-10 w-full">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 max-w-md w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#14396D] mb-4 sm:mb-6 text-center">Sign In to CareCoord</h1>
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
          <button
            type="submit"
            className="bg-[#3373FF] hover:bg-[#285ccc] text-white font-semibold py-2 px-3 sm:py-2 sm:px-4 rounded w-full mt-1 sm:mt-2 text-sm sm:text-base"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="my-3 sm:my-4 text-center text-xs sm:text-sm text-gray-500">OR</div>
        <button
          className="w-full bg-white text-[#14396D] border hover:bg-[#F6F8FB] font-semibold py-2 px-3 sm:px-4 rounded flex items-center justify-center gap-2 mb-2 text-sm sm:text-base"
          onClick={handleGoogleLogin} disabled={loading}
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png" className="w-5 h-5" alt="Google logo" />
          Continue with Google
        </button>
        <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm">
          Don&apos;t have an account?{' '}
          <button onClick={() => navigate('/register')} className="text-[#FF3D71] hover:underline font-semibold">Sign up</button>
        </div>
      </div>
    </div>
  );
}
