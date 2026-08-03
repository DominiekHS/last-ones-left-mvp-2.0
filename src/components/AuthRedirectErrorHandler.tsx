import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Supabase stuurt de gebruiker na een mislukte e-mailverificatie terug naar de
 * site met een foutcode in de URL-hash, bijv.:
 *   #error=access_denied&error_code=otp_expired&error_description=...
 *
 * Zonder afhandeling ziet de gebruiker een gewone homepage en denkt hij dat de
 * verificatie gelukt is. Deze component vangt die fout op, ruimt de hash op en
 * stuurt door naar /verify-email met een duidelijke uitleg.
 */
export function AuthRedirectErrorHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("error")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const error = params.get("error");
    const errorCode = params.get("error_code");
    if (!error && !errorCode) return;

    // Hash opruimen zodat een refresh niet opnieuw triggert.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const reason =
      errorCode === "otp_expired" || errorCode === "access_denied" || error === "access_denied"
        ? "expired"
        : "unknown";

    navigate(`/verify-email?reason=${reason}`, { replace: true });
  }, [navigate]);

  return null;
}
