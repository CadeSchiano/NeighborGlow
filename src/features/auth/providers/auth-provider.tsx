import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase/client';
import { syncRevenueCatUser } from '@/features/candy-finder-plus/services/revenuecat';

type AuthContextValue = {
  isLoading: boolean;
  isRevenueCatIdentityReady: boolean;
  session: Session | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRevenueCatIdentityReady, setIsRevenueCatIdentityReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const lastRevenueCatUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    let syncRequest = 0;
    const synchronizeRevenueCatIdentity = (userId: string | null) => {
      if (lastRevenueCatUserId.current === userId) return;
      lastRevenueCatUserId.current = userId;
      const request = ++syncRequest;
      setIsRevenueCatIdentityReady(false);
      void syncRevenueCatUser(userId)
        .then((isReady) => {
          if (isMounted && request === syncRequest) setIsRevenueCatIdentityReady(isReady);
        })
        .catch(() => {
          if (isMounted && request === syncRequest) setIsRevenueCatIdentityReady(false);
        });
    };

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(data.session);
        setIsLoading(false);
      }
      synchronizeRevenueCatIdentity(data.session?.user.id ?? null);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
        setIsLoading(false);
      }
      synchronizeRevenueCatIdentity(nextSession?.user.id ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ isLoading, isRevenueCatIdentityReady, session }), [isLoading, isRevenueCatIdentityReady, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return value;
}
