import { createClient } from "@supabase/supabase-js"
import { getToday } from "@/lib/dates"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn("Supabase environment variables are missing. Check your .env.local file.")
  }
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Use localstorage for locking to avoid Navigator LockManager timeouts
      lockType: 'localstorage'
    }
  }
)

const OWNER_AVAIL_TABLE = "spot_owner_availabilities"
const LEGACY_AVAIL_TABLE = "availabilities"
const OWNER_RECURRING_TABLE = "recurring_owner_availabilities"
const LEGACY_RECURRING_TABLE = "recurring_availabilities"

function isMissingTableError(error) {
  return error?.code === "42P01"
}

function buildOwnerSet(rows = [], ownerKey = "owner_id") {
  const map = {}
  rows.forEach((row) => {
    if (!row?.spot_id || !row?.[ownerKey]) return
    if (!map[row.spot_id]) map[row.spot_id] = new Set()
    map[row.spot_id].add(row[ownerKey])
  })
  return map
}

// ─── AUTH ─────────────────────────────────────────────────────

export async function signUp(email, password, fullName, role = "flexible") {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  })
  return { data, error }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function requestPasswordReset(email, redirectTo) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  return { data, error }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  return profile
}

// ─── PROFILES ─────────────────────────────────────────────────

export async function getProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name")
  return { data, error }
}

export async function updateProfile(id, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  return { data, error }
}

// ─── PARKING SPOTS ────────────────────────────────────────────

export async function getSpots() {
  const { data, error } = await supabase
    .from("parking_spots")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
  return { data, error }
}

export async function createSpot(label, zone = "Hauptparkplatz", sortOrder = 0) {
  const { data, error } = await supabase
    .from("parking_spots")
    .insert({ label, zone, sort_order: sortOrder })
    .select()
    .single()
  return { data, error }
}

export async function updateSpot(id, updates) {
  const { data, error } = await supabase
    .from("parking_spots")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  return { data, error }
}

export async function deleteSpot(id) {
  const { data, error } = await supabase
    .from("parking_spots")
    .delete()
    .eq("id", id)
  return { data, error }
}

// ─── SPOT BLOCKS (owner overrides for recurring/permanent) ──────

export async function getMyBlocks(userId, fromDate, toDate, spotId = null) {
  let query = supabase
    .from("spot_blocks")
    .select("*")
    .eq("blocked_by", userId)
    .gte("date", fromDate)
    .lte("date", toDate)
  if (spotId) query = query.eq("spot_id", spotId)
  const { data, error } = await query.order("date")
  return { data, error }
}

export async function blockSpot(spotId, userId, date) {
  const { data, error } = await supabase
    .from("spot_blocks")
    .insert({ spot_id: spotId, blocked_by: userId, date })
    .select()
    .single()
  return { data, error }
}

export async function unblockSpot(blockId) {
  const { data, error } = await supabase
    .from("spot_blocks")
    .delete()
    .eq("id", blockId)
  return { data, error }
}

export async function togglePermanentRelease(spotId, isPermanentlyReleased) {
  const { data, error } = await supabase
    .from("parking_spots")
    .update({ is_permanently_released: isPermanentlyReleased })
    .eq("id", spotId)
    .select()
    .single()
  return { data, error }
}

// ─── SPOT ASSIGNMENTS ─────────────────────────────────────────

export async function getAssignments() {
  const { data, error } = await supabase
    .from("spot_assignments")
    .select(`
      *,
      spot:parking_spots(id, label, zone),
      user:profiles(id, full_name, email)
    `)
    .is("valid_until", null)
    .order("created_at", { ascending: false })
  return { data, error }
}

export async function getMyAssignments(userId) {
  const { data, error } = await supabase
    .from("spot_assignments")
    .select(`
      *,
      spot:parking_spots(id, label, zone, is_permanently_released)
    `)
    .eq("user_id", userId)
    .is("valid_until", null)
    .order("created_at", { ascending: false })
  return { data, error }
}

export async function assignSpot(spotId, userId) {
  // Add owner to spot (multiple owners allowed)
  const { data, error } = await supabase
    .from("spot_assignments")
    .insert({ spot_id: spotId, user_id: userId })
    .select()
    .single()
  return { data, error }
}

export async function unassignSpot(assignmentId) {
  const { data, error } = await supabase
    .from("spot_assignments")
    .update({ valid_until: getToday() })
    .eq("id", assignmentId)
    .select()
    .single()
  return { data, error }
}

