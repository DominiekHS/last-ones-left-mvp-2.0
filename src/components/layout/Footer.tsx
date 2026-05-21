import { SafeLink as Link } from "@/components/SafeLink";

export function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p className="font-display font-bold text-foreground">Last Ones Left</p>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link to="/testversie" className="hover:text-foreground">Testversie</Link>
          <Link to="/help" className="hover:text-foreground">Helpcenter</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
          <Link to="/algemene-voorwaarden" className="hover:text-foreground">Voorwaarden</Link>
          <Link to="/privacybeleid" className="hover:text-foreground">Privacy</Link>
          <Link to="/merchant/registreren" className="hover:text-foreground">Voor ondernemers</Link>
        </nav>
        <p>© {new Date().getFullYear()} Last Ones Left</p>
      </div>
    </footer>
  );
}
