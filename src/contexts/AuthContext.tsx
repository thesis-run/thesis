import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSessionReady: boolean;
  signOut: (redirectTo?: string) => Promise<boolean>;
  checkSessionExpired: () => boolean;
}

// 8 hours in milliseconds
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const SESSION_START_KEY = 'session_start_time';

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isSessionReady: false,
  signOut: async () => false,
  checkSessionExpired: () => false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const navigate = useNavigate();
  
  // Use ref to track current session for interval callback
  const sessionRef = useRef<Session | null>(null);

  const signOut = async (redirectTo: string = '/login'): Promise<boolean> => {
    // Clear local state IMMEDIATELY for instant UX
    setUser(null);
    setSession(null);
    sessionRef.current = null;
    localStorage.removeItem(SESSION_START_KEY);
    
    // Wait for Supabase signOut to complete (with 2-second timeout)
    // This prevents race conditions when user logs back in immediately
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
    } catch (error) {
      console.error('SignOut error:', error);
    }
    
    // Only navigate AFTER signOut completes (or times out)
    navigate(redirectTo, { replace: true });
    
    return true;
  };

  // Check if session has expired (12 hours)
  const checkSessionExpired = () => {
    const sessionStartTime = localStorage.getItem(SESSION_START_KEY);
    if (!sessionStartTime) return false;
    
    const startTime = parseInt(sessionStartTime, 10);
    const now = Date.now();
    const elapsed = now - startTime;
    
    return elapsed > SESSION_TIMEOUT_MS;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        sessionRef.current = newSession;
        setIsLoading(false);
        
        // Only set session start time on actual login, not on session restoration
        if (event === 'SIGNED_IN' && newSession) {
          localStorage.setItem(SESSION_START_KEY, Date.now().toString());
        }
        
        // Set session ready for both SIGNED_IN and INITIAL_SESSION events
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newSession) {
          setIsSessionReady(true);
        }
        
        // Clear session start time on logout
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem(SESSION_START_KEY);
          setIsSessionReady(false);
        }
      }
    );

    // Helper function to get session with timeout
    const getSessionWithTimeout = async (timeout = 5000) => {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => 
        setTimeout(() => {
          resolve({ data: { session: null }, error: new Error('Session check timed out') });
        }, timeout)
      );
      
      return await Promise.race([sessionPromise, timeoutPromise]);
    };

    // THEN check for existing session (skip if on login page to avoid race conditions)
    const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/admin/login' || window.location.pathname === '/editor/login';
    if (!isLoginPage) {
      getSessionWithTimeout().then(({ data: { session: existingSession } }) => {
        // Check if session has expired
        const isExpired = existingSession && checkSessionExpired();
        
        if (isExpired) {
          signOut();
        } else {
          setSession(existingSession);
          setUser(existingSession?.user ?? null);
          sessionRef.current = existingSession;
          if (existingSession) {
            setIsSessionReady(true);
          }
        }
        setIsLoading(false);
      }).catch((error) => {
        console.error('Auth getSession error:', error);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    // Check session timeout every minute using ref to avoid stale closure
    const timeoutInterval = setInterval(() => {
      if (sessionRef.current && checkSessionExpired()) {
        signOut();
      }
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(timeoutInterval);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isSessionReady, signOut, checkSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};