// ─── RECURRING AVAILABILITIES ────────────────────────────────

// Get all recurring weekday availabilities for a user (weekday: 1=Mo … 5=Fr)
export async function getRecurringAvailabilities(userId, spotId = null) {
  let query = supabase
    .from(OWNER_RECURRING_TABLE)
    .select("*")
    .eq("owner_id", userId)
  if (spotId) query = query.eq("spot_id", spotId)
  const ownerResult = await query.order("weekday")
  if (!isMissingTableError(ownerResult.error)) return ownerResult

  let legacyQuery = supabase
    .from(LEGACY_RECURRING_TABLE)
    .select("*")
    .eq("owner_id", userId)
  if (spotId) legacyQuery = legacyQuery.eq("spot_id", spotId)
  return await legacyQuery.order("weekday")
}

export async function addRecurringAvailability(spotId, userId, weekday) {
  const ownerResult = await supabase
    .from(OWNER_RECURRING_TABLE)
    .insert({ spot_id: spotId, owner_id: userId, weekday })
    .select()
    .single()
  if (!isMissingTableError(ownerResult.error)) return ownerResult

  return await supabase
    .from(LEGACY_RECURRING_TABLE)
    .insert({ spot_id: spotId, owner_id: userId, weekday })
    .select()
    .single()
}

export async function removeRecurringAvailability(id) {
  const ownerResult = await supabase
    .from(OWNER_RECURRING_TABLE)
    .delete()
    .eq("id", id)
  if (!isMissingTableError(ownerResult.error)) return ownerResult

  return await supabase
    .from(LEGACY_RECURRING_TABLE)
    .delete()
    .eq("id", id)
}

// Admin helper: load recurring weekday releases for a list of spots
export async function getRecurringAvailabilitiesForSpots(spotIds = []) {
  if (!spotIds || spotIds.length === 0) return { data: [], error: null }

  const ownerResult = await supabase
    .from(OWNER_RECURRING_TABLE)
    .select("*")
    .in("spot_id", spotIds)
    .order("spot_id")
    .order("weekday")
  if (!isMissingTableError(ownerResult.error)) return ownerResult

  return await supabase
    .from(LEGACY_RECURRING_TABLE)
    .select("*")
    .in("spot_id", spotIds)
    .order("spot_id")
    .order("weekday")
}

// ─── AVAILABILITIES ───────────────────────────────────────────

export async function getAvailabilities(fromDate, toDate) {
  const { data, error } = await supabase
    .from("availabilities")
    .select(`
      *,
      spot:parking_spots(id, label, zone),
      released_by_user:profiles!released_by(id, full_name)
    `)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date")
  return { data, error }
}

export async function getMyAvailabilities(userId, fromDate, toDate, spotId = null) {
  let query = supabase
    .from(OWNER_AVAIL_TABLE)
    .select(`id, spot_id, owner_id, date, created_at, spot:parking_spots(id, label, zone)`)
    .eq("owner_id", userId)
    .gte("date", fromDate)
    .lte("date", toDate)
  if (spotId) query = query.eq("spot_id", spotId)
  const ownerResult = await query.order("date")
  if (!isMissingTableError(ownerResult.error)) return ownerResult

  let legacyQuery = supabase
    .from(LEGACY_AVAIL_TABLE)
    .select(`*, spot:parking_spots(id, label, zone)`)
    .eq("released_by", userId)
    .gte("date", fromDate)
    .lte("date", toDate)
  if (spotId) legacyQuery = legacyQuery.eq("spot_id", spotId)
  return await legacyQuery.order("date")
}

export async function releaseSpot(spotId, userId, date) {
  const ownerResult = await supabase
    .from(OWNER_AVAIL_TABLE)
    .upsert(
      [{ spot_id: spotId, owner_id: userId, date }],
      { onConflict: "spot_id,owner_id,date" }
    )
    .select()
    .single()
  if (!isMissingTableError(ownerResult.error)) return ownerResult

  return await supabase
    .from(LEGACY_AVAIL_TABLE)
    .insert({ spot_id: spotId, released_by: userId, date })
    .select()
    .single()
}

export async function releaseSpotsMultiple(spotId, userId, dates) {
  const ownerRows = dates.map((date) => ({
    spot_id: spotId,
    owner_id: userId,
    date,
  }))
  const ownerResult = await supabase
    .from(OWNER_AVAIL_TABLE)
    .upsert(ownerRows, { onConflict: "spot_id,owner_id,date" })
    .select()
  if (!isMissingTableError(ownerResult.error)) return ownerResult

  const legacyRows = dates.map((date) => ({
    spot_id: spotId,
    released_by: userId,
    date,
  }))
  return await supabase
    .from(LEGACY_AVAIL_TABLE)
    .upsert(legacyRows, { onConflict: "spot_id,date" })
    .select()
}

