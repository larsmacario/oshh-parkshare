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
    .from("recurring_availabilities")
    .select("*")
    .eq("owner_id", userId)
  if (spotId) query = query.eq("spot_id", spotId)
  const { data, error } = await query.order("weekday")
  return { data, error }
}

export async function addRecurringAvailability(spotId, userId, weekday) {
  const { data, error } = await supabase
    .from("recurring_availabilities")
    .insert({ spot_id: spotId, owner_id: userId, weekday })
    .select()
    .single()
  return { data, error }
}

export async function removeRecurringAvailability(id) {
  const { data, error } = await supabase
    .from("recurring_availabilities")
    .delete()
    .eq("id", id)
  return { data, error }
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
    .from("availabilities")
    .select(`*, spot:parking_spots(id, label, zone)`)
    .eq("released_by", userId)
    .gte("date", fromDate)
    .lte("date", toDate)
  if (spotId) query = query.eq("spot_id", spotId)
  const { data, error } = await query.order("date")
  return { data, error }
}

export async function releaseSpot(spotId, userId, date) {
  const { data, error } = await supabase
    .from("availabilities")
    .insert({ spot_id: spotId, released_by: userId, date })
    .select()
    .single()
  return { data, error }
}

export async function releaseSpotsMultiple(spotId, userId, dates) {
  const rows = dates.map((date) => ({
    spot_id: spotId,
    released_by: userId,
    date,
  }))
  const { data, error } = await supabase
    .from("availabilities")
    .upsert(rows, { onConflict: "spot_id,date" })
    .select()
  return { data, error }
}

export async function unreleaseSpot(availabilityId) {
  const { data, error } = await supabase
    .from("availabilities")
    .delete()
    .eq("id", availabilityId)
  return { data, error }
}

// ─── RESERVATIONS ─────────────────────────────────────────────

export async function getAvailableSpotsForDate(date) {
  // Determine weekday of the date (1=Mo … 5=Fr; 0=Sun/6=Sat ignored)
  const dateObj = new Date(date)
  const jsDay = dateObj.getDay() // 0=Sun,1=Mo,...,6=Sat
  const weekday = jsDay === 0 ? 0 : jsDay // keep 0 for weekend

  // Get explicit single-day availabilities
  const { data, error } = await supabase
    .from("availabilities")
    .select(`
      *,
      spot:parking_spots(id, label, zone),
      released_by_user:profiles!released_by(id, full_name)
    `)
    .eq("date", date)

  if (error) return { data: null, error }

  // Get recurring availabilities for this weekday (only on actual workdays)
  let recurringAvail = []
  if (weekday >= 1 && weekday <= 5) {
    const { data: recur } = await supabase
      .from("recurring_availabilities")
      .select(`
        *,
        spot:parking_spots(id, label, zone),
        owner:profiles!owner_id(id, full_name)
      `)
      .eq("weekday", weekday)

    recurringAvail = recur || []
  }

  // Get permanently released spots (with their owners via spot_assignments)
  const { data: permanentSpots } = await supabase
    .from("parking_spots")
    .select("id, label, zone")
    .eq("is_permanently_released", true)
    .eq("is_active", true)

  // Get assignments for permanent spots to resolve owners
  const permanentSpotIds = (permanentSpots || []).map((s) => s.id)
  let permanentAssignments = []
  if (permanentSpotIds.length > 0) {
    const { data: assigns } = await supabase
      .from("spot_assignments")
      .select("spot_id, user:profiles(id, full_name)")
      .in("spot_id", permanentSpotIds)
      .is("valid_until", null)
    permanentAssignments = assigns || []
  }
  const permanentOwnerMap = {}
  permanentAssignments.forEach((a) => {
    if (!permanentOwnerMap[a.spot_id]) permanentOwnerMap[a.spot_id] = []
    permanentOwnerMap[a.spot_id].push(a.user)
  })

  // Get owner blocks for this date (override permanent/recurring)
  const { data: blocks } = await supabase
    .from("spot_blocks")
    .select("spot_id")
    .eq("date", date)

  const blockedSpotIds = new Set((blocks || []).map((b) => b.spot_id))

  // Get existing confirmed reservations for this date
  const { data: reservations } = await supabase
    .from("reservations")
    .select("spot_id")
    .eq("date", date)
    .eq("status", "confirmed")

  const reservedSpotIds = new Set((reservations || []).map((r) => r.spot_id))

  // Merge: explicit availabilities take precedence; add recurring ones not already covered
  const explicitSpotIds = new Set((data || []).map((a) => a.spot_id))
  const recurringMapped = recurringAvail
    .filter((r) => !explicitSpotIds.has(r.spot_id))
    .map((r) => ({
      id: `recurring-${r.id}`,
      spot_id: r.spot_id,
      date,
      is_recurring: true,
      spot: r.spot,
      released_by_user: r.owner,
    }))

  const coveredSpotIds = new Set([...explicitSpotIds, ...recurringMapped.map((r) => r.spot_id)])
  const permanentMapped = (permanentSpots || [])
    .filter((s) => !coveredSpotIds.has(s.id) && !blockedSpotIds.has(s.id))
    .map((s) => {
      const owners = permanentOwnerMap[s.id] || []
      return {
        id: `permanent-${s.id}`,
        spot_id: s.id,
        date,
        is_permanent: true,
        spot: { id: s.id, label: s.label, zone: s.zone },
        released_by_user: owners[0] || null,
      }
    })

  const allAvail = [...(data || []), ...recurringMapped, ...permanentMapped]

  // Filter out already reserved spots AND owner-blocked spots
  const available = allAvail.filter(
    (a) => !reservedSpotIds.has(a.spot_id) && !blockedSpotIds.has(a.spot_id)
  )

  return { data: available, error: null }
}



