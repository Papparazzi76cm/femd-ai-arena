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
  name: "get_tournament_standings",
  title: "Clasificación de un torneo",
  description:
    "Devuelve la clasificación (grupos) de un torneo dado por su id. Incluye equipos, puntos, PJ, PG/PE/PP, GF/GC, DG y tarjetas.",
  inputSchema: {
    event_id: z.string().uuid().describe("ID del torneo (events.id)."),
    category_id: z
      .string()
      .uuid()
      .optional()
      .describe("ID opcional de categoría para filtrar solo esa categoría."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_id, category_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    let q = supabase
      .from("event_teams")
      .select(
        "id, group_name, points, matches_played, wins, draws, losses, goals_for, goals_against, goal_difference, yellow_cards, red_cards, team_id, category_id, teams(name, logo_url), categories(name)",
      )
      .eq("event_id", event_id)
      .order("group_name", { ascending: true })
      .order("points", { ascending: false });

    if (category_id) q = q.eq("category_id", category_id);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { standings: data ?? [] },
    };
  },
});
