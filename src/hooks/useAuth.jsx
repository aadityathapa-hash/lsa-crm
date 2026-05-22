import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout — never hang more than 4 seconds
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth timeout — clearing stale state");
        setLoading(false);
      }
    }, 4000);

    async function initAuth() {
      try {
        // If URL has hash with access_token, Supabase needs to exchange it
        // The onAuthStateChange listener will handle it
        // Just get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          setUser(session.user);
          await loadProfile(session.user.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // This listener catches the OAuth callback token exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
          setLoading(false);
          // Clean the hash from URL
          if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          setUser(session.user);
        }
      }
    );

    initAuth();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (!error && data) {
        setProfile(data);
      } else {
        console.error("Profile error:", error?.message);
        setProfile(null);
      }
    } catch (err) {
      console.error("Profile exception:", err);
      setProfile(null);
    }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading, signInWithGoogle, signOut,
      isAdmin: profile?.role === "admin",
      isAgent: profile?.role === "agent",
      isViewer: profile?.role === "viewer",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