/** Aktive Zuweisungen am Kalendertag (ISO-Datum) */
function assignmentActiveOnDate(a, dateStr) {
  const fromOk = !a.valid_from || a.valid_from <= dateStr
  const untilOk = !a.valid_until || a.valid_until >= dateStr
  return fromOk && untilOk
}

/**
 * Heute (oder mehrere Tage) für ALLE aktuell zugewiesenen Inhaber freigeben.
 * Für Admin-Panel: erfüllt die Multi-Owner-Regel (alle müssen freigegeben haben).
 */
export async function releaseSpotDatesForAllOwners(spotId, dates) {
  const list = (dates || []).filter(Boolean)
  if (list.length === 0) return { data: [], error: null }

  const minD = list.reduce((a, b) => (a < b ? a : b))
  const maxD = list.reduce((a, b) => (a > b ? a : b))

  const { data: assignments, error: assignError } = await supabase
    .from("spot_assignments")
    .select("user_id, valid_from, valid_until")
    .eq("spot_id", spotId)
    .lte("valid_from", maxD)
    .or(`valid_until.is.null,valid_until.gte.${minD}`)

  if (assignError) return { data: null, error: assignError }

  const rows = []
  for (const date of list) {
    const ownerIds = [
      ...new Set(
        (assignments || [])
          .filter((a) => assignmentActiveOnDate(a, date))
          .map((a) => a.user_id)
          .filter(Boolean),
      ),
    ]
    for (const owner_id of ownerIds) {
      rows.push({ spot_id: spotId, owner_id, date })
    }
  }

  if (rows.length === 0) {
    return {
      data: [],
      error: { message: "Keine Inhaber zugewiesen — bitte zuerst mindestens einen Inhaber zuweisen." },
    }
  }

  const ownerResult = await supabase
    .from(OWNER_AVAIL_TABLE)
    .upsert(rows, { onConflict: "spot_id,owner_id,date" })
    .select()

  if (!isMissingTableError(ownerResult.error)) return ownerResult

  const legacyRows = []
  for (const date of list) {
    const firstOwner = (assignments || []).find((a) => assignmentActiveOnDate(a, date))?.user_id
    if (firstOwner) {
      legacyRows.push({ spot_id: spotId, released_by: firstOwner, date })
    }
  }
  if (legacyRows.length === 0) {
    return { data: [], error: { message: "Keine Inhaber zugewiesen." } }
  }
  return await supabase
    .from(LEGACY_AVAIL_TABLE)
    .upsert(legacyRows, { onConflict: "spot_id,date" })
    .select()
}

/**
 * Wochentag-Freigabe für alle aktuell zugewiesenen Inhaber (unbefristete Zuweisungen).
 */
export async function upsertRecurringWeekdayForAllOwners(spotId, weekday) {
  const { data: assignments, error } = await supabase
    .from("spot_assignments")
    .select("user_id")
    .eq("spot_id", spotId)
    .is("valid_until", null)

  if (error) return { data: null, error }

  const ownerIds = [...new Set((assignments || []).map((a) => a.user_id).filter(Boolean))]
  if (ownerIds.length === 0) {
    return {
      data: [],
      error: { message: "Keine Inhaber zugewiesen." },
    }
  }

  const rows = ownerIds.map((owner_id) => ({ spot_id: spotId, owner_id, weekday }))
  const ownerResult = await supabase
    .from(OWNER_RECURRING_TABLE)
    .upsert(rows, { onConflict: "spot_id,owner_id,weekday" })
    .select()

  if (!isMissingTableError(ownerResult.error)) return ownerResult

  return await supabase
    .from(LEGACY_RECURRING_TABLE)
    .upsert(rows, { onConflict: "spot_id,owner_id,weekday" })
    .select()
}

/** Alle recurring-Freigaben für einen Wochentag an diesem Spot entfernen (alle Inhaber). */
export async function deleteRecurringWeekdayForSpot(spotId, weekday) {
  const ownerResult = await supabase
    .from(OWNER_RECURRING_TABLE)
    .delete()
    .eq("spot_id", spotId)
    .eq("weekday", weekday)

  if (!isMissingTableError(ownerResult.error)) return ownerResult

  return await supabase
    .from(LEGACY_RECURRING_TABLE)
    .delete()
    .eq("spot_id", spotId)
    .eq("weekday", weekday)
}

