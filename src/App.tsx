import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import { COLORS, ALLOWED_EMAIL } from './lib/constants';
import { Login } from './pages/Login';
import { Home } from './pages/Home';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    async function handleSession(nextSession: Session | null) {
      if (nextSession && nextSession.user.email !== ALLOWED_EMAIL) {
        await supabase.auth.signOut();
        setSession(null);
        setUnauthorized(true);
        return;
      }
      setUnauthorized(false);
      setSession(nextSession);
    }

    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session).finally(() => setLoading(false));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      handleSession(nextSession);
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

  if (unauthorized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: COLORS.bg }}>
        <p className="text-sm text-center" style={{ color: COLORS.over }}>
          Essa conta não tem acesso ao Manda.
        </p>
      </div>
    );
  }

  return session ? <Home userId={session.user.id} /> : <Login />;
}

export default App;
