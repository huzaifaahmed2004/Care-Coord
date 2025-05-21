import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';

export default function LoginForm() {
  const { login, loginWithGoogle, resetPassword, user, isNewUser } = useAuth() ?? {};
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
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
    
    if (forgotPasswordMode) {
      try {
        await resetPassword?.(email);
        setResetEmailSent(true);
        setLoading(false);
      } catch (err: unknown) {
        const errorMessage = err instanceof FirebaseError ? (err as FirebaseError).message : 'Failed to send password reset email.';
        setError(errorMessage);
        setLoading(false);
      }
    } else {
      try {
        await login?.(email, password);
        // Navigation will be handled by the useEffect hook
      } catch (err: unknown) {
        const errorMessage = err instanceof FirebaseError ? (err as FirebaseError).message : 'Failed to log in.';
        setError(errorMessage);
        setLoading(false);
      }
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
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50 px-4 sm:px-6 py-4 sm:py-12 w-full">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-10 max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-[#3373FF] to-[#5D93FF] rounded-full p-2 mb-4 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Sign in to access your CareCoord account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block mb-1.5 font-medium text-gray-700 text-sm">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] outline-none transition-colors"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>
          
          {!forgotPasswordMode && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-gray-700 text-sm">Password</label>
                <button 
                  type="button" 
                  onClick={() => {
                    setForgotPasswordMode(true);
                    setError(null);
                    setResetEmailSent(false);
                  }} 
                  className="text-xs text-[#3373FF] hover:text-[#2860e0] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[#3373FF] focus:border-[#3373FF] outline-none transition-colors"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          )}
          
          {resetEmailSent ? (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md text-green-700 text-sm my-4">
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p>Password reset email sent! Please check your inbox and follow the instructions to reset your password.</p>
              </div>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full bg-[#3373FF] hover:bg-[#2860e0] text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-[#3373FF] focus:outline-none mt-2"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {forgotPasswordMode ? 'Sending...' : 'Signing in...'}
                </div>
              ) : (
                forgotPasswordMode ? 'Send Reset Link' : 'Sign In'
              )}
            </button>
          )}
        </form>
        
        {!forgotPasswordMode && (
          <>
            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-gray-200 w-full"></div>
              <div className="absolute bg-white px-4 text-sm text-gray-500">OR</div>
            </div>
            
            <button
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 border border-gray-300 rounded-lg flex items-center justify-center gap-3 transition-colors shadow-sm"
              onClick={handleGoogleLogin} 
              disabled={loading}
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}
        
        <div className="text-center mt-6 text-sm text-gray-600">
          {forgotPasswordMode ? (
            <button 
              onClick={() => {
                setForgotPasswordMode(false);
                setError(null);
                setResetEmailSent(false);
              }} 
              className="text-[#3373FF] hover:text-[#2860e0] font-medium transition-colors"
            >
              Back to login
            </button>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <button onClick={() => navigate('/register')} className="text-[#3373FF] hover:text-[#2860e0] font-medium transition-colors ml-1">Sign up</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
