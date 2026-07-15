import * as Sentry from '@sentry/react-native';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { unregisterPush } from './push';
import { supabase } from './supabase';

// Só o id: nada de e-mail/telefone/nome no Sentry (LGPD, sendDefaultPii=false).
const trackUser = (session: Session | null) =>
  Sentry.setUser(session ? { id: session.user.id } : null);

type AuthState = { session: Session | null; loading: boolean };

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Cobre login, logout (SIGNED_OUT -> next=null) e refresh de token.
      trackUser(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export async function signOut() {
  await unregisterPush();
  return supabase.auth.signOut();
}
