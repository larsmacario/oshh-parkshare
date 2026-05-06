import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase-admin"
import { runPersonioTodaySync } from "@/lib/personio-sync"

function isAuthorizedCronRequest(request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return true

  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  return token === expected
}

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient()
    const summary = await runPersonioTodaySync(supabaseAdmin)
    return NextResponse.json({
      success: true,
      ...summary,
    })
  } catch (error) {
    console.error("Personio sync error:", error)
    return NextResponse.json(
      { error: "Personio-Sync fehlgeschlagen", details: error.message },
      { status: 500 }
    )
  }
}
