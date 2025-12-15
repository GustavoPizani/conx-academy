import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { UserRole } from '@/types/auth';

interface AuthState {
  session: Session | null;
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    userRole: null,
    loading: true,
  });

  useEffect(() => {
    const getSessionAndRole = async (session: Session | null) => {
      if (session?.user) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        setAuthState({
          session,
          user: session.user,
          userRole: roleData?.role as UserRole | null,
          loading: false,
        });
        if (roleError) console.error("Error fetching user role:", roleError);
      } else {
        setAuthState({ session: null, user: null, userRole: null, loading: false });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      getSessionAndRole(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      getSessionAndRole(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return authState;
}