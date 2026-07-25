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
  name: "list_live_matches",
  title: "Partidos en vivo",
  description:
    "Devuelve los partidos actualmente en juego (status = 'in_progress') con marcador, equipos y torneo. Opcionalmente filtra por evento.",
  inputSchema: {
    event_id: z
      .string()
      .uuid()
      .optional()
      .describe("ID del torneo para filtrar. Si se omite, devuelve todos los partidos en vivo."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ event_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("matches")
      .select(
        "id, event_id, phase, group_name, match_date, started_at, status, home_score, away_score, home_team_id, away_team_id, home_placeholder, away_placeholder, events(title), home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)",
      )
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(50);

    if (event_id) q = q.eq("event_id", event_id);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { matches: data ?? [] },
    };
  },
});
