import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";

type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string; redirect_uris?: string[] };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

// Narrow local typing over the beta supabase.auth.oauth namespace.
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};

function getOAuth(): OAuthNs {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.auth as any).oauth as OAuthNs;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Falta el parámetro authorization_id.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? null);
      try {
        const { data, error } = await getOAuth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar la autorización.");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await getOAuth().approveAuthorization(authorizationId)
        : await getOAuth().denyAuthorization(authorizationId);
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setError("El servidor de autorización no devolvió una URL de redirección.");
        setBusy(false);
        return;
      }
      window.location.href = target;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ha ocurrido un error.");
      setBusy(false);
    }
  }

  const clientName = details?.client?.name ?? "una aplicación externa";
  const redirectUri = details?.client?.redirect_uris?.[0];
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-blue-50 dark:from-gray-900 dark:via-background dark:to-gray-800 py-12 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold">
            Conectar {clientName} a FEMD Eventos
          </CardTitle>
          <CardDescription>
            {clientName} podrá utilizar las herramientas de la app como tú mientras tengas la sesión iniciada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {!details && !error && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando autorización…
            </div>
          )}
          {details && (
            <div className="space-y-3 text-sm">
              {email && (
                <div>
                  <div className="text-muted-foreground text-xs">Cuenta</div>
                  <div className="font-medium">{email}</div>
                </div>
              )}
              {redirectUri && (
                <div>
                  <div className="text-muted-foreground text-xs">URL de retorno</div>
                  <div className="font-mono text-xs break-all">{redirectUri}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground text-xs mb-1">Permisos solicitados</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Identificarse como tu cuenta de FEMD Eventos</li>
                  {scopes.includes("email") && <li>Ver tu dirección de correo</li>}
                  {scopes.includes("profile") && <li>Ver tu perfil básico</li>}
                  <li>Llamar a las herramientas MCP habilitadas en la app</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Esto no salta las políticas de acceso ni los permisos internos de la app.
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy || !details}
              onClick={() => decide(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={busy || !details}
              onClick={() => decide(true)}
            >
              {busy ? "Procesando…" : "Aprobar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
