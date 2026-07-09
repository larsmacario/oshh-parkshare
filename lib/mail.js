import nodemailer from "nodemailer"

export async function sendWelcomeEmail(email, fullName, password) {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || "587", 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  const from = process.env.SMTP_FROM || user

  if (!host || !user || !pass) {
    throw new Error("SMTP-Konfiguration fehlt in den Umgebungsvariablen (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)")
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true für 465, false für 587 (STARTTLS)
    auth: {
      user,
      pass,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false, // Hilfreich für Office365
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://parkshare.orendt.net"

  const mailOptions = {
    from: `"ParkShare" <${from}>`,
    to: email,
    subject: "Willkommen bei ParkShare – Dein Zugang",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f9fafb;
            color: #111827;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 580px;
            margin: 40px auto;
            background-color: #ffffff;
            border: 1px solid #f3f4f6;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            letter-spacing: -0.05em;
            color: #000000;
            margin-bottom: 8px;
            text-align: center;
          }
          .subtitle {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3em;
            color: #9ca3af;
            text-align: center;
            margin-bottom: 32px;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 16px;
            color: #111827;
          }
          p {
            font-size: 15px;
            line-height: 1.6;
            color: #4b5563;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .credentials-box {
            background-color: #f9fafb;
            border: 1px solid #f3f4f6;
            border-radius: 16px;
            padding: 20px;
            margin: 24px 0;
          }
          .credential-row {
            font-size: 14px;
            margin-bottom: 8px;
          }
          .credential-row:last-child {
            margin-bottom: 0;
          }
          .credential-label {
            font-weight: 600;
            color: #9ca3af;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.1em;
            display: inline-block;
            width: 150px;
          }
          .credential-value {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            color: #111827;
            font-weight: 600;
          }
          .btn-container {
            text-align: center;
            margin-top: 32px;
            margin-bottom: 32px;
          }
          .btn {
            background-color: #000000;
            color: #ffffff !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            display: inline-block;
            transition: opacity 0.2s;
          }
          .footer-text {
            font-size: 13px;
            color: #6b7280;
            margin-top: 32px;
            border-top: 1px solid #f3f4f6;
            padding-top: 24px;
          }
          .disclaimer {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 16px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">ParkShare</div>
          <div class="subtitle">Community Parking Platform</div>
          
          <h1>Hallo ${fullName},</h1>
          <p>willkommen bei ParkShare! Ein Administrator hat soeben ein Konto für dich auf unserer Plattform angelegt.</p>
          <p>Hier sind deine Zugangsdaten für den ersten Login:</p>
          
          <div class="credentials-box">
            <div class="credential-row">
              <span class="credential-label">E-Mail:</span>
              <span class="credential-value">${email}</span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Passwort:</span>
              <span class="credential-value">${password}</span>
            </div>
          </div>
          
          <div class="btn-container">
            <a href="${appUrl}/login" class="btn">Jetzt Anmelden</a>
          </div>
          
          <p class="footer-text">
            <strong>Wichtig:</strong> Nach dem ersten Login wirst du automatisch aufgefordert, dieses temporäre Passwort durch ein neues, eigenes Passwort zu ersetzen.
          </p>
          
          <p class="disclaimer">
            Diese E-Mail wurde automatisch generiert. Bitte antworte nicht direkt darauf.
          </p>
        </div>
      </body>
      </html>
    `,
  }

  await transporter.sendMail(mailOptions)
}
