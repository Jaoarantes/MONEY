import React, { useState } from 'react';
import { supabase } from './supabase';
import {
    Mail, Lock, ArrowRight, Loader2,
    CheckCircle2, AlertCircle, Globe, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils';

export const AuthPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                setSuccess(true);
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro na autenticação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6 relative overflow-hidden">
            {/* Dynamic Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-positive/5 rounded-full blur-[120px] animate-pulse delay-700" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md z-10"
            >
                {/* Logo Section */}
                <div className="text-center mb-10">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-2xl shadow-accent/40"
                    >
                        M
                    </motion.div>
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">MONEY</h1>
                    <p className="text-text-secondary">Luxury Financial Management</p>
                </div>

                {/* Auth Card */}
                <div className="glass-strong p-8 rounded-[32px] border border-white/10 shadow-2xl">
                    <div className="flex bg-white/5 p-1 rounded-2xl mb-8">
                        <button
                            onClick={() => setIsSignUp(false)}
                            className={cn(
                                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                                !isSignUp ? "bg-white text-black shadow-lg" : "text-text-muted hover:text-text-secondary"
                            )}
                        >
                            LOGIN
                        </button>
                        <button
                            onClick={() => setIsSignUp(true)}
                            className={cn(
                                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                                isSignUp ? "bg-white text-black shadow-lg" : "text-text-muted hover:text-text-secondary"
                            )}
                        >
                            CADASTRO
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-widest ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-accent/40 focus:bg-white/10 transition-all text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-widest ml-1">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-accent/40 focus:bg-white/10 transition-all text-white"
                                />
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 bg-negative/10 border border-negative/20 rounded-2xl flex gap-3 text-negative text-sm items-center"
                                >
                                    <AlertCircle size={18} className="shrink-0" />
                                    <p>{error}</p>
                                </motion.div>
                            )}

                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 bg-positive/10 border border-positive/20 rounded-2xl flex gap-3 text-positive text-sm items-center"
                                >
                                    <CheckCircle2 size={18} className="shrink-0" />
                                    <p>Verifique seu email para confirmar o cadastro!</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-accent text-white font-bold rounded-2xl shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span>{isSignUp ? 'CRIAR CONTA' : ' ENTRAR NO APP'}</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Security Info */}
                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <div className="inline-flex items-center gap-2 text-[10px] uppercase font-bold text-text-muted tracking-widest">
                            <Shield size={14} className="text-positive" />
                            <span>Criptografia de Nível Bancário</span>
                        </div>
                    </div>
                </div>

                <p className="text-center mt-10 text-text-muted text-xs">
                    Built for the elite. 100% Cloud Persistence.
                </p>
            </motion.div>
        </div>
    );
};
