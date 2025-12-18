import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HomePage } from "@/pages/HomePage";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AuthPage } from "@/pages/AuthPage";
import { MesaDashboard } from "@/pages/MesaDashboard";
import { TeamsPage } from "@/pages/TeamsPage";
import { TeamDetailPage } from "@/pages/TeamDetailPage";
import { PlayerDetailPage } from "@/pages/PlayerDetailPage";
import { PlayersSearchPage } from "@/pages/PlayersSearchPage";
import { TournamentsPage } from "@/pages/TournamentsPage";
import { TournamentDetailPage } from "@/pages/TournamentDetailPage";
import { LiveTournamentPage } from "@/pages/LiveTournamentPage";
import { BlogPage } from "@/pages/BlogPage";
import { ContactPage } from "@/pages/ContactPage";
import { SponsorsPage } from "@/pages/SponsorsPage";
import { ChatBot } from "@/components/ChatBot";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <AudioProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/equipos" element={<TeamsPage />} />
                    <Route path="/equipos/:id" element={<TeamDetailPage />} />
                    <Route path="/jugadores" element={<PlayersSearchPage />} />
                    <Route path="/jugador/:id" element={<PlayerDetailPage />} />
                    <Route path="/torneos" element={<TournamentsPage />} />
                    <Route path="/torneos/:id" element={<TournamentDetailPage />} />
                    <Route path="/en-vivo" element={<LiveTournamentPage />} />
                    <Route path="/noticias" element={<BlogPage />} />
                    <Route path="/patrocinadores" element={<SponsorsPage />} />
                    <Route path="/contacto" element={<ContactPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/mesa" element={<MesaDashboard />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
                <ChatBot />
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </AudioProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