export async function unreleaseSpot(availabilityId) {
  const ownerResult = await supabase
    .from(OWNER_AVAIL_TABLE)
    .delete()
    .eq("id", availabilityId)
  if (!isMissingTableError(ownerResult.error)) return ownerResult

  return await supabase
    .from(LEGACY_AVAIL_TABLE)
    .delete()
    .eq("id", availabilityId)
}

export async function getSpotReleaseProgress(spotId, fromDate, toDate) {
  const { data: assignments, error: assignmentError } = await supabase
    .from("spot_assignments")
    .select("user_id, valid_from, valid_until")
    .eq("spot_id", spotId)
    .lte("valid_from", toDate)
    .or(`valid_until.is.null,valid_until.gte.${fromDate}`)
  if (assignmentError) return { data: null, error: assignmentError }

  const ownerResult = await supabase
    .from(OWNER_AVAIL_TABLE)
    .select("spot_id, owner_id, date")
    .eq("spot_id", spotId)
    .gte("date", fromDate)
    .lte("date", toDate)
  if (!isMissingTableError(ownerResult.error)) {
    return { data: { assignments: assignments || [], approvals: ownerResult.data || [] }, error: ownerResult.error }
  }

  const legacyResult = await supabase
    .from(LEGACY_AVAIL_TABLE)
    .select("spot_id, released_by, date")
    .eq("spot_id", spotId)
    .gte("date", fromDate)
    .lte("date", toDate)
  const normalized = (legacyResult.data || []).map((row) => ({
    spot_id: row.spot_id,
    owner_id: row.released_by,
    date: row.date,
  }))
  return { data: { assignments: assignments || [], approvals: normalized }, error: legacyResult.error }
}

export async function getSpotRecurringReleaseProgress(spotId) {
  const { data: assignments, error: assignmentError } = await supabase
    .from("spot_assignments")
    .select("user_id, valid_from, valid_until")
    .eq("spot_id", spotId)
    .is("valid_until", null)
  if (assignmentError) return { data: null, error: assignmentError }

  const ownerResult = await supabase
    .from(OWNER_RECURRING_TABLE)
    .select("spot_id, owner_id, weekday")
    .eq("spot_id", spotId)
  if (!isMissingTableError(ownerResult.error)) {
    return { data: { assignments: assignments || [], approvals: ownerResult.data || [] }, error: ownerResult.error }
  }

  const legacyResult = await supabase
    .from(LEGACY_RECURRING_TABLE)
    .select("spot_id, owner_id, weekday")
    .eq("spot_id", spotId)
  return { data: { assignments: assignments || [], approvals: legacyResult.data || [] }, error: legacyResult.error }
}

// ─── RESERVATIONS ─────────────────────────────────────────────

