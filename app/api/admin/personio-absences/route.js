import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseAdminClient } from "@/lib/supabase-admin"
import { getFullDayAbsencesInRange } from "@/lib/personio"

function getAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

function toBerlinDateParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  })
  const parts = formatter.formatToParts(new Date())
  const valueByType = {}
  parts.forEach((part) => {
    valueByType[part.type] = part.value
  })
  return valueByType
}

function getCurrentWeekRangeBerlin() {
  const parts = toBerlinDateParts()
  const current = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`)
  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  const weekday = weekdayMap[parts.weekday] || 1
  const monday = new Date(current)
  monday.setUTCDate(current.getUTCDate() - (weekday - 1))
  const friday = new Date(monday)
  friday.setUTCDate(monday.getUTCDate() + 4)
  const iso = (date) => date.toISOString().slice(0, 10)
  return { startDate: iso(monday), endDate: iso(friday) }
}

function getWeekDays(startDate) {
  const labels = ["Mo", "Di", "Mi", "Do", "Fr"]
  const start = new Date(`${startDate}T00:00:00Z`)
  return labels.map((label, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    return { label, date: date.toISOString().slice(0, 10) }
  })
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

export async function GET(request) {
  try {
    const supabaseAdmin = await ensureAdmin(request)
    const { startDate, endDate } = getCurrentWeekRangeBerlin()
    const weekDays = getWeekDays(startDate)
    const { absences } = await getFullDayAbsencesInRange(startDate, endDate)

    const { data: owners, error: ownersError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("role", "owner")
      .order("full_name")

    if (ownersError) throw new Error(ownersError.message)

    const ownerByEmail = new Map((owners || []).map((o) => [normalizeEmail(o.email), o]))
    const absentDatesByOwnerId = new Map()

    absences.forEach((absence) => {
      const owner = ownerByEmail.get(normalizeEmail(absence.email))
      if (!owner) return
      const set = absentDatesByOwnerId.get(owner.id) || new Set()
      weekDays.forEach((day) => {
        if (absence.startDate <= day.date && absence.endDate >= day.date) {
          set.add(day.date)
        }
      })
      absentDatesByOwnerId.set(owner.id, set)
    })

    const rows = (owners || []).map((owner) => {
      const absentDates = absentDatesByOwnerId.get(owner.id) || new Set()
      return {
        ownerId: owner.id,
        ownerName: owner.full_name,
        ownerEmail: owner.email,
        days: weekDays.map((day) => ({
          date: day.date,
          label: day.label,
          isAbsent: absentDates.has(day.date),
        })),
      }
    })

    const { data: lastSync } = await supabaseAdmin
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", "personio_last_sync_at")
      .single()

    return NextResponse.json({
      success: true,
      week: { startDate, endDate, days: weekDays },
      lastSyncAt: lastSync?.value || null,
      rows,
    })
  } catch (error) {
    const status = error.message === "Nicht autorisiert" ? 401 : error.message === "Nur Admins erlaubt" ? 403 : 500
    return NextResponse.json({ error: error.message || "Fehler beim Laden der Abwesenheiten" }, { status })
  }
}
