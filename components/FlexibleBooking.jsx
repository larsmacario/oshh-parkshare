"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getAvailableSpotsForDate,
  reserveSpot,
  getMyReservations,
  getAppSetting,
} from "@/lib/supabase"
import { getToday, formatDateLong } from "@/lib/dates"

export default function FlexibleBooking({ user }) {
  const today = getToday()
  const [firstAvailableSpot, setFirstAvailableSpot] = useState(null)
  const [myTodayReservation, setMyTodayReservation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [keyBoxPin, setKeyBoxPin] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)

    // Check if user already has a reservation for today
    const { data: reservations } = await getMyReservations(user.id, today)
    const todayRes = (reservations || []).find((r) => r.date === today)
    setMyTodayReservation(todayRes || null)

    // Load key box PIN when user has a reservation
    if (todayRes) {
      const { data: pin } = await getAppSetting("key_box_pin")
      setKeyBoxPin(pin || null)
    }

    if (!todayRes) {
      // No booking yet → find first available spot (lowest sort_order)
      const { data: available } = await getAvailableSpotsForDate(today, user.team_id || null)
      // Sort by spot sort_order (lowest first), then take the first one
      const sorted = (available || []).sort(
        (a, b) => (a.spot?.sort_order ?? 999) - (b.spot?.sort_order ?? 999)
      )
      setFirstAvailableSpot(sorted.length > 0 ? sorted[0] : null)
    } else {
      setFirstAvailableSpot(null)
    }

    setLoading(false)
  }, [user.id, today])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleBook() {
    if (!firstAvailableSpot || booking) return
    setBooking(true)
    const { error } = await reserveSpot(
      firstAvailableSpot.spot_id,
      // Team spots have no availability entry – pass null
      firstAvailableSpot.is_team_spot ? null : firstAvailableSpot.id,
      user.id,
      today
    )
    if (error) {
      alert(error.message || "Fehler beim Buchen")
    }
    await loadData()
    setBooking(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-orendt-gray-200">
        <div className="w-8 h-8 border-2 border-orendt-gray-200 border-t-orendt-black rounded-full animate-spin" />
      </div>
    )
  }

  // State 1: User already has a spot for today
  if (myTodayReservation) {
    return (
      <div className="bg-white p-8 md:p-10 rounded-3xl border-2 border-orendt-accent/30 shadow-sm animate-fade-in">
        <div className="text-center">
          <div className="w-20 h-20 bg-orendt-accent/10 border-2 border-orendt-accent/20 rounded-3xl mx-auto mb-6 flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3">
            Dein Platz Heute
          </p>

          <div className="inline-flex items-center justify-center w-24 h-24 bg-orendt-black rounded-3xl mb-6 shadow-xl">
            <span className="font-display text-4xl font-bold text-orendt-accent">
              {myTodayReservation.spot?.label}
            </span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-orendt-black uppercase tracking-tight mb-2">
            Platz gesichert! 🎉
          </h2>

          <p className="text-sm text-orendt-gray-500 font-body max-w-sm mx-auto leading-relaxed mb-6">
            Dein Parkplatz <span className="font-bold text-orendt-black">{myTodayReservation.spot?.label}</span> im Bereich <span className="font-bold text-orendt-black">{myTodayReservation.spot?.zone}</span> ist heute für dich reserviert.
          </p>

          {keyBoxPin ? (
            <div className="mt-6 p-5 bg-orendt-gray-50 border-2 border-orendt-accent/30 rounded-2xl inline-block">
              <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2">
                🔑 Schlüsselkasten PIN
              </p>
              <p className="font-mono text-3xl font-bold text-orendt-black tracking-[0.4em]">
                {keyBoxPin}
              </p>
            </div>
          ) : myTodayReservation.spot?.spot_type === "team" ? (
            <div className="mt-6 p-5 bg-emerald-50 border-2 border-emerald-200 rounded-2xl inline-block">
              <p className="text-[10px] font-display font-bold text-emerald-600 uppercase tracking-[0.2em] mb-1">
                ✨ Team-Parkplatz
              </p>
              <p className="text-sm font-display font-bold text-emerald-700">
                Kein Schlüssel benötigt
              </p>
            </div>
          ) : null}

          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orendt-gray-50 border border-orendt-gray-200 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-orendt-accent animate-pulse" />
            <span className="text-[10px] font-display font-bold text-orendt-gray-500 uppercase tracking-wider">
              Gültig bis Mitternacht
            </span>
          </div>
        </div>
      </div>
    )
  }

  // State 2: A spot is available
  if (firstAvailableSpot) {
    return (
      <div className="bg-white p-8 md:p-10 rounded-3xl border border-orendt-gray-200 shadow-sm animate-fade-in">
        <div className="text-center">
          <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3">
            Verfügbar Heute
          </p>

          <div className="inline-flex items-center justify-center w-24 h-24 bg-orendt-gray-50 border-2 border-orendt-gray-200 rounded-3xl mb-6 group-hover:bg-orendt-accent/10 transition-colors">
            <span className="font-display text-4xl font-bold text-orendt-black">
              {firstAvailableSpot.spot?.label}
            </span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-orendt-black uppercase tracking-tight mb-2">
            Ein Platz wartet auf dich
          </h2>

          <p className="text-sm text-orendt-gray-500 font-body max-w-sm mx-auto leading-relaxed mb-2">
            Bereich <span className="font-bold text-orendt-black">{firstAvailableSpot.spot?.zone}</span>
            {firstAvailableSpot.is_team_spot ? (
              <> · <span className="text-emerald-600 font-bold">Team-Platz – Kein Schlüssel benötigt</span></>
            ) : (
              <> · Freigegeben von <span className="font-bold text-orendt-black">{firstAvailableSpot.released_by_user?.full_name?.split(" ")[0]}</span></>
            )}
          </p>

          <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-widest mb-8">
            First come, first served
          </p>

          <button
            onClick={handleBook}
            disabled={booking}
            className="w-full sm:w-auto px-12 py-5 bg-orendt-black text-orendt-accent font-display text-sm font-bold uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-xl hover:shadow-2xl"
          >
            {booking ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-orendt-accent/30 border-t-orendt-accent rounded-full animate-spin" />
                Wird gebucht...
              </div>
            ) : (
              "Platz sichern"
            )}
          </button>
        </div>
      </div>
    )
  }

  // State 3: No spots available – humorous message
  return (
    <div className="bg-white p-8 md:p-10 rounded-3xl border-2 border-dashed border-orendt-gray-200 shadow-sm animate-fade-in">
      <div className="text-center">
        <div className="text-6xl mb-6">🚗💨</div>

        <h2 className="font-display text-2xl sm:text-3xl font-bold text-orendt-black uppercase tracking-tight mb-3">
          Alles belegt!
        </h2>

        <p className="text-base text-orendt-gray-500 font-body max-w-md mx-auto leading-relaxed mb-4">
          Heute haben alle schneller geklickt als du. 😅
        </p>
        <p className="text-sm text-orendt-gray-400 font-body max-w-md mx-auto leading-relaxed">
          Vielleicht hat das Universum einen anderen Weg für dich geplant – oder du fragst mal nett bei deinen Kollegen, ob jemand seinen Platz freigibt. 🤞
        </p>

        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-orendt-gray-50 border border-orendt-gray-200 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-status-occupied" />
          <span className="text-[10px] font-display font-bold text-orendt-gray-500 uppercase tracking-wider">
            Versuch's morgen wieder!
          </span>
        </div>
      </div>
    </div>
  )
}