export async function getAvailableSpotsForDate(date) {
  const jsDay = new Date(date).getDay()
  const weekday = jsDay >= 1 && jsDay <= 5 ? jsDay : 0

  const { data: spots, error: spotsError } = await supabase
    .from("parking_spots")
    .select("id, label, zone, sort_order, is_permanently_released")
    .eq("is_active", true)
  if (spotsError) return { data: null, error: spotsError }

  const { data: assignments, error: assignmentError } = await supabase
    .from("spot_assignments")
    .select("spot_id, user_id, user:profiles(id, full_name)")
    .lte("valid_from", date)
    .or(`valid_until.is.null,valid_until.gte.${date}`)
  if (assignmentError) return { data: null, error: assignmentError }

  const ownerBySpot = {}
  const ownerIdsBySpot = {}
  ; (assignments || []).forEach((a) => {
    if (!ownerBySpot[a.spot_id]) ownerBySpot[a.spot_id] = []
    if (!ownerIdsBySpot[a.spot_id]) ownerIdsBySpot[a.spot_id] = new Set()
    if (a.user) ownerBySpot[a.spot_id].push(a.user)
    if (a.user_id) ownerIdsBySpot[a.spot_id].add(a.user_id)
  })

  const ownerDayResult = await supabase
    .from(OWNER_AVAIL_TABLE)
    .select("id, spot_id, owner_id, date")
    .eq("date", date)
  const ownerDayRows = !isMissingTableError(ownerDayResult.error) ? (ownerDayResult.data || []) : []
  const ownerDayError = !isMissingTableError(ownerDayResult.error) ? ownerDayResult.error : null

  const legacyDayResult = await supabase
    .from(LEGACY_AVAIL_TABLE)
    .select("id, spot_id, released_by")
    .eq("date", date)
  const legacyDayRows = legacyDayResult.data || []
  const legacyDayError = legacyDayResult.error

  const ownerRecurringRows = []
  let ownerRecurringError = null
  if (weekday >= 1 && weekday <= 5) {
    const ownerRecurringResult = await supabase
      .from(OWNER_RECURRING_TABLE)
      .select("spot_id, owner_id, weekday")
      .eq("weekday", weekday)
    if (!isMissingTableError(ownerRecurringResult.error)) {
      ownerRecurringRows.push(...(ownerRecurringResult.data || []))
      ownerRecurringError = ownerRecurringResult.error
    }
  }

  const legacyRecurringRows = []
  let legacyRecurringError = null
  if (weekday >= 1 && weekday <= 5) {
    const legacyRecurringResult = await supabase
      .from(LEGACY_RECURRING_TABLE)
      .select("spot_id, owner_id, weekday")
      .eq("weekday", weekday)
    legacyRecurringRows.push(...(legacyRecurringResult.data || []))
    legacyRecurringError = legacyRecurringResult.error
  }

  if (ownerDayError || legacyDayError || ownerRecurringError || legacyRecurringError) {
    return { data: null, error: ownerDayError || legacyDayError || ownerRecurringError || legacyRecurringError }
  }

  const dayOwnerMap = buildOwnerSet(ownerDayRows)
  ; (legacyDayRows || []).forEach((row) => {
    if (!row?.spot_id) return
    if (!dayOwnerMap[row.spot_id]) dayOwnerMap[row.spot_id] = new Set()
    if (row.released_by) dayOwnerMap[row.spot_id].add(row.released_by)
  })

  const recurringOwnerMap = buildOwnerSet(ownerRecurringRows)
  ; (legacyRecurringRows || []).forEach((row) => {
    if (!row?.spot_id) return
    if (!recurringOwnerMap[row.spot_id]) recurringOwnerMap[row.spot_id] = new Set()
    if (row.owner_id) recurringOwnerMap[row.spot_id].add(row.owner_id)
  })

  const { data: blocks } = await supabase
    .from("spot_blocks")
    .select("spot_id")
    .eq("date", date)
  const blockedSpotIds = new Set((blocks || []).map((b) => b.spot_id))

  const { data: reservations } = await supabase
    .from("reservations")
    .select("spot_id")
    .eq("date", date)
    .eq("status", "confirmed")
  const reservedSpotIds = new Set((reservations || []).map((r) => r.spot_id))

  const dayApprovalBySpot = {}
  ; (ownerDayRows || []).forEach((row) => {
    if (!dayApprovalBySpot[row.spot_id]) dayApprovalBySpot[row.spot_id] = row.id
  })
  ; (legacyDayRows || []).forEach((row) => {
    if (!dayApprovalBySpot[row.spot_id]) dayApprovalBySpot[row.spot_id] = row.id
  })

  const available = (spots || [])
    .filter((spot) => !blockedSpotIds.has(spot.id) && !reservedSpotIds.has(spot.id))
    .map((spot) => {
      const owners = ownerBySpot[spot.id] || []
      const requiredOwnerIds = ownerIdsBySpot[spot.id] || new Set()
      const requiredCount = requiredOwnerIds.size
      const dayApprovedCount = (dayOwnerMap[spot.id] || new Set()).size
      const recurringApprovedCount = (recurringOwnerMap[spot.id] || new Set()).size
      const fullyExplicit = requiredCount > 0 && dayApprovedCount >= requiredCount
      const fullyRecurring = requiredCount > 0 && recurringApprovedCount >= requiredCount
      const fullyReleased = spot.is_permanently_released === true || fullyExplicit || fullyRecurring
      if (!fullyReleased) return null

      const sourceId = dayApprovalBySpot[spot.id] || `aggregate-${spot.id}-${date}`
      const releaseSource =
        spot.is_permanently_released === true ? "permanent" :
          fullyExplicit ? "explicit" :
            fullyRecurring ? "recurring" : "unknown"

      return {
        id: sourceId,
        spot_id: spot.id,
        date,
        spot: { id: spot.id, label: spot.label, zone: spot.zone, sort_order: spot.sort_order },
        owners,
        released_by_user: owners[0] || null,
        owner_release_status: {
          approved_count: Math.max(dayApprovedCount, recurringApprovedCount),
          required_count: requiredCount,
          is_fully_released: fullyReleased,
          source: releaseSource,
        },
      }
    })
    .filter(Boolean)

  return { data: available, error: null }
}



