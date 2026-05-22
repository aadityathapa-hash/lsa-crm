import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout — never hang more than 5 seconds
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth timeout — forcing load complete");
        setLoading(false);
      }
    }, 5000);

    async function initAuth() {
      try {
        // Check for OAuth callback hash in URL
        if (window.location.hash && window.location.hash.includes("access_token")) {
          // Let Supabase process the callback
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error("OAuth callback error:", error.message);
            // Clear the bad hash and show login
            window.history.replaceState(null, "", window.location.pathname);
            if (mounted) setLoading(false);
            return;
          }
          // Clean up the URL hash
          window.history.replaceState(null, "", window.location.pathname);
          
          if (data?.session?.user && mounted) {
            setUser(data.session.user);
            await fetchProfile(data.session.user.id);
          }
          if (mounted) setLoading(false);
          return;
        }

        // Normal session check
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session error:", error.message);
          if (mounted) setLoading(false);
          return;
        }

        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
        if (mounted) setLoading(false);
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Profile fetch error:", error.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Profile fetch exception:", err);
      setProfile(null);
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error("Login error:", error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  const value = {
    user,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    isAdmin: profile?.role === "admin",
    isAgent: profile?.role === "agent",
    isViewer: profile?.role === "viewer",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
