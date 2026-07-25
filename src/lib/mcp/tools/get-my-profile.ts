import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_profile",
  title: "Mi perfil",
  description:
    "Devuelve el perfil del usuario autenticado en FEMD Eventos (id, email, nombre) y sus roles asignados (admin, mesa, moderator, user).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado." }], isError: true };
    }
    const userId = ctx.getUserId();
    const email = ctx.getUserEmail();
    const supabase = supabaseForUser(ctx);

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const profile = {
      id: userId,
      email,
      roles: (rolesData ?? []).map((r: { role: string }) => r.role),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      structuredContent: { profile },
    };
  },
});
