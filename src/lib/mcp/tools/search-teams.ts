import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_teams",
  title: "Buscar equipos / clubes",
  description:
    "Busca equipos o clubes por coincidencia parcial en el nombre. Devuelve id, nombre, categoría y logo.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Texto a buscar en el nombre del equipo."),
    limit: z.number().int().min(1).max(50).optional().describe("Máximo de resultados (por defecto 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, logo_url, parent_team_id, team_group")
      .ilike("name", `%${query}%`)
      .order("name", { ascending: true })
      .limit(limit ?? 20);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { teams: data ?? [] },
    };
  },
});
