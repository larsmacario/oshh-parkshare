"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getAvailableSpotsForDate,
  reserveSpot,
  cancelReservation,
  getMyReservations,
  getAppSetting,
} from "@/lib/supabase"
import { getToday, formatDateLong } from "@/lib/dates"

/** Schriftgröße skaliert mit der Länge, damit lange Platznamen in der Box bleiben. */
function spotBadgeTextClass(label) {
  const n = label.length
  if (n <= 4) return "text-4xl leading-none"
  if (n <= 7) return "text-3xl leading-tight"
  if (n <= 11) return "text-2xl leading-tight"
  if (n <= 16) return "text-xl leading-snug tracking-tight"
  return "text-lg leading-snug tracking-tight break-words"
}

function ParkingSpotBadge({ label, variant }) {
  const text = label || "?"
  const typo = spotBadgeTextClass(text)
  const isReserved = variant === "reserved"

  return (
    <div
      className={[
        "inline-flex items-center justify-center rounded-3xl mb-6 px-4 py-4",
        "min-h-[5.5rem] min-w-[5.5rem] max-w-[14rem] sm:max-w-[16rem]",
        "text-balance",
        isReserved
          ? "bg-orendt-black shadow-xl"
          : "bg-orendt-gray-50 border-2 border-orendt-gray-200 group-hover:bg-orendt-accent/10 transition-colors",
      ].join(" ")}
    >
      <span
        className={[
          "font-display font-bold text-center break-words hyphens-auto",
          typo,
          isReserved ? "text-orendt-accent" : "text-orendt-black",
        ].join(" ")}
      >
        {text}
      </span>
    </div>
  )
}

export default function FlexibleBooking({ user }) {
  const today = getToday()
  const [availableSpots, setAvailableSpots] = useState([])
  const [currentSpotIndex, setCurrentSpotIndex] = useState(0)
  const [myTodayReservation, setMyTodayReservation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [keyBoxPin, setKeyBoxPin] = useState(null)
  const currentSpot = availableSpots[currentSpotIndex] || null

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
      // No booking yet -> load and sort all available spots (lowest sort_order first)
      const { data: available } = await getAvailableSpotsForDate(today)
      const sorted = (available || []).sort(
        (a, b) => (a.spot?.sort_order ?? 999) - (b.spot?.sort_order ?? 999)
      )
      setAvailableSpots(sorted)
      setCurrentSpotIndex(0)
    } else {
      setAvailableSpots([])
      setCurrentSpotIndex(0)
    }

    setLoading(false)
  }, [user.id, today])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleCancel() {
    if (!myTodayReservation || cancelling) return
    if (!confirm("Möchtest du deinen Platz wirklich freigeben? Er wird sofort wieder für andere verfügbar.")) return
    setCancelling(true)
    const { error } = await cancelReservation(myTodayReservation.id)
    if (error) {
      alert(error.message || "Fehler beim Freigeben")
    }
    await loadData()
    setCancelling(false)
  }

  async function handleBook() {
    if (!currentSpot || booking) return
    setBooking(true)
    const { error } = await reserveSpot(
      currentSpot.spot_id,
      currentSpot.id,
      user.id,
      today
    )
    if (error) {
      alert(error.message || "Fehler beim Buchen")
    }
    await loadData()
    setBooking(false)
  }

  function handleSkipSpot() {
    if (availableSpots.length <= 1) return
    setCurrentSpotIndex((prev) => (prev + 1) % availableSpots.length)
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

          <ParkingSpotBadge
            label={myTodayReservation.spot?.label}
            variant="reserved"
          />

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-orendt-black uppercase tracking-tight mb-2">
            Platz gesichert! 🎉
          </h2>

          <p className="text-sm text-orendt-gray-500 font-body max-w-sm mx-auto leading-relaxed mb-6">
            Dein Parkplatz <span className="font-bold text-orendt-black">{myTodayReservation.spot?.label}</span> im Bereich <span className="font-bold text-orendt-black">{myTodayReservation.spot?.zone}</span> ist heute für dich reserviert.
          </p>

          <div className="flex flex-col items-center gap-4 mt-6">
            {keyBoxPin ? (
              <div className="p-5 bg-orendt-gray-50 border-2 border-orendt-accent/30 rounded-2xl">
                <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2">
                  🔑 Schlüsselkasten PIN
                </p>
                <p className="font-mono text-3xl font-bold text-orendt-black tracking-[0.4em]">
                  {keyBoxPin}
                </p>
              </div>
            ) : null}

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orendt-gray-50 border border-orendt-gray-200 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-orendt-accent animate-pulse" />
              <span className="text-[10px] font-display font-bold text-orendt-gray-500 uppercase tracking-wider">
                Gültig bis Mitternacht
              </span>
            </div>

            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="mt-2 px-6 py-3 bg-white text-orendt-gray-500 font-display text-xs font-bold uppercase tracking-[0.15em] rounded-xl border border-orendt-gray-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
            >
              {cancelling ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-orendt-gray-300 border-t-orendt-gray-500 rounded-full animate-spin" />
                  Wird freigegeben...
                </div>
              ) : (
                "Platz freigeben"
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // State 2: A spot is available
  if (currentSpot) {
    return (
      <div className="group bg-white p-8 md:p-10 rounded-3xl border border-orendt-gray-200 shadow-sm animate-fade-in">
        <div className="text-center">
          <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3">
            Verfügbar Heute
          </p>

          <ParkingSpotBadge
            label={currentSpot.spot?.label}
            variant="available"
          />

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-orendt-black uppercase tracking-tight mb-2">
            Ein Platz wartet auf dich
          </h2>

          <p className="text-sm text-orendt-gray-500 font-body max-w-sm mx-auto leading-relaxed mb-2">
            Bereich <span className="font-bold text-orendt-black">{currentSpot.spot?.zone}</span>
            {currentSpot.released_by_user && (
              <> · Freigegeben von <span className="font-bold text-orendt-black">{currentSpot.released_by_user?.full_name?.split(" ")[0]}</span></>
            )}
          </p>

          <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-widest mb-6">
            First come, first served
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {availableSpots.length > 1 ? (
              <button
                onClick={handleSkipSpot}
                disabled={booking}
                className="w-full sm:w-auto px-6 py-4 bg-white text-orendt-gray-600 font-display text-xs font-bold uppercase tracking-[0.15em] rounded-2xl border border-orendt-gray-200 hover:border-orendt-gray-400 hover:text-orendt-black active:scale-95 transition-all disabled:opacity-50"
              >
                Platz überspringen
              </button>
            ) : null}
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
