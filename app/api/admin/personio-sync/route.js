import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseAdminClient } from "@/lib/supabase-admin"
import { runPersonioTodaySync } from "@/lib/personio-sync"

function getAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

async function ensureAdmin(request) {
  const supabaseAuth = getAuthClient()
  const supabaseAdmin = getSupabaseAdminClient()
  const authHeader = request.headers.get("authorization")
  if (!authHeader) throw new Error("Nicht autorisiert")

  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
  if (error || !user) throw new Error("Nicht autorisiert")

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") throw new Error("Nur Admins erlaubt")
  return supabaseAdmin
}

export async function POST(request) {
  try {
    const supabaseAdmin = await ensureAdmin(request)
    const summary = await runPersonioTodaySync(supabaseAdmin)
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    const status = error.message === "Nicht autorisiert" ? 401 : error.message === "Nur Admins erlaubt" ? 403 : 500
    return NextResponse.json({ error: error.message || "Fehler beim manuellen Abgleich" }, { status })
  }
}
