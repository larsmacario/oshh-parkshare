"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getMyAvailabilities,
  getMyAssignments,
  releaseSpot,
  unreleaseSpot,
  getReservationsForDate,
  getRecurringAvailabilities,
  addRecurringAvailability,
  removeRecurringAvailability,
  getMyBlocks,
  blockSpot,
  unblockSpot,
  getSpotReleaseProgress,
  getSpotRecurringReleaseProgress,
} from "@/lib/supabase"
import {
  getMonthWeeks,
  getMonthLabel,
  isInMonth,
  getToday,
  isPast,
  isToday,
  WEEKDAY_LABELS,
} from "@/lib/dates"

// weekday number → JS getDay() value
// 1=Mo(1), 2=Di(2), 3=Mi(3), 4=Do(4), 5=Fr(5)
function getWeekdayNumber(dateStr) {
  const d = new Date(dateStr)
  const jsDay = d.getDay() // 0=Sun, 1=Mo … 5=Fr, 6=Sat
  return jsDay // 1–5 for workdays
}

export default function OwnerCalendar({ user }) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [mySpots, setMySpots] = useState([])
  const [selectedSpotIdx, setSelectedSpotIdx] = useState(0)
  const [releasedDates, setReleasedDates] = useState({}) // date -> availability obj
  const [releaseProgressByDate, setReleaseProgressByDate] = useState({}) // date -> { approvedCount, requiredCount, isFullyReleased }
  const [reservedDates, setReservedDates] = useState(new Set())
  const [blockedDates, setBlockedDates] = useState({}) // date -> block obj
  const [recurringProgressByWeekday, setRecurringProgressByWeekday] = useState({}) // weekday -> { approvedCount, requiredCount, isFullyReleased }
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  // Recurring: Map weekday (1–5) -> recurring_availabilities row (or null)
  const [recurringDays, setRecurringDays] = useState({}) // { 1: { id, weekday, ... }, ... }
  const [recurringLoading, setRecurringLoading] = useState(null) // weekday number being toggled

  const mySpot = mySpots[selectedSpotIdx] || null

  const weeks = getMonthWeeks(currentYear, currentMonth)

  const loadData = useCallback(async (isInitial = true) => {
    if (isInitial) setLoading(true)

    // Find all my spot assignments
    const { data: myAssignments } = await getMyAssignments(user.id)
    const spots = (myAssignments || []).map((a) => a.spot).filter(Boolean)
    setMySpots(spots)

    const effectiveIdx = selectedSpotIdx >= spots.length ? 0 : selectedSpotIdx
    if (effectiveIdx !== selectedSpotIdx) setSelectedSpotIdx(effectiveIdx)
    const currentSpot = spots[effectiveIdx] || null

    if (currentSpot) {
      // Load released dates for the visible month range, filtered by spot
      const allDates = weeks.flat()
      const fromDate = allDates[0]
      const toDate = allDates[allDates.length - 1]
      const { data: avails } = await getMyAvailabilities(user.id, fromDate, toDate, currentSpot.id)

      const dateMap = {}
        ; (avails || []).forEach((a) => { dateMap[a.date] = a })
      setReleasedDates(dateMap)

      // Load owner-set blocks for this month range
      const { data: blocks } = await getMyBlocks(user.id, fromDate, toDate, currentSpot.id)
      const blockMap = {}
        ; (blocks || []).forEach((b) => { blockMap[b.date] = b })
      setBlockedDates(blockMap)

      // Check which released dates already have reservations (in parallel)
      const reserved = new Set()
      const checks = await Promise.all(
        (avails || []).map(async (a) => {
          const { data: res } = await getReservationsForDate(a.date, a.spot_id)
          return { date: a.date, hasReservation: res?.length > 0 }
        })
      )
      checks.forEach(({ date, hasReservation }) => {
        if (hasReservation) reserved.add(date)
      })
      setReservedDates(reserved)

      // Load recurring availabilities, filtered by spot
      const { data: recur } = await getRecurringAvailabilities(user.id, currentSpot.id)
      const recurMap = {}
        ; (recur || []).forEach((r) => { recurMap[r.weekday] = r })
      setRecurringDays(recurMap)

      // Load daily release progress (all owners) for this spot and visible range
      const { data: progressData, error: progressError } = await getSpotReleaseProgress(currentSpot.id, fromDate, toDate)
      if (progressError) {
        console.error("getSpotReleaseProgress:", progressError.message || progressError)
      }
      const progressMap = {}
      if (progressData) {
        const approvalsByDate = {}
        ; (progressData.approvals || []).forEach((row) => {
          if (!approvalsByDate[row.date]) approvalsByDate[row.date] = new Set()
          if (row.owner_id) approvalsByDate[row.date].add(row.owner_id)
        })

        const toDateObj = (value) => new Date(`${value}T00:00:00`)
        allDates.forEach((d) => {
          const activeOwners = new Set()
          ; (progressData.assignments || []).forEach((assignment) => {
            const from = assignment.valid_from ? toDateObj(assignment.valid_from) : null
            const until = assignment.valid_until ? toDateObj(assignment.valid_until) : null
            const day = toDateObj(d)
            const isActiveFrom = !from || from <= day
            const isActiveUntil = !until || until >= day
            if (isActiveFrom && isActiveUntil && assignment.user_id) activeOwners.add(assignment.user_id)
          })

          const approvedOwners = approvalsByDate[d] || new Set()
          const requiredCount = activeOwners.size
          const approvedCount = [...approvedOwners].filter((id) => activeOwners.has(id)).length
          progressMap[d] = {
            approvedCount,
            requiredCount,
            isFullyReleased: requiredCount > 0 && approvedCount >= requiredCount,
          }
        })
      }
      setReleaseProgressByDate(progressMap)

      // Load recurring release progress (all owners) for this spot
      const { data: recurringProgress, error: recurringProgressError } = await getSpotRecurringReleaseProgress(currentSpot.id)
      if (recurringProgressError) {
        console.error("getSpotRecurringReleaseProgress:", recurringProgressError.message || recurringProgressError)
      }
      const recurringProgressMap = {}
      if (recurringProgress) {
        const recurringRequired = new Set(
          (recurringProgress.assignments || [])
            .map((a) => a.user_id)
            .filter(Boolean)
        )
        const recurringApprovalByDay = {}
        ; (recurringProgress.approvals || []).forEach((row) => {
          if (!recurringApprovalByDay[row.weekday]) recurringApprovalByDay[row.weekday] = new Set()
          if (row.owner_id) recurringApprovalByDay[row.weekday].add(row.owner_id)
        })

        for (let weekday = 1; weekday <= 5; weekday++) {
          const approvedSet = recurringApprovalByDay[weekday] || new Set()
          const approvedCount = [...approvedSet].filter((id) => recurringRequired.has(id)).length
          const requiredCount = recurringRequired.size
          recurringProgressMap[weekday] = {
            approvedCount,
            requiredCount,
            isFullyReleased: requiredCount > 0 && approvedCount >= requiredCount,
          }
        }
      }
      setRecurringProgressByWeekday(recurringProgressMap)
    } else {
      setReleasedDates({})
      setReleaseProgressByDate({})
      setReservedDates(new Set())
      setBlockedDates({})
      setRecurringDays({})
      setRecurringProgressByWeekday({})
    }

    if (isInitial) setLoading(false)
  }, [user.id, currentYear, currentMonth, selectedSpotIdx])

  useEffect(() => {
    loadData(true)
  }, [loadData])

  // ─── Toggle a specific calendar date ─────────────────────────

  async function toggleDate(date) {
    if (isPast(date) || !mySpot || actionLoading) return

    setActionLoading(date)

    try {
      // Weekday of this date (Kalender zeigt nur Mo–Fr)
      const weekdayNum = getWeekdayNumber(date)
      const isRecurring = !!recurringDays[weekdayNum]
      const isPermanent = mySpot?.is_permanently_released === true
      // Nur im sichtbaren Monat klickbar; Logik wie in der Zellen-Darstellung
      const inMonth = isInMonth(date, currentYear, currentMonth)
      const effectivelyFree =
        !!releasedDates[date]
        || (isRecurring && inMonth && !isPast(date))
        || (isPermanent && inMonth && !isPast(date))

      if (blockedDates[date]) {
        // Gesperrt → entsperren
        const removedBlock = blockedDates[date]
        setBlockedDates((prev) => {
          const next = { ...prev }
          delete next[date]
          return next
        })
        const { error } = await unblockSpot(removedBlock.id)
        if (error) {
          setBlockedDates((prev) => ({ ...prev, [date]: removedBlock }))
          alert(error.message || "Entsperren fehlgeschlagen")
        }
      } else if (releasedDates[date]) {
        // Eigene Tagesfreigabe zurücknehmen
        if (reservedDates.has(date)) {
          alert("Dieser Tag ist bereits von einem Kollegen gebucht und kann nicht zurückgenommen werden.")
          return
        }
        const removedAvail = releasedDates[date]
        setReleasedDates((prev) => {
          const next = { ...prev }
          delete next[date]
          return next
        })
        const { error } = await unreleaseSpot(removedAvail.id)
        if (error) {
          setReleasedDates((prev) => ({ ...prev, [date]: removedAvail }))
          alert(error.message || "Freigabe konnte nicht zurückgenommen werden")
        }
      } else if (effectivelyFree) {
        // Per Wochenrhythmus/Dauer frei, aber nicht explizit: für diesen Tag sperren
        setBlockedDates((prev) => ({ ...prev, [date]: { id: "optimistic", date } }))
        const { data, error } = await blockSpot(mySpot.id, user.id, date)
        if (error) {
          setBlockedDates((prev) => {
            const next = { ...prev }
            delete next[date]
            return next
          })
          alert(error.message || "Sperren fehlgeschlagen")
        } else if (data) {
          setBlockedDates((prev) => ({ ...prev, [date]: data }))
        }
      } else {
        // Besetzt → eigene Freigabe setzen
        setReleasedDates((prev) => ({ ...prev, [date]: { id: "optimistic", date } }))
        const { data, error } = await releaseSpot(mySpot.id, user.id, date)
        if (error) {
          setReleasedDates((prev) => {
            const next = { ...prev }
            delete next[date]
            return next
          })
          alert(error.message || "Freigabe fehlgeschlagen")
        } else if (data) {
          setReleasedDates((prev) => ({ ...prev, [date]: data }))
        }
      }
    } finally {
      // Fortschritt x/y und Reservierungs-Flags mit Server abgleichen
      await loadData(false)
      setActionLoading(null)
    }
  }

  // ─── Toggle a recurring weekday (1=Mo … 5=Fr) ────────────────

  async function toggleRecurring(weekday) {
    if (!mySpot || recurringLoading !== null) return

    setRecurringLoading(weekday)

    try {
      if (recurringDays[weekday]) {
        const removed = recurringDays[weekday]
        setRecurringDays((prev) => {
          const next = { ...prev }
          delete next[weekday]
          return next
        })

        const { error } = await removeRecurringAvailability(removed.id)
        if (error) {
          setRecurringDays((prev) => ({ ...prev, [weekday]: removed }))
          alert(error.message || "Wochentag konnte nicht deaktiviert werden")
        }
      } else {
        setRecurringDays((prev) => ({ ...prev, [weekday]: { id: "optimistic", weekday } }))

        const { data, error } = await addRecurringAvailability(mySpot.id, user.id, weekday)
        if (error) {
          setRecurringDays((prev) => {
            const next = { ...prev }
            delete next[weekday]
            return next
          })
          alert(error.message || "Wochentag konnte nicht aktiviert werden")
        } else if (data) {
          setRecurringDays((prev) => ({ ...prev, [weekday]: data }))
        }
      }
    } finally {
      await loadData(false)
      setRecurringLoading(null)
    }
  }

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-orendt-gray-200">
        <div className="w-8 h-8 border-2 border-orendt-gray-200 border-t-orendt-black rounded-full animate-spin" />
      </div>
    )
  }

  if (mySpots.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-orendt-gray-200">
        <div className="w-16 h-16 bg-orendt-gray-50 rounded-2xl mx-auto mb-6 flex items-center justify-center border border-orendt-gray-100">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#BBBBBB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
          </svg>
        </div>
        <h3 className="font-display text-xl font-bold text-orendt-black mb-2 uppercase tracking-tight">
          Keine Zuweisung
        </h3>
        <p className="text-sm text-orendt-gray-400 font-body max-w-xs mx-auto leading-relaxed">
          Dir wurde noch kein fester Parkplatz zugewiesen. Bitte wende dich an die Administration.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl border border-orendt-gray-200 shadow-sm">
      {/* Spot selection tabs (only if multiple spots) */}
      {mySpots.length > 1 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {mySpots.map((spot, idx) => (
            <button
              key={spot.id}
              onClick={() => setSelectedSpotIdx(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border-2 ${selectedSpotIdx === idx ? "bg-orendt-black text-orendt-white border-orendt-black shadow-md" : "bg-white text-orendt-gray-400 border-orendt-gray-100 hover:border-orendt-black hover:text-orendt-black"}`}
            >
              {spot.label}
              <span className={`text-[8px] tracking-wider ${selectedSpotIdx === idx ? "text-orendt-white/70" : "text-orendt-gray-300"}`}>{spot.zone}</span>
            </button>
          ))}
        </div>
      )}

      {/* Header with month navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 sm:mb-10">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-orendt-black uppercase tracking-tight">
            Mein Monat
          </h2>
          <p className="text-[10px] sm:text-xs font-display font-bold text-orendt-gray-400 uppercase tracking-widest mt-1">
            Platz <span className="text-orendt-black">{mySpot.label}</span> · {mySpot.zone}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          {/* Month navigation */}
          <div className="flex items-center gap-1.5 p-1 bg-orendt-gray-50 rounded-xl border border-orendt-gray-200">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-orendt-gray-500 hover:text-orendt-black"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="px-3 text-[11px] font-display font-bold text-orendt-black uppercase tracking-wider min-w-[130px] text-center">
              {getMonthLabel(currentYear, currentMonth)}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-orendt-gray-500 hover:text-orendt-black"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Permanent release banner */}
      {mySpot?.is_permanently_released && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
          <span className="text-xl leading-none flex-shrink-0">🔓</span>
          <div>
            <p className="text-[11px] font-display font-bold uppercase tracking-widest text-emerald-700">
              Dauerhaft freigegeben
            </p>
            <p className="text-[10px] font-display text-emerald-600 mt-0.5 leading-relaxed">
              Dein Platz <span className="font-bold">{mySpot.label}</span> wurde von der Administration dauerhaft für Kollegen freigegeben – jeden Tag, ohne Ausnahme.
            </p>
          </div>
        </div>
      )}

      {/* ─── Recurring Weekday Toggles ──────────────────────────── */}
      <div className="mb-8 p-5 bg-orendt-gray-50 rounded-2xl border border-orendt-gray-100">
        <div className="flex items-center gap-2 mb-4">
          {/* Repeat icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          <span className="text-[10px] font-display font-bold uppercase tracking-widest text-orendt-gray-500">
            Dauerhaft freigeben – Wochentage
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {WEEKDAY_LABELS.map((label, idx) => {
            const weekday = idx + 1 // 1=Mo … 5=Fr
            const isActive = !!recurringDays[weekday]
            const isLoadingThis = recurringLoading === weekday

            return (
              <button
                key={weekday}
                onClick={() => toggleRecurring(weekday)}
                disabled={isLoadingThis || recurringLoading !== null}
                className={`
                  relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-200 font-display font-bold text-[11px] uppercase tracking-wider
                  ${isActive
                    ? "bg-orendt-black border-orendt-black text-orendt-white shadow-md scale-[1.03]"
                    : "bg-white border-orendt-gray-200 text-orendt-gray-500 hover:border-orendt-gray-400 hover:text-orendt-black hover:bg-orendt-gray-50"
                  }
                  ${isLoadingThis ? "opacity-60 cursor-wait" : "cursor-pointer active:scale-95"}
                `}
              >
                {isLoadingThis ? (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={isActive ? "opacity-100" : "opacity-40"}
                  >
                    {isActive ? (
                      <polyline points="20 6 9 17 4 12" />
                    ) : (
                      <>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </>
                    )}
                  </svg>
                )}
                {label}
                <span className={`text-[8px] tracking-wide ${isActive ? "text-orendt-white/70" : "text-orendt-gray-300"}`}>
                  {(recurringProgressByWeekday[weekday]?.approvedCount || 0)}/{(recurringProgressByWeekday[weekday]?.requiredCount || 0)}
                </span>
              </button>
            )
          })}
        </div>

        <p className="text-[9px] text-orendt-gray-400 font-display font-bold uppercase tracking-widest mt-3 text-center">
          Aktive Tage werden jede Woche automatisch für Kollegen freigegeben
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 sm:gap-6 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orendt-gray-300 border border-black/5" />
          <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-orendt-gray-400">Besetzt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orendt-accent border border-black/5 animate-pulse" />
          <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-orendt-gray-400">Freigegeben</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-status-reserved border border-black/5" />
          <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-orendt-gray-400">Gebucht</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] sm:text-[10px] font-display font-bold text-orendt-gray-400">↻</span>
          <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-orendt-gray-400">Dauerhaft frei</span>
        </div>
         <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 border border-black/5" />
          <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-orendt-gray-400">Warten auf Co-Owner</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-orendt-gray-100 overflow-hidden bg-orendt-gray-50/50 backdrop-blur-sm">
        {/* Weekday headers */}
        <div className="grid grid-cols-5 bg-white border-b border-orendt-gray-100">
          {WEEKDAY_LABELS.map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em]">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="animate-stagger">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-5 border-b border-orendt-gray-50 last:border-0">
              {week.map((date) => {
                const released = !!releasedDates[date]
                const reserved = reservedDates.has(date)
                const blocked = !!blockedDates[date]
                const past = isPast(date)
                const todayDate = isToday(date)
                const inMonth = isInMonth(date, currentYear, currentMonth)
                const isLoading = actionLoading === date

                // Check if this date's weekday is a recurring day
                const weekdayNum = getWeekdayNumber(date) // 1–5
                const isRecurring = !!recurringDays[weekdayNum]
                const isPermanent = mySpot?.is_permanently_released === true
                const progress = releaseProgressByDate[date] || { approvedCount: 0, requiredCount: 0, isFullyReleased: false }
                const recurringProgress = recurringProgressByWeekday[weekdayNum] || { approvedCount: 0, requiredCount: 0, isFullyReleased: false }
                const hasOwnerIntent = released || (isRecurring && inMonth && !past) || (isPermanent && inMonth && !past)
                const isFullyReleased = isPermanent || progress.isFullyReleased || (isRecurring && recurringProgress.isFullyReleased)
                const waitingForOthers = !blocked && !reserved && hasOwnerIntent && !isFullyReleased && inMonth && !past
                const effectivelyFree = !blocked && !past && inMonth && isFullyReleased

                return (
                  <button
                    key={date}
                    onClick={() => toggleDate(date)}
                    disabled={past || isLoading || !inMonth}
                    className={`
                      relative group py-4 sm:py-6 px-1 sm:px-2 text-center transition-all duration-300 border-r border-orendt-gray-50 last:border-0
                      ${!inMonth ? "opacity-15 cursor-default" : past ? "opacity-25 cursor-not-allowed" : "cursor-pointer hover:bg-white active:scale-95"}
                      ${reserved ? "bg-status-reserved/5" : blocked ? "bg-transparent" : effectivelyFree ? "bg-orendt-accent/5" : waitingForOthers ? "bg-amber-50" : "bg-transparent"}
                    `}
                  >
                    {todayDate && (
                      <div className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div className="w-1 h-1 rounded-full bg-orendt-black" />
                      </div>
                    )}

                    {/* Recurring indicator */}
                    {isRecurring && inMonth && !past && !blocked && (
                      <div className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 text-[8px] text-orendt-gray-400 font-bold leading-none">
                        ↻
                      </div>
                    )}

                    {/* Permanent indicator */}
                    {!isRecurring && isPermanent && inMonth && !past && !blocked && (
                      <div className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 text-[8px] text-emerald-400 font-bold leading-none">
                        ∞
                      </div>
                    )}

                    {waitingForOthers && (
                      <div className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 text-[8px] text-amber-500 font-bold leading-none">
                        …
                      </div>
                    )}

                    <span className={`
                      block font-display text-sm sm:text-base font-bold mb-0.5 sm:mb-1 transition-colors duration-200
                      ${todayDate ? "text-orendt-black" : past || !inMonth ? "text-orendt-gray-300" : "text-orendt-gray-600 group-hover:text-orendt-black"}
                    `}>
                      {new Date(date).getDate()}
                    </span>

                    <span className={`
                      block text-[7px] sm:text-[9px] font-display font-bold uppercase tracking-widest leading-tight
                      ${!inMonth ? "text-transparent" : reserved ? "text-amber-600" : blocked ? "text-orendt-gray-300" : waitingForOthers ? "text-amber-600" : released ? "text-green-600" : (isRecurring || isPermanent) && !past ? "text-green-500" : past ? "text-transparent" : "text-orendt-gray-300"}
                    `}>
                      {isLoading ? "..." : !inMonth ? "–" : reserved ? "Gebucht" : blocked ? "Besetzt" : waitingForOthers ? "Warten" : effectivelyFree ? "Frei" : past ? "" : "Besetzt"}
                    </span>
                    {inMonth && !past && !reserved && !blocked && (progress.requiredCount > 0 || recurringProgress.requiredCount > 0) && (
                      <span className="block text-[7px] text-orendt-gray-400 font-display font-bold tracking-wide mt-0.5">
                        {isRecurring && recurringProgress.requiredCount > 0
                          ? `${recurringProgress.approvedCount}/${recurringProgress.requiredCount}`
                          : `${progress.approvedCount}/${progress.requiredCount}`} Owner
                      </span>
                    )}

                    {/* Visual indicator bar */}
                    {inMonth && !past && (
                      <div className={`
                        absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 transition-all duration-300
                        ${reserved ? "bg-status-reserved" : blocked ? "bg-transparent" : effectivelyFree ? "bg-orendt-accent opacity-60 group-hover:opacity-100" : "opacity-0"}
                      `} />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BBBBBB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
        <p className="text-[10px] text-orendt-gray-400 font-display font-bold uppercase tracking-widest">
          Klicke auf einen Tag um ihn freizugeben
        </p>
      </div>
    </div>
  )
}
