import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTournaments from "./tools/list-tournaments";
import getTournamentStandings from "./tools/get-tournament-standings";
import listLiveMatches from "./tools/list-live-matches";
import searchTeams from "./tools/search-teams";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "femd-eventos-mcp",
  title: "FEMD Eventos MCP",
  version: "0.1.0",
  instructions:
    "Herramientas de FEMD Eventos: consulta torneos, clasificaciones, partidos en vivo, equipos y tu propio perfil. Todas las llamadas se ejecutan como el usuario autenticado y respetan sus permisos.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listTournaments,
    getTournamentStandings,
    listLiveMatches,
    searchTeams,
    getMyProfile,
  ],
});
