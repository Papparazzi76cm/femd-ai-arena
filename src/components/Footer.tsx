import { Instagram, Mail, Phone, MapPin } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import logoBlanco from "@/assets/logo-web.png";
import logoNegro from "@/assets/logo-web-negro.png";

export function Footer() {
  const { theme } = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="space-y-3 sm:space-y-4 sm:col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2">
              <img 
                src={theme === "dark" ? logoBlanco : logoNegro} 
                alt="FEMD Torneos" 
                className="h-9 sm:h-10 w-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Organizadores de eventos y torneos de fútbol profesionales.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Enlaces</h3>
            <ul className="space-y-2">
              {["Inicio", "Equipos", "Calendario", "Noticias", "Contacto"].map(
                (link) => (
                  <li key={link}>
                    <a
                      href={`#${link.toLowerCase()}`}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>info@femdeventos.com</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:+34672266074" className="hover:text-primary transition-colors">
                  +34 672 266 074
                </a>
              </li>
              <li className="flex items-start space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Calle Toreros, 6, Bajo Derecha - 47007 (Valladolid, España)</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Síguenos</h3>
            <div className="flex space-x-3">
              <a
                href="https://instagram.com/femdeventos"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white hover:opacity-80 transition-all duration-300"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/femdeventos"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:opacity-80 transition-all duration-300"
                aria-label="X (Twitter)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">@femdeventos</p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} FEMD TORNEOS. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
