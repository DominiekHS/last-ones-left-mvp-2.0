import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

type AppRole = "consumer" | "merchant" | "admin";

interface GuardOptions {
  /** Waarheen redirecten als de check faalt. Default: "/login" */
  redirectTo?: string;
  /** Stille modus: geen redirect, alleen `allowed` boolean teruggeven (voor inline UI-guards). */
  silent?: boolean;
}

interface GuardResult {
  /** True zodra auth-state geladen is én de check klopt. */
  allowed: boolean;
  /** True zolang `useAuth()` nog laadt. */
  loading: boolean;
}

/**
 * UX-laag bovenop RLS: redirect ongeauthenticeerde users weg van een private pagina.
 *
 * BELANGRIJK: dit is GEEN security boundary. Row Level Security in de database is
 * de enige authoritatieve laag. Deze hook voorkomt alleen dat een user een lege
 * pagina ziet als hij niet ingelogd is.
 *
 * Gebruik:
 * ```tsx
 * function MijnPaginaPrivate() {
 *   const { allowed, loading } = useRequireAuth();
 *   if (loading) return <Spinner />;
 *   if (!allowed) return null; // redirect is al getriggerd
 *   return <Content />;
 * }
 * ```
 */
export function useRequireAuth(options: GuardOptions = {}): GuardResult {
  const { redirectTo = "/login", silent = false } = options;
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const allowed = !!user;

  useEffect(() => {
    if (loading || silent) return;
    if (!user) navigate(redirectTo, { replace: true });
  }, [loading, user, redirectTo, silent, navigate]);

  return { allowed, loading };
}

/**
 * UX-laag bovenop RLS: redirect users die niet de juiste rol hebben.
 *
 * Net als `useRequireAuth` is dit een UX-helper, geen security boundary.
 * RLS blijft de bron van waarheid.
 *
 * Gebruik:
 * ```tsx
 * function AdminPagina() {
 *   const { allowed, loading } = useRequireRole("admin", { redirectTo: "/" });
 *   if (loading) return <Spinner />;
 *   if (!allowed) return null;
 *   return <AdminContent />;
 * }
 * ```
 */
export function useRequireRole(role: AppRole, options: GuardOptions = {}): GuardResult {
  const { redirectTo = "/", silent = false } = options;
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  const allowed = !!user && roles.includes(role);

  useEffect(() => {
    if (loading || silent) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!roles.includes(role)) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, user, roles, role, redirectTo, silent, navigate]);

  return { allowed, loading };
}
