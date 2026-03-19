import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get assignment by token
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from("mesa_assignments")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (assignError || !assignment) {
      return new Response(
        JSON.stringify({ error: "Asignación no encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET: Return assignment + match details
    if (req.method === "GET" || action === "get") {
      const { data: match } = await supabaseAdmin
        .from("matches")
        .select("*")
        .eq("id", assignment.match_id)
        .single();

      if (!match) {
        return new Response(
          JSON.stringify({ error: "Partido no encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get team names
      const { data: homeTeam } = await supabaseAdmin
        .from("teams")
        .select("id, name, logo_url")
        .eq("id", match.home_team_id)
        .single();

      const { data: awayTeam } = await supabaseAdmin
        .from("teams")
        .select("id, name, logo_url")
        .eq("id", match.away_team_id)
        .single();

      // Get event info
      const { data: event } = await supabaseAdmin
        .from("events")
        .select("id, title, date, location")
        .eq("id", match.event_id)
        .single();

      // Get field + facility info
      let facility = null;
      let field = null;
      if (match.field_id) {
        const { data: fieldData } = await supabaseAdmin
          .from("fields")
          .select("id, name, facility_id")
          .eq("id", match.field_id)
          .single();
        field = fieldData;

        if (fieldData?.facility_id) {
          const { data: facilityData } = await supabaseAdmin
            .from("facilities")
            .select("id, name, address, city")
            .eq("id", fieldData.facility_id)
            .single();
          facility = facilityData;
        }
      }

      // Get category info
      let category = null;
      if (match.category_id) {
        const { data: eventCat } = await supabaseAdmin
          .from("event_categories")
          .select("id, category_id")
          .eq("id", match.category_id)
          .single();
        if (eventCat) {
          const { data: catData } = await supabaseAdmin
            .from("categories")
            .select("id, name, age_group")
            .eq("id", eventCat.category_id)
            .single();
          category = catData;
        }
      }

      return new Response(
        JSON.stringify({
          assignment,
          match,
          homeTeam,
          awayTeam,
          event,
          facility,
          field,
          category,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Handle actions (accept, reject, update_match)
    if (req.method === "POST") {
      const body = await req.json();

      if (action === "accept") {
        const { error } = await supabaseAdmin
          .from("mesa_assignments")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", assignment.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Asignación aceptada" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "reject") {
        const { error } = await supabaseAdmin
          .from("mesa_assignments")
          .update({ status: "rejected" })
          .eq("id", assignment.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Asignación rechazada" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "update_match") {
        if (assignment.status !== "accepted") {
          return new Response(
            JSON.stringify({ error: "Debes aceptar la asignación primero" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { updates } = body;
        if (!updates) {
          return new Response(
            JSON.stringify({ error: "No hay actualizaciones" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Only allow specific fields to be updated
        const allowedFields = [
          "home_score", "away_score",
          "home_yellow_cards", "home_red_cards",
          "away_yellow_cards", "away_red_cards",
          "status", "started_at",
        ];

        const safeUpdates: Record<string, unknown> = {};
        for (const key of allowedFields) {
          if (updates[key] !== undefined) {
            safeUpdates[key] = updates[key];
          }
        }

        const { error } = await supabaseAdmin
          .from("matches")
          .update(safeUpdates)
          .eq("id", assignment.match_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Acción no válida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Método no permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
