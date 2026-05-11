"use client"

import { useState, useEffect } from "react"
import { getDailyOverview } from "@/lib/supabase"
import { formatDateLong, formatDateISO, getToday, isToday } from "@/lib/dates"

const STATUS_CONFIG = {
  available: {
    label: "Verfügbar",
    color: "bg-status-free",
    bgColor: "bg-status-free-bg",
    borderColor: "border-status-free/30",
    textColor: "text-green-700",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  reserved: {
    label: "Reserviert",
    color: "bg-status-reserved",
    bgColor: "bg-status-reserved-bg",
    borderColor: "border-status-reserved/30",
    textColor: "text-amber-700",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  occupied: {
    label: "Belegt",
    color: "bg-status-occupied",
    bgColor: "bg-status-occupied-bg",
    borderColor: "border-status-occupied/30",
    textColor: "text-red-700",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
  unassigned: {
    label: "Frei",
    color: "bg-orendt-gray-300",
    bgColor: "bg-orendt-gray-50",
    borderColor: "border-orendt-gray-200",
    textColor: "text-orendt-gray-500",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
  },
}

export default function ParkingOverview({ user, onBook }) {
  const [date, setDate] = useState(getToday())
  const [spots, setSpots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOverview()
  }, [date])

  async function loadOverview() {
    setLoading(true)
    const { data } = await getDailyOverview(date)
    setSpots(data || [])
    setLoading(false)
  }

  function changeDate(delta) {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(formatDateISO(d))
  }

  // Group spots by zone
  const zones = {}
  spots.forEach((spot) => {
    if (!zones[spot.zone]) zones[spot.zone] = []
    zones[spot.zone].push(spot)
  })

  const sortedZoneEntries = Object.entries(zones).map(([zone, zoneSpots]) => [
    zone,
    [...zoneSpots].sort(compareSpotsByLabel),
  ])

  const counts = {
    available: spots.filter((s) => s.status === "available").length,
    reserved: spots.filter((s) => s.status === "reserved").length,
    occupied: spots.filter((s) => s.status === "occupied").length,
    total: spots.length,
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl border border-orendt-gray-200 shadow-sm">
      {/* Date navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-orendt-black uppercase tracking-tight">
            Übersicht
          </h2>
          <p className="text-xs font-display font-bold text-orendt-gray-400 uppercase tracking-widest mt-1">
            {isToday(date) ? "Heute" : formatDateLong(date)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-orendt-gray-50 rounded-xl border border-orendt-gray-200 self-start">
          <button
            onClick={() => changeDate(-1)}
            className="p-2.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-orendt-gray-500 hover:text-orendt-black"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => setDate(getToday())}
            className={`px-4 py-2 text-[11px] font-display font-bold uppercase tracking-wider rounded-lg transition-all ${isToday(date)
              ? "bg-orendt-black text-orendt-white shadow-md"
              : "text-orendt-gray-500 hover:text-orendt-black"
              }`}
          >
            Heute
          </button>
          <button
            onClick={() => changeDate(1)}
            className="p-2.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-orendt-gray-500 hover:text-orendt-black"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 xs:grid-cols-3 gap-3 mb-8 sm:mb-10">
        <StatusCounter label="Frei" count={counts.available} color="bg-status-free" />
        <StatusCounter label="Gebucht" count={counts.reserved} color="bg-status-reserved" />
        <StatusCounter label="Voll" count={counts.occupied} color="bg-status-occupied" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orendt-gray-200 border-t-orendt-black rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">
          {sortedZoneEntries.map(([zone, zoneSpots]) => (
            <div key={zone}>
              <div className="flex items-center gap-4 mb-4">
                <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-orendt-gray-400">
                  {zone}
                </h3>
                <div className="h-px flex-1 bg-orendt-gray-100" />
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 animate-stagger">
                {zoneSpots.map((spot, i) => (
                  <SpotCard
                    key={spot.id}
                    spot={spot}
                    index={i}
                    canBook={
                      spot.status === "available" &&
                      user?.role === "flexible"
                    }
                    onBook={onBook}
                  />
                ))}
              </div>
            </div>
          ))}
          {spots.length === 0 && (
            <div className="py-10 text-center border-2 border-dashed border-orendt-gray-100 rounded-3xl">
              <p className="text-sm font-body text-orendt-gray-400 italic">Keine Parkplätze gefunden</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SpotCard({ spot, canBook, onBook, index }) {
  const config = STATUS_CONFIG[spot.status] || STATUS_CONFIG.unassigned

  return (
    <div
      className={`
        group relative p-5 rounded-2xl border-2 transition-all duration-300 opacity-0 animate-slide-up
        ${config.bgColor} ${config.borderColor}
        ${canBook ? "cursor-pointer hover:border-orendt-black hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]" : ""}
      `}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
      onClick={() => canBook && onBook?.(spot)}
    >
      {/* Spot label */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-2xl font-bold text-orendt-black leading-none">
          {spot.label}
        </span>
        <div className={`${config.textColor} p-1.5 bg-white/50 rounded-lg backdrop-blur-sm border border-black/5`}>
          {config.icon}
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full ${config.color} ${spot.status === 'available' ? 'animate-pulse' : ''}`} />
        <span className={`text-[10px] font-display font-bold uppercase tracking-wider ${config.textColor}`}>
          {config.label}
        </span>
      </div>

      {/* Owner / Reserved by */}
      <div className="border-t border-black/5 pt-3 mt-3">
        <p className="text-[10px] text-orendt-gray-500 font-display font-bold uppercase tracking-wider truncate">
          {spot.status === "reserved" && spot.reservedBy
            ? "Gebucht von"
            : "Inhaber"}
        </p>
        <p className="text-xs font-body font-semibold text-orendt-black truncate mt-0.5">
          {spot.status === "reserved" && spot.reservedBy
            ? spot.reservedBy.full_name
            : spot.owners && spot.owners.length > 0
              ? spot.owners.map((o) => o.full_name).join(", ")
              : spot.owner
                ? spot.owner.full_name
                : "Nicht zugewiesen"}
        </p>
      </div>

      {/* Book interaction hint */}
      {canBook && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-orendt-black text-orendt-white text-[9px] font-display font-bold uppercase px-2 py-1 rounded shadow-lg">
            Buchen
          </div>
        </div>
      )}
    </div>
  )
}

function StatusCounter({ label, count, color }) {
  return (
    <div className="flex flex-col items-center p-4 bg-orendt-gray-50 rounded-2xl border border-orendt-gray-100 flex-1">
      <div className={`w-2 h-2 rounded-full ${color} mb-2`} />
      <span className="font-display text-2xl font-bold text-orendt-black leading-none">{count}</span>
      <span className="text-[9px] font-display font-bold uppercase tracking-wider text-orendt-gray-400 mt-2 text-center">{label}</span>
    </div>
  )
}

function compareSpotsByLabel(a, b) {
  const aLabel = a?.label || ""
  const bLabel = b?.label || ""

  return aLabel.localeCompare(bLabel, "de", {
    numeric: true,
    sensitivity: "base",
  })
}
