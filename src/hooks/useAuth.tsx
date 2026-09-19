import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }
      
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
        }
        
        if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: any = {}) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });

    if (error) {
      // Supabase's own message ("User already registered") lets an
      // attacker enumerate which emails have accounts. Keep other
      // validation errors (weak password, invalid email) as-is since
      // those don't reveal anything about existing accounts.
      const revealsAccountExistence = /already registered|already exists/i.test(error.message);
      toast({
        title: "Registration error",
        description: revealsAccountExistence
          ? "If this email can be registered, check your inbox to confirm your account."
          : error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Registration successful",
        description: "Check your email to confirm your account"
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      toast({
        title: "Sign in error",
        description: error.message,
        variant: "destructive"
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    try {
      // Intento de cierre de sesión global primero
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        const code = (error as any)?.code;
        const status = (error as any)?.status;
        const message = (error as any)?.message?.toLowerCase?.() ?? '';
        const isSessionMissing = code === 'session_not_found' || status === 403 || message.includes('session');

        if (isSessionMissing) {
          // Si el servidor no encuentra la sesión, hacemos signOut local para limpiar tokens
          await supabase.auth.signOut({ scope: 'local' });
        } else {
          toast({
            title: "Sign out error",
            description: (error as any)?.message ?? 'Unknown error',
            variant: "destructive"
          });
          return;
        }
      }
    } catch {
      // Ignorar; proceder a limpiar estado local
    } finally {
      // Asegurar limpieza local del estado para que ProtectedRoute redirija
      setUserProfile(null);
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userProfile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};