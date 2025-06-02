import * as React from 'react';
import { supabase } from '../supabaseClient';
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

  return (
    <div className="max-w-sm mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">{isLogin ? 'Logg inn' : 'Registrer deg'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Passord"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Laster...' : isLogin ? 'Logg inn' : 'Registrer'}
        </button>
      </form>
      <button
        className="mt-4 text-blue-600 underline"
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin ? 'Har du ikke bruker? Registrer deg' : 'Allerede bruker? Logg inn'}
      </button>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {message && <div className="mt-4 text-green-600">{message}</div>}
    </div>
  );
};

export default AuthForm; 