export async function reserveSpot(spotId, availabilityId, userId, date) {
  // Recurring and permanent availabilities have no entry in the availability table,
  // so we pass null instead of trying to use the synthetic ID
  const cleanAvailabilityId = (
    availabilityId?.startsWith("recurring-")
    || availabilityId?.startsWith("permanent-")
    || availabilityId?.startsWith("aggregate-")
  )
    ? null
    : availabilityId

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      spot_id: spotId,
      availability_id: cleanAvailabilityId,
      user_id: userId,
      date,
    })
    .select()
    .single()
  return { data, error }
}

export async function cancelReservation(reservationId) {
  const { data, error } = await supabase
    .from("reservations")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", reservationId)
    .select()
    .single()
  return { data, error }
}

export async function getMyReservations(userId, fromDate) {
  const { data, error } = await supabase
    .from("reservations")
    .select(`
      *,
      spot:parking_spots(id, label, zone)
    `)
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .gte("date", fromDate)
    .order("date")
  return { data, error }
}

export async function getReservationsForDate(date, spotId = null) {
  let query = supabase
    .from("reservations")
    .select(`
      *,
      spot:parking_spots(id, label, zone),
      user:profiles(id, full_name, email)
    `)
    .eq("date", date)
    .eq("status", "confirmed")

  if (spotId) query = query.eq("spot_id", spotId)

  const { data, error } = await query
  return { data, error }
}

// ─── DAILY OVERVIEW ───────────────────────────────────────────

export async function getDailyOverview(date) {
  // Determine weekday (1=Mo … 5=Fr) for recurring check
  const jsDay = new Date(date).getDay()
  const weekday = jsDay >= 1 && jsDay <= 5 ? jsDay : 0

  // Get all active spots
  const { data: spots } = await supabase
    .from("parking_spots")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")

  // Get assignments (active on selected date)
  const { data: assignments } = await supabase
    .from("spot_assignments")
    .select("*, user:profiles(id, full_name, email)")
    .lte("valid_from", date)
    .or(`valid_until.is.null,valid_until.gte.${date}`)

  const ownerDayResult = await supabase
    .from(OWNER_AVAIL_TABLE)
    .select("id, spot_id, owner_id, date")
    .eq("date", date)
  const ownerDayData = !isMissingTableError(ownerDayResult.error) ? (ownerDayResult.data || []) : []

  const legacyDayResult = await supabase
    .from(LEGACY_AVAIL_TABLE)
    .select("id, spot_id, released_by")
    .eq("date", date)
  const legacyDayData = legacyDayResult.data || []

  let ownerRecurringData = []
  let legacyRecurringData = []
  if (weekday >= 1 && weekday <= 5) {
    const ownerRecurringResult = await supabase
      .from(OWNER_RECURRING_TABLE)
      .select("spot_id, owner_id")
      .eq("weekday", weekday)
    ownerRecurringData = !isMissingTableError(ownerRecurringResult.error) ? (ownerRecurringResult.data || []) : []

    const legacyRecurringResult = await supabase
      .from(LEGACY_RECURRING_TABLE)
      .select("spot_id, owner_id")
      .eq("weekday", weekday)
    legacyRecurringData = legacyRecurringResult.data || []
  }

  // Get reservations for this date
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, user:profiles(id, full_name, email)")
    .eq("date", date)
    .eq("status", "confirmed")

  // Get owner-initiated blocks that override recurring/permanent releases
  const { data: blocksData } = await supabase
    .from("spot_blocks")
    .select("spot_id")
    .eq("date", date)

  const blockedSpotIds = new Set((blocksData || []).map((b) => b.spot_id))

  const assignmentMap = {}
    ; (assignments || []).forEach((a) => {
      if (!assignmentMap[a.spot_id]) assignmentMap[a.spot_id] = []
      assignmentMap[a.spot_id].push(a)
    })

  const ownerIdsBySpot = {}
  ; (assignments || []).forEach((a) => {
    if (!ownerIdsBySpot[a.spot_id]) ownerIdsBySpot[a.spot_id] = new Set()
    if (a.user_id) ownerIdsBySpot[a.spot_id].add(a.user_id)
  })

  const explicitOwnerMap = buildOwnerSet(ownerDayData)
  ; (legacyDayData || []).forEach((a) => {
    if (!explicitOwnerMap[a.spot_id]) explicitOwnerMap[a.spot_id] = new Set()
    if (a.released_by) explicitOwnerMap[a.spot_id].add(a.released_by)
  })

  const recurringOwnerMap = buildOwnerSet(ownerRecurringData)
  ; (legacyRecurringData || []).forEach((r) => {
    if (!recurringOwnerMap[r.spot_id]) recurringOwnerMap[r.spot_id] = new Set()
    if (r.owner_id) recurringOwnerMap[r.spot_id].add(r.owner_id)
  })

  const reservationMap = {}
    ; (reservations || []).forEach((r) => { reservationMap[r.spot_id] = r })

  const overview = (spots || []).map((spot) => {
    const spotAssignments = assignmentMap[spot.id] || []
    const reservation = reservationMap[spot.id]
    const isPermanent = spot.is_permanently_released === true
    const isBlocked = blockedSpotIds.has(spot.id) // owner explicitly blocked this day

    let status = "unassigned"
    let owners = []
    let reservedBy = null

    if (spotAssignments.length > 0) {
      owners = spotAssignments.map((a) => a.user)
      const requiredOwnerIds = ownerIdsBySpot[spot.id] || new Set()
      const requiredCount = requiredOwnerIds.size
      const explicitCount = (explicitOwnerMap[spot.id] || new Set()).size
      const recurringCount = (recurringOwnerMap[spot.id] || new Set()).size
      const fullyExplicit = requiredCount > 0 && explicitCount >= requiredCount
      const fullyRecurring = requiredCount > 0 && recurringCount >= requiredCount
      const isReleased = isPermanent || fullyExplicit || fullyRecurring

      if (isReleased && !isBlocked) {
        if (reservation) {
          status = "reserved"
          reservedBy = reservation.user
        } else {
          status = "available"
        }
      } else {
        status = "occupied"
      }
    } else if (isPermanent && !isBlocked) {
      // Unassigned but permanently released: treat as available for flexible users
      if (reservation) {
        status = "reserved"
        reservedBy = reservation.user
      } else {
        status = "available"
      }
    }

    return {
      ...spot,
      status,
      owner: owners[0] || null, // backwards compat
      owners,
      reservedBy,
      ownerReleaseStatus: {
        required_count: (ownerIdsBySpot[spot.id] || new Set()).size,
        explicit_count: (explicitOwnerMap[spot.id] || new Set()).size,
        recurring_count: (recurringOwnerMap[spot.id] || new Set()).size,
      },
      reservation,
    }
  })

  return { data: overview, error: null }
}

