import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// P35 (28/08): esta função entrega ao NAVEGADOR de qualquer conta autenticada o
// token de acesso ao wa-engine. Antes entregava o WA_ENGINE_TOKEN de serviço —
// o mesmo que, sem x-user-token, poe o pedido em "modo servidor" (ve todas as
// sessoes, manda por qualquer numero). Medido em 28/08: com o token cru e sem
// x-user-token, GET /sessions do wa-engine devolvia 7 sessoes contra 6 da
// chamada escopada. Agora ela entrega o WA_ENGINE_BROWSER_TOKEN, que o wa-engine
// SEMPRE obriga a vir com x-user-token — sem ele, nao ve nada.
//
// DEGRADACAO SEGURA: se WA_ENGINE_BROWSER_TOKEN ainda nao estiver nos secrets,
// cai para o WA_ENGINE_TOKEN de serviço, exatamente como antes. Assim esta
// versao pode ir pro ar antes de o segredo existir, sem quebrar o painel; o
// aperto de seguranca so entra quando os secrets forem configurados (ver runbook).
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // JWT verificado automaticamente (verify_jwt: true).
    const browserToken = Deno.env.get("WA_ENGINE_BROWSER_TOKEN");
    const serviceToken = Deno.env.get("WA_ENGINE_TOKEN");
    const token = browserToken || serviceToken;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "WA_ENGINE token not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ token, wa_engine_url: "https://megalinksbr-wa-engine.fwezsn.easypanel.host" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
