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
    .select("*, team:teams(id, name)")
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

export async function getMyAssignment(userId) {
  const { data, error } = await supabase
    .from("spot_assignments")
    .select(`
      *,
      spot:parking_spots(id, label, zone)
    `)
    .eq("user_id", userId)
    .is("valid_until", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return { data, error }
}

export async function assignSpot(spotId, userId) {
  // End any existing assignment for this spot
  await supabase
    .from("spot_assignments")
    .update({ valid_until: getToday() })
    .eq("spot_id", spotId)
    .is("valid_until", null)

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

// Assign a spot to a team (clears any existing user assignment first)
export async function assignTeamToSpot(spotId, teamId) {
  // End any active user assignment for this spot
  const { data: existing } = await supabase
    .from("spot_assignments")
    .select("id")
    .eq("spot_id", spotId)
    .is("valid_until", null)
    .maybeSingle()
  if (existing) {
    await supabase
      .from("spot_assignments")
      .update({ valid_until: getToday() })
      .eq("id", existing.id)
  }
  // Set team_id on the spot
  const { data, error } = await supabase
    .from("parking_spots")
    .update({ team_id: teamId })
    .eq("id", spotId)
    .select()
    .single()
  return { data, error }
}

// Remove team assignment from a spot
export async function unassignTeamFromSpot(spotId) {
  const { data, error } = await supabase
    .from("parking_spots")
    .update({ team_id: null })
    .eq("id", spotId)
    .select()
    .single()
  return { data, error }
}

// ─── TEAMS ────────────────────────────────────────────────────

export async function getTeams() {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name")
  return { data, error }
}

export async function createTeam(name) {
  const { data, error } = await supabase
    .from("teams")
    .insert({ name: name.trim() })
    .select()
    .single()
  return { data, error }
}

export async function updateTeam(id, name) {
  const { data, error } = await supabase
    .from("teams")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single()
  return { data, error }
}

export async function deleteTeam(id) {
  const { data, error } = await supabase
    .from("teams")
    .delete()
    .eq("id", id)
  return { data, error }
}

// ─── RECURRING AVAILABILITIES ────────────────────────────────

// Get all recurring weekday availabilities for a user (weekday: 1=Mo … 5=Fr)
export async function getRecurringAvailabilities(userId) {
  const { data, error } = await supabase
    .from("recurring_availabilities")
    .select("*")
    .eq("owner_id", userId)
    .order("weekday")
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

export async function getMyAvailabilities(userId, fromDate, toDate) {
  const { data, error } = await supabase
    .from("availabilities")
    .select(`*, spot:parking_spots(id, label, zone)`)
    .eq("released_by", userId)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date")
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

export async function getAvailableSpotsForDate(date, userTeamId = null) {
  // Determine weekday of the date (1=Mo … 5=Fr; 0=Sun/6=Sat ignored)
  const dateObj = new Date(date)
  const jsDay = dateObj.getDay() // 0=Sun,1=Mo,...,6=Sat
  const weekday = jsDay === 0 ? 0 : jsDay // keep 0 for weekend

  // Get explicit single-day availabilities
  const { data, error } = await supabase
    .from("availabilities")
    .select(`
      *,
      spot:parking_spots(id, label, zone, team_id),
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
        spot:parking_spots(id, label, zone, team_id),
        owner:profiles!owner_id(id, full_name)
      `)
      .eq("weekday", weekday)

    recurringAvail = recur || []
  }

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

  const allAvail = [...(data || []), ...recurringMapped]

  // Filter out already reserved spots
  const available = allAvail.filter((a) => !reservedSpotIds.has(a.spot_id))

  // Add team spots – only for members of the corresponding team
  let filteredTeam = []
  if (userTeamId) {
    const { data: teamSpots } = await supabase
      .from("parking_spots")
      .select("id, label, zone, sort_order, team_id, team:teams(id, name)")
      .eq("is_active", true)
      .eq("team_id", userTeamId)

    const ownerAvailableSpotIds = new Set(available.map((a) => a.spot_id))

    filteredTeam = (teamSpots || [])
      .filter((s) => !reservedSpotIds.has(s.id) && !ownerAvailableSpotIds.has(s.id))
      .map((s) => ({
        id: `team-${s.id}`,
        spot_id: s.id,
        date,
        is_team_spot: true,
        spot: s,
        released_by_user: null,
      }))
  }

  return { data: [...available, ...filteredTeam], error: null }
}



export async function reserveSpot(spotId, availabilityId, userId, date) {
  // Recurring availabilities have no entry in the availability table,
  // so we pass null instead of trying to use the recurring_availability ID
  const cleanAvailabilityId = availabilityId?.startsWith('recurring-')
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

  const assignmentMap = {}
    ; (assignments || []).forEach((a) => { assignmentMap[a.spot_id] = a })

  const availabilityMap = {}
    ; (availabilities || []).forEach((a) => { availabilityMap[a.spot_id] = a })

  // Build a Set of spot_ids that are recurring-available for this day
  const recurringSpotIds = new Set(recurringData.map((r) => r.spot_id))

  const reservationMap = {}
    ; (reservations || []).forEach((r) => { reservationMap[r.spot_id] = r })

  const overview = (spots || []).map((spot) => {
    const assignment = assignmentMap[spot.id]
    const availability = availabilityMap[spot.id]
    const reservation = reservationMap[spot.id]
    const isRecurring = recurringSpotIds.has(spot.id)

    let status = "unassigned"
    let owner = null
    let reservedBy = null

    // Team spots (team_id set) are always available – no owner/availability entry needed
    if (spot.team_id) {
      if (reservation) {
        status = "reserved"
        reservedBy = reservation.user
      } else {
        status = "available"
      }
    } else if (assignment) {
      owner = assignment.user
      // Available if explicit availability OR recurring weekday
      if (availability || isRecurring) {
        if (reservation) {
          status = "reserved"
          reservedBy = reservation.user
        } else {
          status = "available"
        }
      } else {
        status = "occupied"
      }
    }

    return {
      ...spot,
      status,
      owner,
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

