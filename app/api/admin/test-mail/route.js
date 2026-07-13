import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function GET(request) {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || "587", 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  const from = process.env.SMTP_FROM || user

  try {
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
        rejectUnauthorized: false,
      },
    })

    // Verbindung testen
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) reject(error)
        else resolve(success)
      })
    })

    return NextResponse.json({
      success: true,
      message: "SMTP-Verbindung war erfolgreich!",
      config: {
        host,
        port,
        user,
        from,
        hasPassword: !!pass,
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      command: error.command,
      config: {
        host,
        port,
        user,
        from,
        hasPassword: !!pass,
      },
      stack: error.stack
    }, { status: 500 })
  }
}