// ─── STATS ────────────────────────────────────────────────────

export async function getStats() {
  const today = getToday()

  const [
    { count: totalSpots },
    { count: totalUsers },
    { data: todayReservations },
    { data: todayAvailabilities },
  ] = await Promise.all([
    supabase.from("parking_spots").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("reservations").select("*").eq("date", today).eq("status", "confirmed"),
    supabase.from("availabilities").select("*").eq("date", today),
  ])

  return {
    totalSpots: totalSpots || 0,
    totalUsers: totalUsers || 0,
    todayReservations: todayReservations?.length || 0,
    todayAvailable: todayAvailabilities?.length || 0,
  }
}

export async function getSpotUsageStats(days = 30) {
  const safeDays = [7, 30, 90].includes(days) ? days : 30
  const endDate = getToday()
  const end = new Date(endDate)
  const start = new Date(end)
  start.setDate(end.getDate() - (safeDays - 1))

  const formatIsoDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const startDate = formatIsoDate(start)
  const datesInRange = []
  for (let i = 0; i < safeDays; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    datesInRange.push(formatIsoDate(date))
  }

  const [
    { data: spots, error: spotsError },
    { data: availabilities, error: availabilitiesError },
    { data: recurringAvailabilities, error: recurringError },
    { data: reservations, error: reservationsError },
    { data: blocks, error: blocksError },
  ] = await Promise.all([
    supabase
      .from("parking_spots")
      .select("id, label, zone, sort_order, is_permanently_released")
      .eq("is_active", true)
      .order("sort_order")
      .order("label"),
    supabase
      .from("availabilities")
      .select("spot_id, date")
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("recurring_availabilities")
      .select("spot_id, weekday"),
    supabase
      .from("reservations")
      .select("spot_id")
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("status", "confirmed"),
    supabase
      .from("spot_blocks")
      .select("spot_id, date")
      .gte("date", startDate)
      .lte("date", endDate),
  ])

  const error = spotsError || availabilitiesError || recurringError || reservationsError || blocksError
  if (error) return { data: null, error }

  const activeSpots = spots || []
  const activeSpotIds = new Set(activeSpots.map((spot) => spot.id))
  const releaseBySpotAndDate = new Set()
  const bookingCountBySpot = {}

  ;(reservations || []).forEach((reservation) => {
    if (!activeSpotIds.has(reservation.spot_id)) return
    bookingCountBySpot[reservation.spot_id] = (bookingCountBySpot[reservation.spot_id] || 0) + 1
  })

  ;(availabilities || []).forEach((availability) => {
    if (!activeSpotIds.has(availability.spot_id)) return
    releaseBySpotAndDate.add(`${availability.spot_id}::${availability.date}`)
  })

  const recurringByWeekday = {}
  ;(recurringAvailabilities || []).forEach((row) => {
    if (!activeSpotIds.has(row.spot_id)) return
    if (!recurringByWeekday[row.weekday]) recurringByWeekday[row.weekday] = []
    recurringByWeekday[row.weekday].push(row.spot_id)
  })

  datesInRange.forEach((dateStr) => {
    const day = new Date(dateStr).getDay()
    if (day < 1 || day > 5) return
    const recurringSpots = recurringByWeekday[day] || []
    recurringSpots.forEach((spotId) => {
      releaseBySpotAndDate.add(`${spotId}::${dateStr}`)
    })
  })

  activeSpots
    .filter((spot) => spot.is_permanently_released)
    .forEach((spot) => {
      datesInRange.forEach((dateStr) => {
        releaseBySpotAndDate.add(`${spot.id}::${dateStr}`)
      })
    })

  ;(blocks || []).forEach((block) => {
    if (!activeSpotIds.has(block.spot_id)) return
    releaseBySpotAndDate.delete(`${block.spot_id}::${block.date}`)
  })

  const releaseCountBySpot = {}
  releaseBySpotAndDate.forEach((key) => {
    const [spotId] = key.split("::")
    releaseCountBySpot[spotId] = (releaseCountBySpot[spotId] || 0) + 1
  })

  const rows = activeSpots
    .map((spot) => ({
      spot_id: spot.id,
      spot_label: spot.label,
      zone: spot.zone,
      releases: releaseCountBySpot[spot.id] || 0,
      bookings: bookingCountBySpot[spot.id] || 0,
    }))
    .sort((a, b) => {
      if (b.releases !== a.releases) return b.releases - a.releases
      return a.spot_label.localeCompare(b.spot_label, "de", { numeric: true, sensitivity: "base" })
    })

  return {
    data: {
      days: safeDays,
      startDate,
      endDate,
      rows,
    },
    error: null,
  }
}

