"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getMyAvailabilities,
  getAssignments,
  releaseSpot,
  unreleaseSpot,
  getReservationsForDate,
  getRecurringAvailabilities,
  addRecurringAvailability,
  removeRecurringAvailability,
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
  const [mySpot, setMySpot] = useState(null)
  const [releasedDates, setReleasedDates] = useState({}) // date -> availability obj
  const [reservedDates, setReservedDates] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  // Recurring: Map weekday (1–5) -> recurring_availabilities row (or null)
  const [recurringDays, setRecurringDays] = useState({}) // { 1: { id, weekday, ... }, ... }
  const [recurringLoading, setRecurringLoading] = useState(null) // weekday number being toggled

  const weeks = getMonthWeeks(currentYear, currentMonth)

  const loadData = useCallback(async (isInitial = true) => {
    if (isInitial) setLoading(true)

    // Find my spot assignment
    const { data: assignments } = await getAssignments()
    const myAssignment = (assignments || []).find((a) => a.user?.id === user.id)

    if (myAssignment) {
      setMySpot(myAssignment.spot)

      // Load released dates for the visible month range
      const allDates = weeks.flat()
      const fromDate = allDates[0]
      const toDate = allDates[allDates.length - 1]
      const { data: avails } = await getMyAvailabilities(user.id, fromDate, toDate)

      const dateMap = {}
        ; (avails || []).forEach((a) => { dateMap[a.date] = a })
      setReleasedDates(dateMap)

      // Check which released dates already have reservations (in parallel)
      const reserved = new Set()
      const checks = await Promise.all(
        (avails || []).map(async (a) => {
          const { data: res } = await getReservationsForDate(a.date)
          return { date: a.date, hasReservation: res?.length > 0 }
        })
      )
      checks.forEach(({ date, hasReservation }) => {
        if (hasReservation) reserved.add(date)
      })
      setReservedDates(reserved)

      // Load recurring availabilities
      const { data: recur } = await getRecurringAvailabilities(user.id)
      const recurMap = {}
        ; (recur || []).forEach((r) => { recurMap[r.weekday] = r })
      setRecurringDays(recurMap)
    }

    if (isInitial) setLoading(false)
  }, [user.id, currentYear, currentMonth])

  useEffect(() => {
    loadData(true)
  }, [loadData])

  // ─── Toggle a specific calendar date ─────────────────────────

  async function toggleDate(date) {
    if (isPast(date) || !mySpot || actionLoading) return

    setActionLoading(date)

    if (releasedDates[date]) {
      // Already released → re-occupy
      if (reservedDates.has(date)) {
        alert("Dieser Tag ist bereits von einem Kollegen gebucht und kann nicht zurückgenommen werden.")
        setActionLoading(null)
        return
      }

      // Optimistic: remove from releasedDates immediately
      const removedAvail = releasedDates[date]
      setReleasedDates((prev) => {
        const next = { ...prev }
        delete next[date]
        return next
      })

      const { error } = await unreleaseSpot(removedAvail.id)
      if (error) {
        // Revert on failure
        setReleasedDates((prev) => ({ ...prev, [date]: removedAvail }))
      }
    } else {
      // Occupied (default) → release
      // Optimistic: add to releasedDates immediately with a placeholder
      setReleasedDates((prev) => ({ ...prev, [date]: { id: "optimistic", date } }))

      const { data, error } = await releaseSpot(mySpot.id, user.id, date)
      if (error) {
        // Revert on failure
        setReleasedDates((prev) => {
          const next = { ...prev }
          delete next[date]
          return next
        })
      } else if (data) {
        // Replace optimistic entry with real data
        setReleasedDates((prev) => ({ ...prev, [date]: data }))
      }
    }

    setActionLoading(null)
  }

  // ─── Toggle a recurring weekday (1=Mo … 5=Fr) ────────────────

  async function toggleRecurring(weekday) {
    if (!mySpot || recurringLoading !== null) return

    setRecurringLoading(weekday)

    if (recurringDays[weekday]) {
      // Currently active → deactivate
      const removed = recurringDays[weekday]
      // Optimistic
      setRecurringDays((prev) => {
        const next = { ...prev }
        delete next[weekday]
        return next
      })

      const { error } = await removeRecurringAvailability(removed.id)
      if (error) {
        // Revert
        setRecurringDays((prev) => ({ ...prev, [weekday]: removed }))
      }
    } else {
      // Currently inactive → activate
      // Optimistic placeholder
      setRecurringDays((prev) => ({ ...prev, [weekday]: { id: "optimistic", weekday } }))

      const { data, error } = await addRecurringAvailability(mySpot.id, user.id, weekday)
      if (error) {
        // Revert
        setRecurringDays((prev) => {
          const next = { ...prev }
          delete next[weekday]
          return next
        })
      } else if (data) {
        setRecurringDays((prev) => ({ ...prev, [weekday]: data }))
      }
    }

    setRecurringLoading(null)
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

  if (!mySpot) {
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
                    ? "bg-orendt-black border-orendt-black text-orendt-accent shadow-md scale-[1.03]"
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
                const past = isPast(date)
                const todayDate = isToday(date)
                const inMonth = isInMonth(date, currentYear, currentMonth)
                const isLoading = actionLoading === date

                // Check if this date's weekday is a recurring day
                const weekdayNum = getWeekdayNumber(date) // 1–5
                const isRecurring = !!recurringDays[weekdayNum]
                // A day is "effectively free" if explicitly released OR recurring
                const effectivelyFree = released || (isRecurring && inMonth && !past)

                return (
                  <button
                    key={date}
                    onClick={() => toggleDate(date)}
                    disabled={past || isLoading || !inMonth}
                    className={`
                      relative group py-4 sm:py-6 px-1 sm:px-2 text-center transition-all duration-300 border-r border-orendt-gray-50 last:border-0
                      ${!inMonth ? "opacity-15 cursor-default" : past ? "opacity-25 cursor-not-allowed" : "cursor-pointer hover:bg-white active:scale-95"}
                      ${reserved ? "bg-status-reserved/5" : effectivelyFree ? "bg-orendt-accent/5" : "bg-transparent"}
                    `}
                  >
                    {todayDate && (
                      <div className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div className="w-1 h-1 rounded-full bg-orendt-black" />
                      </div>
                    )}

                    {/* Recurring indicator */}
                    {isRecurring && inMonth && !past && (
                      <div className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 text-[8px] text-orendt-gray-400 font-bold leading-none">
                        ↻
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
                      ${!inMonth ? "text-transparent" : reserved ? "text-amber-600" : released ? "text-green-600" : isRecurring && !past ? "text-green-500" : past ? "text-transparent" : "text-orendt-gray-300"}
                    `}>
                      {isLoading ? "..." : !inMonth ? "–" : reserved ? "Gebucht" : released ? "Frei" : isRecurring && !past ? "Frei" : past ? "" : "Besetzt"}
                    </span>

                    {/* Visual indicator bar */}
                    {inMonth && effectivelyFree && !past && (
                      <div className={`
                        absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 transition-all duration-300
                        ${reserved ? "bg-status-reserved" : "bg-orendt-accent opacity-60 group-hover:opacity-100"}
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
