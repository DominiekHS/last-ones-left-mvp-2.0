import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type AppRole = "consumer" | "merchant" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Tables<"profiles"> | null;
  roles: AppRole[];
  merchant: Tables<"merchants"> | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  merchant: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [merchant, setMerchant] = useState<Tables<"merchants"> | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
    const [profileRes, rolesRes, merchantRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("merchants").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    setProfile(profileRes.data);
    setRoles((rolesRes.data || []).map((r) => r.role));
    setMerchant(merchantRes.data);
    // Mark a pending referral as verified zodra de gebruiker zijn e-mail heeft bevestigd.
    // De RPC is een no-op als er geen referral is of als de e-mail nog niet bevestigd is.
    supabase.rpc("confirm_my_referral").then(() => {
      sessionStorage.removeItem("ll_referral_code");
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchUserData(user.id);
  }, [user, fetchUserData]);

  useEffect(() => {
    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        // Skip if this is the initial event and getSession already handled it
        if (!initialized.current) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(async () => {
            await fetchUserData(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setMerchant(null);
        }
      }
    );

    // Then get the initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        await fetchUserData(initialSession.user.id);
      }
      setLoading(false);
      initialized.current = true;
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setMerchant(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, merchant, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
