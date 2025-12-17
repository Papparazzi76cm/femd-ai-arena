import { supabase } from "@/integrations/supabase/client";

export interface RoleCheckResponse {
  isAdmin: boolean;
  error?: string;
}

export const roleService = {
  async checkAdminStatus(): Promise<RoleCheckResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { isAdmin: false, error: 'No active session' };
      }

      const { data, error } = await supabase.functions.invoke('check-admin', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking admin status:', error);
        return { isAdmin: false, error: error.message };
      }

      return data;
    } catch (error) {
      console.error('Unexpected error checking admin status:', error);
      return { isAdmin: false, error: 'Failed to check admin status' };
    }
  },

  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data?.map(r => r.role) || [];
    } catch (error) {
      console.error('Unexpected error fetching user roles:', error);
      return [];
    }
  },

  async getUsersByRole(role: 'admin' | 'moderator' | 'user' | 'mesa'): Promise<Array<{ id: string; email: string }>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session for getUsersByRole');
        return [];
      }

      // Use edge function to get users with emails
      const { data, error } = await supabase.functions.invoke('list-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      if (!data?.users) return [];

      // Filter users by role
      return data.users
        .filter((u: { id: string; email: string; roles: string[] }) => u.roles.includes(role))
        .map((u: { id: string; email: string }) => ({ id: u.id, email: u.email }));
    } catch (error) {
      console.error('Unexpected error fetching users by role:', error);
      return [];
    }
  },

  async assignRole(userId: string, role: 'admin' | 'moderator' | 'user' | 'mesa'): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role }]);
    
    if (error) throw error;
  },

  async removeRole(userId: string, role: 'admin' | 'moderator' | 'user' | 'mesa'): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);
    
    if (error) throw error;
  },
};
