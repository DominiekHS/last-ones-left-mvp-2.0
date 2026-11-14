import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT_TITLE = "Last-minute activiteiten met korting in Groningen | Last Ones Left";

const TITLES: Record<string, string> = {
  "/testversie": "Over ons | Last Ones Left",
  "/help": "Helpcenter | Last Ones Left",
  "/contact": "Contact | Last Ones Left",
  "/algemene-voorwaarden": "Algemene voorwaarden | Last Ones Left",
  "/privacybeleid": "Privacybeleid | Last Ones Left",
  "/login": "Inloggen | Last Ones Left",
  "/registreren": "Registreren | Last Ones Left",
  "/merchant/registreren": "Bedrijf aanmelden | Last Ones Left",
  "/vouchers": "Mijn kortingscodes | Last Ones Left",
  "/geschiedenis": "Geschiedenis | Last Ones Left",
  "/profiel": "Profiel | Last Ones Left",
};

/** Sets the browser/Google title per page; social previews keep the site-wide title from index.html. */
export function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    let title = TITLES[pathname];
    if (!title && pathname.startsWith("/help/")) title = "Helpcenter | Last Ones Left";
    document.title = title ?? DEFAULT_TITLE;
  }, [pathname]);
  return null;
}