export async function reserveSpot(spotId, availabilityId, userId, date) {
  // Recurring and permanent availabilities have no entry in the availability table,
  // so we pass null instead of trying to use the synthetic ID
  const cleanAvailabilityId = (availabilityId?.startsWith('recurring-') || availabilityId?.startsWith('permanent-'))
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

export async function getReservationsForDate(date) {
  const { data, error } = await supabase
    .from("reservations")
    .select(`
      *,
      spot:parking_spots(id, label, zone),
      user:profiles(id, full_name, email)
    `)
    .eq("date", date)
    .eq("status", "confirmed")
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

  // Get assignments
  const { data: assignments } = await supabase
    .from("spot_assignments")
    .select("*, user:profiles(id, full_name, email)")
    .lte("valid_from", date)
    .or(`valid_until.is.null,valid_until.gte.${date}`)

  // Get explicit availabilities for this date
  const { data: availabilities } = await supabase
    .from("availabilities")
    .select("*")
    .eq("date", date)

  // Get recurring availabilities for this weekday
  let recurringData = []
  if (weekday >= 1 && weekday <= 5) {
    const { data: recur } = await supabase
      .from("recurring_availabilities")
      .select("spot_id, owner_id")
      .eq("weekday", weekday)
    recurringData = recur || []
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

  const availabilityMap = {}
    ; (availabilities || []).forEach((a) => { availabilityMap[a.spot_id] = a })

  // Build a Set of spot_ids that are recurring-available for this day
  const recurringSpotIds = new Set(recurringData.map((r) => r.spot_id))

  const reservationMap = {}
    ; (reservations || []).forEach((r) => { reservationMap[r.spot_id] = r })

  const overview = (spots || []).map((spot) => {
    const spotAssignments = assignmentMap[spot.id] || []
    const availability = availabilityMap[spot.id]
    const reservation = reservationMap[spot.id]
    const isRecurring = recurringSpotIds.has(spot.id)
    const isPermanent = spot.is_permanently_released === true
    const isBlocked = blockedSpotIds.has(spot.id) // owner explicitly blocked this day

    let status = "unassigned"
    let owners = []
    let reservedBy = null

    if (spotAssignments.length > 0) {
      owners = spotAssignments.map((a) => a.user)
      // Available if (explicit OR recurring OR permanent) AND NOT owner-blocked for this day
      if ((availability || isRecurring || isPermanent) && !isBlocked) {
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
      availability,
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

