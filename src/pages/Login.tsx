import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { COLORS } from '../lib/constants';

export function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1 text-center" style={{ color: COLORS.text }}>
          Manda
        </h1>
        <p className="text-sm mb-8 text-center" style={{ color: COLORS.textMuted }}>
          Entre com seu e-mail pra continuar
        </p>

        {sent ? (
          <p className="text-sm text-center" style={{ color: COLORS.text }}>
            Link enviado! Confira seu e-mail pra entrar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full text-sm px-3 py-2.5 rounded-lg"
              style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: COLORS.protein, color: COLORS.bg }}
            >
              {loading ? 'Enviando...' : 'Enviar link mágico'}
            </button>
            {error && (
              <p className="text-xs text-center" style={{ color: COLORS.over }}>
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
