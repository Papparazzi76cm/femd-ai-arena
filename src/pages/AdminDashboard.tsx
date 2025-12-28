import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { roleService } from '@/services/roleService';
import { 
  Loader2, 
  LogOut, 
  Users, 
  Trophy, 
  Newspaper, 
  Handshake, 
  Calendar,
  UserCog,
  Shuffle,
  Tag,
  Building2
} from 'lucide-react';
import { TeamManager } from '@/components/admin/TeamManager';
import { ParticipantManager } from '@/components/admin/ParticipantManager';
import { AdminRefereeManager } from '@/components/admin/AdminRefereeManager';
import { PostManager } from '@/components/admin/PostManager';
import { SponsorManager } from '@/components/admin/SponsorManager';
import { EventManager } from '@/components/admin/EventManager';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { FacilityManager } from '@/components/admin/FacilityManager';

export const AdminDashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('equipos');

  useEffect(() => {
    if (!authLoading) {
      checkAccess();
    }
  }, [user, authLoading]);

  const checkAccess = async () => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);
      const roles = await roleService.getUserRoles(user.id);
      
      if (!roles.includes('admin')) {
        toast({
          title: 'Acceso denegado',
          description: 'Solo los administradores pueden acceder a este panel',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error verificando acceso:', error);
      toast({
        title: 'Error',
        description: 'No se pudo verificar el acceso',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background pt-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-6 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">
                Panel de Administración
              </h1>
              <p className="text-primary-foreground/80 text-sm truncate">
                Bienvenido, {user?.email}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-primary-foreground hover:bg-white/20"
                onClick={() => navigate('/mesa')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Panel Mesa
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-primary-foreground hover:bg-white/20"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-2 bg-muted/50">
            <TabsTrigger value="equipos" className="flex items-center gap-2 py-3">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clubes</span>
            </TabsTrigger>
            <TabsTrigger value="jugadores" className="flex items-center gap-2 py-3">
              <UserCog className="w-4 h-4" />
              <span className="hidden sm:inline">Jugadores</span>
            </TabsTrigger>
            <TabsTrigger value="categorias" className="flex items-center gap-2 py-3">
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Categorías</span>
            </TabsTrigger>
            <TabsTrigger value="instalaciones" className="flex items-center gap-2 py-3">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Instalaciones</span>
            </TabsTrigger>
            <TabsTrigger value="torneos" className="flex items-center gap-2 py-3">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Torneos</span>
            </TabsTrigger>
            <TabsTrigger value="mesas" className="flex items-center gap-2 py-3">
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Mesas</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-2 py-3">
              <Newspaper className="w-4 h-4" />
              <span className="hidden sm:inline">Blog</span>
            </TabsTrigger>
            <TabsTrigger value="patrocinadores" className="flex items-center gap-2 py-3">
              <Handshake className="w-4 h-4" />
              <span className="hidden sm:inline">Patrocinadores</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="equipos" className="space-y-4">
            <TeamManager />
          </TabsContent>

          <TabsContent value="jugadores" className="space-y-4">
            <ParticipantManager />
          </TabsContent>

          <TabsContent value="categorias" className="space-y-4">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="instalaciones" className="space-y-4">
            <FacilityManager />
          </TabsContent>

          <TabsContent value="torneos" className="space-y-4">
            <EventManager />
          </TabsContent>

          <TabsContent value="mesas" className="space-y-4">
            <AdminRefereeManager />
          </TabsContent>

          <TabsContent value="blog" className="space-y-4">
            <PostManager />
          </TabsContent>

          <TabsContent value="patrocinadores" className="space-y-4">
            <SponsorManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
