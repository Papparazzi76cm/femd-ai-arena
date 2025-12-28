import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
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
    { name: "Inicio", href: "/", isRoute: true },
    { name: "Clubes", href: "/equipos", isRoute: true },
    { name: "Torneos", href: "/torneos", isRoute: true },
    { name: "Torneo en Vivo", href: "/en-vivo", isRoute: true, isLive: true },
    { name: "Noticias", href: "/noticias", isRoute: true },
    { name: "Patrocinadores", href: "/patrocinadores", isRoute: true },
    { name: "Contacto", href: "/contacto", isRoute: true },
  ];

  // Add Admin link if user is admin (Mesa users also access through admin/auth)
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
                <NavLink
                  key={link.name}
                  to={link.href}
                  className={`transition-colors duration-200 font-medium flex items-center gap-1 ${
                    !isScrolled ? '[text-shadow:_0_1px_3px_rgb(0_0_0_/_80%),_0_0_8px_rgb(0_0_0_/_50%)]' : ''
                  } ${
                    (link as any).isLive 
                      ? 'text-red-500 hover:text-red-400' 
                      : `${isScrolled ? 'text-foreground/80 hover:text-primary' : 'text-white hover:text-primary'}`
                  }`}
                  activeClassName={(link as any).isLive 
                    ? 'text-red-400 border-b-2 border-red-500' 
                    : 'text-primary border-b-2 border-primary'
                  }
                >
                  {(link as any).isLive && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live" />
                  )}
                  {link.name}
                </NavLink>
              ))}
              {adminLink && (
                <NavLink
                  to={adminLink.href}
                  className={`transition-colors duration-200 font-semibold ${
                    !isScrolled ? '[text-shadow:_0_1px_3px_rgb(0_0_0_/_80%),_0_0_8px_rgb(0_0_0_/_50%)] text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                  activeClassName="text-emerald-400 border-b-2 border-emerald-500"
                >
                  {adminLink.name}
                </NavLink>
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
                <NavLink
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-lg transition-colors flex items-center gap-2 ${
                    (link as any).isLive 
                      ? 'text-red-600 hover:text-red-700 dark:text-red-500' 
                      : 'text-foreground hover:text-primary'
                  }`}
                  activeClassName={(link as any).isLive 
                    ? 'text-red-700 dark:text-red-400 font-bold' 
                    : 'text-primary font-bold'
                  }
                >
                  {(link as any).isLive && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-live" />
                  )}
                  {link.name}
                </NavLink>
              ))}
              {adminLink && (
                <NavLink
                  to={adminLink.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg text-emerald-600 hover:text-emerald-700 transition-colors font-semibold"
                  activeClassName="text-emerald-700 font-bold"
                >
                  {adminLink.name}
                </NavLink>
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
