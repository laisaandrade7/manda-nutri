import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import { COLORS } from './lib/constants';
import { Login } from './pages/Login';
import { Home } from './pages/Home';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: COLORS.bg }}>
        <span className="text-sm" style={{ color: COLORS.textMuted }}>
          Carregando...
        </span>
      </div>
    );
  }

  return session ? <Home userId={session.user.id} /> : <Login />;
}

export default App;
