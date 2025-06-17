import * as React from 'react';
import { supabase } from '@boligplattform/core';

const LogoutButton: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
    setLoading(false);
    if (!error && onLogout) onLogout();
  };

  return (
    <>
      <button
        onClick={handleLogout}
        className="rounded-full px-6 py-2 bg-brown-100 text-brown-800 font-semibold hover:bg-brown-200 transition shadow w-full sm:w-auto text-center"
        disabled={loading}
      >
        {loading ? 'Logger ut...' : 'Logg ut'}
      </button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </>
  );
};

export default LogoutButton; 