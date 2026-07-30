import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  // CORS headers
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
    // JWT verification is automatic with verify_jwt: true
    // If we reach here, the user is authenticated
    
    const token = Deno.env.get("WA_ENGINE_TOKEN");
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "WA_ENGINE_TOKEN not configured" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
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
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});
