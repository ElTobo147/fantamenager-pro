import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  onSuccess?: () => void;
}

export default function Login({ onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      if (!data.session) throw new Error('Accesso non riuscito: nessuna sessione creata');
      onSuccess?.();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('Invalid login credentials')) {
        setError('Email o password non corretti');
      } else if (msg.includes('Email not confirmed')) {
        setError('Email non confermata. Contatta l\'amministratore.');
      } else {
        setError(msg || 'Errore durante l\'accesso');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl font-bold text-3xl text-white shadow-lg shadow-green-600/30 mb-4">
            FM
          </div>
          <h1 className="text-2xl font-bold text-white">FantaManager Pro</h1>
          <p className="text-sm text-gray-400 mt-1">Serie A 2026/2027 — Accedi al tuo account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900/80 backdrop-blur border border-gray-700/60 rounded-2xl shadow-2xl p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                placeholder="nome@email.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-11 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-lg px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-green-600/20"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Accesso in corso…
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Accedi
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 pt-2">
            Non hai un account? Contatta l'amministratore per ottenere le credenziali.
          </p>
        </form>
      </div>
    </div>
  );
}
