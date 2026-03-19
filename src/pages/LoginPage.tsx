import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Droplets } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useApp();
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const success = await login(matricule, password);
      if (!success) setError('Identifiants incorrects');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-hero p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-card/20 backdrop-blur-sm flex items-center justify-center mb-4">
            <Droplets className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground">Relève d'Eau</h1>
          <p className="text-primary-foreground/70 text-sm mt-1">Application de relève des compteurs</p>
        </div>

        <div className="bg-card rounded-2xl shadow-modal p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Matricule</label>
              <input
                type="text"
                value={matricule}
                onChange={e => setMatricule(e.target.value)}
                placeholder="RLV-2024-042"
                className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full h-12 rounded-lg bg-gradient-primary text-primary-foreground font-semibold text-base active:scale-[0.98] transition-transform"
            >
              Se connecter
            </button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Mode démo : saisissez n'importe quel matricule et mot de passe
          </p>
        </div>
      </motion.div>
    </div>
  );
}
