import { getTodayFullDayAbsences } from "@/lib/personio"

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

export async function runPersonioTodaySync(supabaseAdmin) {
  const { date, absences } = await getTodayFullDayAbsences()
  const syncedAt = new Date().toISOString()

  const emailSet = [...new Set(absences.map((entry) => normalizeEmail(entry.email)).filter(Boolean))]
  let matchedOwners = []
  let releases = []

  if (emailSet.length > 0) {
    const { data: ownerProfiles, error: ownerError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .in("email", emailSet)
      .eq("role", "owner")

    if (ownerError) {
      throw new Error(`Owner-Query fehlgeschlagen: ${ownerError.message}`)
    }

    const ownerIdByEmail = new Map(
      (ownerProfiles || []).map((profile) => [normalizeEmail(profile.email), profile.id])
    )
    matchedOwners = [...new Set(emailSet.map((email) => ownerIdByEmail.get(email)).filter(Boolean))]

    if (matchedOwners.length > 0) {
      const { data: assignments, error: assignmentsError } = await supabaseAdmin
        .from("spot_assignments")
        .select("spot_id, user_id")
        .in("user_id", matchedOwners)
        .lte("valid_from", date)
        .or(`valid_until.is.null,valid_until.gte.${date}`)

      if (assignmentsError) {
        throw new Error(`Assignment-Query fehlgeschlagen: ${assignmentsError.message}`)
      }

      const uniqueBySpotAndOwner = new Map()
      ;(assignments || []).forEach((assignment) => {
        const key = `${assignment.spot_id}:${assignment.user_id}`
        if (!uniqueBySpotAndOwner.has(key)) {
          uniqueBySpotAndOwner.set(key, {
            spot_id: assignment.spot_id,
            released_by: assignment.user_id,
            date,
          })
        }
      })
      releases = [...uniqueBySpotAndOwner.values()]
    }
  }

  let upsertedRows = []
  if (releases.length > 0) {
    const { data, error: upsertError } = await supabaseAdmin
      .from("availabilities")
      .upsert(releases, { onConflict: "spot_id,date" })
      .select("id")

    if (upsertError) {
      throw new Error(`Freigabe-Upsert fehlgeschlagen: ${upsertError.message}`)
    }
    upsertedRows = data || []
  }

  const syncSummary = {
    date,
    syncedAt,
    absences: absences.length,
    matchedOwners: matchedOwners.length,
    releasedRows: upsertedRows.length,
  }

  const { error: settingsError } = await supabaseAdmin
    .from("app_settings")
    .upsert(
      [
        { key: "personio_last_sync_at", value: syncedAt, updated_at: syncedAt },
        { key: "personio_last_sync_summary", value: JSON.stringify(syncSummary), updated_at: syncedAt },
      ],
      { onConflict: "key" }
    )

  if (settingsError) {
    throw new Error(`Speichern von personio_last_sync_* fehlgeschlagen: ${settingsError.message}`)
  }

  return syncSummary
}
