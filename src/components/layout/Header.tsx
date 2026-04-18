import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, User, LogOut, Store, Shield } from "lucide-react";
import { NotificationBellToggle } from "@/components/NotificationBellToggle";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, profile, roles, merchant, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMerchant = roles.includes("merchant");
  const isAdmin = roles.includes("admin");

  const displayName = isAdmin
    ? (profile?.full_name || "Admin")
    : isMerchant
      ? (merchant?.company_name || "Ondernemer")
      : (profile?.full_name || "Gebruiker");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const redirectTarget = `${location.pathname}${location.search}${location.hash}`;

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/" className="font-display text-xl font-bold tracking-tight whitespace-nowrap">
            Last Ones Left
          </Link>
          <span className="hidden sm:inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            DEALS
          </span>
          <Link to="/testversie" className="inline-flex items-center whitespace-nowrap rounded-full bg-success px-3 py-1 text-xs font-semibold text-success-foreground hover:opacity-80 transition-opacity">
            Testversie – Lees meer!
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {isMerchant && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/merchant"><Store className="mr-1 h-4 w-4" />Mijn Advertenties</Link>
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin"><Shield className="mr-1 h-4 w-4" />Admin</Link>
                </Button>
              )}
              {!isMerchant && !isAdmin && (
                <>
                  <NotificationBellToggle />
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/vouchers">Mijn kortingscodes</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/geschiedenis">Mijn activiteiten</Link>
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="mr-1 h-4 w-4" />
                    {displayName}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/profiel")}>
                    Mijn Profiel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />Uitloggen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/login?redirect=${encodeURIComponent(redirectTarget)}`}>Inloggen</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/merchant/registreren" aria-label="Registreren als ondernemer">Registreren als ondernemer</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/registreren" aria-label="Account aanmaken als consument">Account aanmaken</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-2">
          {user ? (
            <>
              <Link to="/profiel" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>
                Mijn Profiel
              </Link>
              {!isMerchant && !isAdmin && (
                <>
                  <Link to="/vouchers" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>
                    Mijn kortingscodes
                  </Link>
                  <Link to="/geschiedenis" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>
                    Mijn activiteiten
                  </Link>
                </>
              )}
              {isMerchant && (
                <Link to="/merchant" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>
                  Mijn Advertenties
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>
                  Admin Panel
                </Link>
              )}
              <button onClick={handleSignOut} className="block py-2 text-sm text-destructive">
                Uitloggen
              </button>
            </>
          ) : (
            <>
              <Link to={`/login?redirect=${encodeURIComponent(redirectTarget)}`} className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>
                Inloggen
              </Link>
              <Link to="/merchant/registreren" className="block py-2 text-sm" onClick={() => setMobileOpen(false)} aria-label="Registreren als ondernemer">
                Registreren als ondernemer
              </Link>
              <Link to="/registreren" className="block py-2 text-sm font-semibold" onClick={() => setMobileOpen(false)} aria-label="Account aanmaken als consument">
                Account aanmaken
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
