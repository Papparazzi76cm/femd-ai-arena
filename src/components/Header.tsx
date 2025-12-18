import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { roleService } from "@/services/roleService";
import logoBlanco from "@/assets/logo-web.png";
import logoNegro from "@/assets/logo-web-negro.png";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkRoles = async () => {
      if (user) {
        const roles = await roleService.getUserRoles(user.id);
        setIsAdmin(roles.includes('admin'));
      } else {
        setIsAdmin(false);
      }
    };
    checkRoles();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Inicio", href: "#home", isAnchor: true },
    { name: "Equipos", href: "/equipos", isRoute: true },
    { name: "Jugadores", href: "/jugadores", isRoute: true },
    { name: "Torneos", href: "/torneos", isRoute: true },
    { name: "Torneo en Vivo", href: "/en-vivo", isRoute: true, isLive: true },
    { name: "Noticias", href: "/noticias", isRoute: true },
    { name: "Patrocinadores", href: "/patrocinadores", isRoute: true },
    { name: "Contacto", href: "/contacto", isRoute: true },
  ];

  // Mesa link - visible to everyone
  const mesaLink = { name: "Mesa", href: "/mesa", isRoute: true };

  // Add Admin link if user is admin
  const adminLink = isAdmin
    ? { name: "Admin", href: "/admin", isRoute: true }
    : null;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-background/80 backdrop-blur-lg shadow-md"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src={theme === "dark" ? logoBlanco : logoNegro} 
                alt="FEMD Torneos" 
                className="h-12 w-auto"
              />
            </Link>
          </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={`transition-colors duration-200 font-medium flex items-center gap-1 ${
                      (link as any).isLive 
                        ? 'text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400' 
                        : 'text-foreground/80 hover:text-primary'
                    }`}
                  >
                    {(link as any).isLive && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live" />
                    )}
                    {link.name}
                  </Link>
                ) : (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-foreground/80 hover:text-primary transition-colors duration-200 font-medium"
                  >
                    {link.name}
                  </a>
                )
              ))}
              <Link
                to={mesaLink.href}
                className="text-blue-600 hover:text-blue-700 transition-colors duration-200 font-semibold"
              >
                {mesaLink.name}
              </Link>
              {adminLink && (
                <Link
                  to={adminLink.href}
                  className="text-emerald-600 hover:text-emerald-700 transition-colors duration-200 font-semibold"
                >
                  {adminLink.name}
                </Link>
              )}
            </nav>

            {/* Auth & Theme Controls */}
            <div className="hidden md:flex items-center space-x-4">
              <ThemeToggle />
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground">
                    Hola, {user.user_metadata?.name || user.email}
                  </span>
                  <Button onClick={signOut} variant="outline" size="sm">
                    Salir
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => navigate('/auth')}
                  variant="default"
                  size="sm"
                >
                  Acceder
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-foreground"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-20 bg-background z-40 animate-fade-in opacity-100">
            <nav className="flex flex-col p-6 space-y-6 bg-background">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-lg transition-colors flex items-center gap-2 ${
                      (link as any).isLive 
                        ? 'text-red-600 hover:text-red-700 dark:text-red-500' 
                        : 'text-foreground hover:text-primary'
                    }`}
                  >
                    {(link as any).isLive && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live" />
                    )}
                    {link.name}
                  </Link>
                ) : (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg text-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                )
              ))}
              <Link
                to={mesaLink.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg text-blue-600 hover:text-blue-700 transition-colors font-semibold"
              >
                {mesaLink.name}
              </Link>
              {adminLink && (
                <Link
                  to={adminLink.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg text-emerald-600 hover:text-emerald-700 transition-colors font-semibold"
                >
                  {adminLink.name}
                </Link>
              )}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Tema</span>
                  <ThemeToggle />
                </div>
                {user ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {user.user_metadata?.name || user.email}
                    </p>
                    <Button onClick={signOut} variant="outline" className="w-full">
                      Cerrar Sesión
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      navigate('/auth');
                      setIsMobileMenuOpen(false);
                    }}
                    variant="default"
                    className="w-full"
                  >
                    Acceder / Registrarse
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
