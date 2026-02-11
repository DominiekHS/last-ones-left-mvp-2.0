import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, User, LogOut, Store, Shield } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-bold tracking-tight">
            Last Ones Left
          </span>
          <span className="hidden sm:inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            DEALS
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {isMerchant && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/merchant"><Store className="mr-1 h-4 w-4" />Dashboard</Link>
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin"><Shield className="mr-1 h-4 w-4" />Admin</Link>
                </Button>
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
                  {!isMerchant && (
                    <DropdownMenuItem onClick={() => navigate("/vouchers")}>
                      Mijn Vouchers
                    </DropdownMenuItem>
                  )}
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
                <Link to="/login">Inloggen</Link>
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
              {!isMerchant && (
                <Link to="/vouchers" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>
                  Mijn Vouchers
                </Link>
              )}
              {isMerchant && (
                <Link to="/merchant" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>
                  Merchant Dashboard
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
              <Link to="/login" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>
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
