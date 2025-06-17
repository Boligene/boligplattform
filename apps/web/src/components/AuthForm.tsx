import { logAuthProviderStatus, supabase } from '@boligplattform/core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

const AuthForm: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isLogin, setIsLogin] = React.useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        setMessage('Innlogging vellykket!');
        navigate('/');
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Registrering vellykket! Sjekk e-posten din for bekreftelse.');
    }
    setLoading(false);
  };

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'azure' | 'facebook') => {
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Loading state will be handled by redirect
  };

  // Test function for development
  const handleTestProviders = async () => {
    await logAuthProviderStatus();
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white/90 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-seriflogo font-bold mb-6 text-brown-800 text-center">
        {isLogin ? 'Logg inn' : 'Registrer deg'}
      </h2>
      
      {/* Development Test Button */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4">
          <button
            onClick={handleTestProviders}
            className="w-full text-xs bg-gray-100 text-gray-600 py-2 px-3 rounded border hover:bg-gray-200 transition"
          >
            🔧 Test Provider Configuration (Dev Only)
          </button>
        </div>
      )}
      
      {/* Social Login Buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleSocialLogin('google')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Fortsett med Google
        </button>

        <button
          onClick={() => handleSocialLogin('apple')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          Fortsett med Apple
        </button>

        <button
          onClick={() => handleSocialLogin('azure')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M0 0h11.377v11.372H0V0zm12.623 0H24v11.372H12.623V0zM0 12.623h11.377V24H0V12.623zm12.623 0H24V24H12.623V12.623z"/>
          </svg>
          Fortsett med Microsoft
        </button>

        <button
          onClick={() => handleSocialLogin('facebook')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Fortsett med Facebook
        </button>


      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">eller</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border border-brown-300 p-3 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
          required
        />
        <input
          type="password"
          placeholder="Passord"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-brown-300 p-3 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
          required
        />
        <button
          type="submit"
          className="w-full bg-brown-600 text-white py-3 rounded-lg hover:bg-brown-700 transition disabled:opacity-50 font-medium"
          disabled={loading}
        >
          {loading ? 'Laster...' : isLogin ? 'Logg inn' : 'Registrer'}
        </button>
      </form>
      
      <button
        className="mt-4 text-brown-600 underline text-center w-full"
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin ? 'Har du ikke bruker? Registrer deg' : 'Allerede bruker? Logg inn'}
      </button>
      
      {error && <div className="mt-4 text-red-600 text-center">{error}</div>}
      {message && <div className="mt-4 text-green-600 text-center">{message}</div>}
    </div>
  );
};

export default AuthForm; 