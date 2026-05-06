const PERSONIO_BASE_URL = process.env.PERSONIO_BASE_URL || "https://api.personio.de/v1"
const PERSONIO_CLIENT_ID = process.env.PERSONIO_CLIENT_ID
const PERSONIO_CLIENT_SECRET = process.env.PERSONIO_CLIENT_SECRET

let cachedToken = null
let cachedTokenExpiresAt = 0

function getBerlinToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

function ensureCredentials() {
  if (!PERSONIO_CLIENT_ID || !PERSONIO_CLIENT_SECRET) {
    throw new Error("Personio-Credentials fehlen: PERSONIO_CLIENT_ID / PERSONIO_CLIENT_SECRET")
  }
}

async function fetchPersonio(path, options = {}) {
  const response = await fetch(`${PERSONIO_BASE_URL}${path}`, options)
  const raw = await response.text()
  let body = null
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    body = { raw }
  }

  if (!response.ok) {
    throw new Error(`Personio API Fehler (${response.status}): ${JSON.stringify(body)}`)
  }
  return body
}

export async function getPersonioAccessToken() {
  ensureCredentials()

  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken
  }

  const payload = await fetchPersonio("/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: PERSONIO_CLIENT_ID,
      client_secret: PERSONIO_CLIENT_SECRET,
    }),
  })

  const token = payload?.data?.token
  if (!token) {
    throw new Error("Personio Auth-Response enthält kein Token")
  }

  // Personio-Token ist laut Doku 24h stabil; wir puffern defensiv 23h.
  cachedToken = token
  cachedTokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000
  return token
}

export async function getTodayFullDayAbsences() {
  const today = getBerlinToday()
  return getFullDayAbsencesInRange(today, today)
}

export async function getFullDayAbsencesInRange(startDate, endDate) {
  const token = await getPersonioAccessToken()
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    limit: "200",
    offset: "0",
  })

  const payload = await fetchPersonio(`/company/time-offs?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })

  const entries = Array.isArray(payload?.data) ? payload.data : []
  const fullDayAbsences = entries
    .map((entry) => entry?.attributes || {})
    .filter((absence) => {
      const absenceStart = String(absence.start_date || "").slice(0, 10)
      const absenceEnd = String(absence.end_date || "").slice(0, 10)
      const intersectsRange = absenceStart <= endDate && absenceEnd >= startDate
      const isHalfDay = absence.half_day_start === true || absence.half_day_end === true
      const isApproved = absence.status === "approved"
      return intersectsRange && isApproved && !isHalfDay
    })
    .map((absence) => ({
      email: normalizeEmail(absence?.employee?.attributes?.email?.value),
      absenceId: absence.id,
      startDate: String(absence.start_date || "").slice(0, 10),
      endDate: String(absence.end_date || "").slice(0, 10),
    }))
    .filter((absence) => Boolean(absence.email))

  return {
    date: startDate,
    rangeStart: startDate,
    rangeEnd: endDate,
    absences: fullDayAbsences,
  }
}
