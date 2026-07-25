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
  name: "list_tournaments",
  title: "Listar torneos",
  description:
    "Devuelve los torneos (eventos) de FEMD Eventos ordenados por fecha descendente. Útil para saber qué torneos existen, cuándo se juegan y dónde.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Máximo de torneos a devolver (por defecto 20)."),
    upcoming_only: z
      .boolean()
      .optional()
      .describe("Si es true, solo devuelve torneos cuya fecha final es hoy o posterior."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, upcoming_only }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("events")
      .select("id, title, date, end_date, location, description, poster_url")
      .order("date", { ascending: false })
      .limit(limit ?? 20);

    if (upcoming_only) {
      const today = new Date().toISOString().slice(0, 10);
      query = query.gte("date", today);
    }

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { tournaments: data ?? [] },
    };
  },
});
