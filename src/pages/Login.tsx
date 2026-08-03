import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { COLORS } from '../lib/constants';
import mandaHero from '../assets/manda-hero.webp';

export function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-sm">
        <img src={mandaHero} alt="Manda, a mascote do app" className="w-80 max-w-full mx-auto mb-4 object-contain" />
        <h1 className="text-2xl font-semibold mb-1 text-center" style={{ color: COLORS.text }}>
          Manda
        </h1>
        <p className="text-sm mb-8 text-center" style={{ color: COLORS.textMuted }}>
          Entre com sua conta Google pra continuar
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-transform duration-200 active:scale-[0.97] cursor-pointer"
          style={{ background: COLORS.protein, color: COLORS.bg }}
        >
          {loading ? 'Redirecionando...' : 'Entrar com Google'}
        </button>
        {error && (
          <p className="text-xs text-center mt-3" style={{ color: COLORS.over }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