// ─── APP SETTINGS ─────────────────────────────────────────────

export async function getAppSetting(key) {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .single()
  return { data: data?.value ?? null, error }
}

export async function updateAppSetting(key, value) {
  const { data, error } = await supabase
    .from("app_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key)
    .select()
    .single()
  return { data, error }
}

// ─── PASSWORD MANAGEMENT ──────────────────────────────────────

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  return { data, error }
}

// ─── EMAIL MANAGEMENT ─────────────────────────────────────────

export async function updateEmail(newEmail) {
  const { data, error } = await supabase.auth.updateUser({ email: newEmail })
  return { data, error }
}

export async function markPasswordChanged(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single()
  return { data, error }
}

export async function createUserViaAdmin(email, fullName, role, token) {
  const res = await fetch("/api/admin/create-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, fullName, role }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Fehler beim Anlegen")
  return data
}

export function getSession() {
  return supabase.auth.getSession()
}

// Toggle is_blocked on a user profile
export async function toggleBlockUser(userId, blocked) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_blocked: blocked, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single()
  return { data, error }
}

// Admin deletes another user (calls the admin API route)
export async function deleteUserByAdmin(userId, token) {
  const res = await fetch("/api/admin/delete-user", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Fehler beim Löschen")
  return data
}
// Admin updates another user's role (calls the admin API route)
export async function updateUserRoleByAdmin(userId, role, token) {
  const res = await fetch("/api/admin/update-role", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, role }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Fehler beim Ändern der Rolle")
  return data
}

export async function updateUserByAdmin(userId, { fullName, email }, token) {
  const res = await fetch("/api/admin/update-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, fullName, email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Fehler beim Bearbeiten des Nutzers")
  return data
}

