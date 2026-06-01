import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { logActivity } from "../lib/logActivity";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          setUser(session.user);
          // Set loading false IMMEDIATELY so the page renders
          setLoading(false);
          // Then load profile in background
          loadProfile(session.user.id);
        } else {
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) setLoading(false);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          setLoading(false);
          loadProfile(session.user.id);
          logActivity("login");
          // Clean hash from URL
          if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          setUser(session.user);
          loadProfile(session.user.id);
        }
      }
    );

    initAuth();

    // Safety timeout
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 3000);

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
      }
    } catch (err) {
      console.error("Profile exception:", err);
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
