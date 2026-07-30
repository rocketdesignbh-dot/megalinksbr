import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface WebhookPayload {
  type: string;
  data: {
    user: {
      id: string;
      email: string;
      email_change?: string;
      recovery_token?: string;
      confirmation_token?: string;
      new_email?: string;
    };
  };
}

const generateConfirmationUrl = (token: string): string => {
  const baseUrl = Deno.env.get("SUPABASE_URL") || "https://nxlfezpagporealqqbfj.supabase.co";
  return `${baseUrl}/auth/v1/verify?type=signup&token=${token}`;
};

const sendConfirmationEmail = async (
  email: string,
  confirmationUrl: string
): Promise<void> => {
  const htmlTemplate = `
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0c0c0e; margin: 0; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #18181f; border-radius: 12px; border: 1px solid #2a2a35; overflow: hidden; }
    .header { background: linear-gradient(135deg, rgba(245,197,24,.1), rgba(57,192,255,.05)); padding: 30px 20px; text-align: center; }
    .logo { font-size: 16px; font-weight: 800; color: #f0f0f4; margin-bottom: 8px; letter-spacing: 0.05em; }
    .logo-accent { color: #F5C518; }
    .tagline { margin: 8px 0 0; font-size: 11px; color: #9494a8; letter-spacing: 0.06em; text-transform: uppercase; }
    .content { padding: 30px 24px; }
    h1 { margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #f0f0f4; letter-spacing: -0.02em; }
    .subtitle { margin: 0 0 24px; font-size: 14px; color: #9494a8; line-height: 1.5; }
    .cta { display: block; background: #F5C518; color: #0c0c0e; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 700; margin: 24px auto; text-align: center; width: 200px; }
    .info { background: #111116; border-left: 3px solid #F5C518; padding: 16px; border-radius: 6px; font-size: 12px; color: #9494a8; margin: 24px 0; line-height: 1.6; }
    .footer { background: #111116; padding: 20px 24px; text-align: center; font-size: 11px; color: #55556a; border-top: 1px solid #2a2a35; }
    .footer a { color: #9494a8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Mega<span class="logo-accent">Links</span> Brasil</div>
      <p class="tagline">Plataforma de Automação para Afiliados</p>
    </div>
    
    <div class="content">
      <h1>🎉 Confirme seu e-mail</h1>
      <p class="subtitle">Bem-vindo à Mega Links BR! Para ativar sua conta e começar a automatizar suas ofertas, clique no botão abaixo.</p>
      
      <center>
        <a href="${confirmationUrl}" class="cta">Confirmar E-mail</a>
      </center>
      
      <div class="info">
        <strong>Não solicitou essa conta?</strong><br>
        Se você não se cadastrou, pode ignorar este e-mail com segurança. Sua conta não será ativada sem confirmação.
      </div>
      
      <p style="font-size: 12px; color: #55556a; margin: 20px 0 0;">
        Ou copie e cole este link:<br>
        <code style="background: #111116; padding: 4px 8px; border-radius: 4px; display: block; margin-top: 8px; word-break: break-all; font-size: 10px;">${confirmationUrl}</code>
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0; font-weight: 600;">© 2026 Mega Links Brasil. Todos os direitos reservados.</p>
      <p style="margin: 10px 0 0;"><a href="https://megalinksbr.com.br/privacidade.html">Privacidade</a> · <a href="https://megalinksbr.com.br/termos.html">Termos</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Mega Links Brasil <noreply@megalinksbr.com.br>",
      to: email,
      subject: "Confirme seu e-mail - Mega Links BR 🚀",
      html: htmlTemplate,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }
};

serve(async (req: Request) => {
  // Verifica se é POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Verifica se é um evento de sign up
    if (payload.type !== "user_signup") {
      return new Response(
        JSON.stringify({ message: "Event type not handled" }),
        { status: 200 }
      );
    }

    const { email, confirmation_token } = payload.data.user;

    // Valida dados
    if (!email || !confirmation_token) {
      return new Response(
        JSON.stringify({ error: "Missing email or confirmation token" }),
        { status: 400 }
      );
    }

    // Gera URL de confirmação
    const confirmationUrl = generateConfirmationUrl(confirmation_token);

    // Envia email
    await sendConfirmationEmail(email, confirmationUrl);

    return new Response(
      JSON.stringify({ message: "Email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
