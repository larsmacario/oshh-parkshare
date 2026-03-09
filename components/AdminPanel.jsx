"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getProfiles,
  getSpots,
  createSpot,
  updateSpot,
  deleteSpot,
  getAssignments,
  assignSpot,
  unassignSpot,
  getStats,
  getReservationsForDate,
  getAvailableSpotsForDate,
  getAppSetting,
  updateAppSetting,
  createUserViaAdmin,
  getSession,
  toggleBlockUser,
  deleteUserByAdmin,
  updateUserRoleByAdmin,
  updateUserByAdmin,
  togglePermanentRelease,
} from "@/lib/supabase"
import { getToday } from "@/lib/dates"

// ─── Icons ─────────────────────────────────────────────────────
const chartIcon = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
const gridIcon = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
const usersIcon = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>

const settingsIcon = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>

// ─── Main Component ─────────────────────────────────────────────

export default function AdminPanel({ user }) {
  const [tab, setTab] = useState("overview")
  const [stats, setStats] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [spots, setSpots] = useState([])
  const [assignments, setAssignments] = useState([])
  const [todayReservations, setTodayReservations] = useState([])
  const [todayAvailable, setTodayAvailable] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const today = getToday()
    const [statsRes, profilesRes, spotsRes, assignmentsRes, todayRes, availRes] = await Promise.all([
      getStats(),
      getProfiles(),
      getSpots(),
      getAssignments(),
      getReservationsForDate(today),
      getAvailableSpotsForDate(today),
    ])
    setStats(statsRes)
    setProfiles(profilesRes.data || [])
    setSpots(spotsRes.data || [])
    setAssignments(assignmentsRes.data || [])
    setTodayReservations(todayRes.data || [])
    setTodayAvailable(availRes.data || [])
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const tabs = [
    { id: "overview", label: "Übersicht", icon: chartIcon },
    { id: "spots", label: "Parkplätze", icon: gridIcon },
    { id: "users", label: "Mitarbeiter", icon: usersIcon },
    { id: "settings", label: "Einstellungen", icon: settingsIcon },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-orendt-black uppercase tracking-tight">Administration</h2>
          <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-widest mt-1">System Management &amp; Control</p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-2xl border-2 border-orendt-gray-100 p-1 shadow-sm overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-display text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${tab === t.id ? "bg-orendt-black text-orendt-accent shadow-md" : "text-orendt-gray-400 hover:text-orendt-black hover:bg-orendt-gray-50"}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-32 bg-white rounded-[2.5rem] border border-orendt-gray-200">
            <div className="w-10 h-10 border-3 border-orendt-gray-100 border-t-orendt-black rounded-full animate-spin" />
          </div>
        ) : (
          <div className="animate-fade-in">
            {tab === "overview" && <OverviewTab stats={stats} todayReservations={todayReservations} todayAvailable={todayAvailable} />}
            {tab === "spots" && (
              <SpotsTab
                spots={spots}
                assignments={assignments}
                profiles={profiles.filter((p) => p.role === "owner" || p.role === "admin")}
                onRefresh={loadData}
              />
            )}
            {tab === "users" && <UsersTab profiles={profiles} onRefresh={loadData} />}
            {tab === "settings" && <SettingsTab />}
          </div>
        )}
      </div>

      <div className="text-center py-6 border-t border-orendt-gray-100">
        <p className="text-[10px] font-display font-bold text-orendt-gray-300 uppercase tracking-widest">
          Eingeloggt als {user?.email} · Admin-Panel
        </p>
      </div>
    </div>
  )
}

// ─── Overview Tab ───────────────────────────────────────────────

function OverviewTab({ stats, todayReservations, todayAvailable }) {
  if (!stats) return null
  const cards = [
    { label: "Parkplätze", value: stats.totalSpots, sub: "Total Capacity", icon: "🅿️" },
    { label: "Mitarbeiter", value: stats.totalUsers, sub: "Registered Users", icon: "👥" },
    { label: "Heute Frei", value: todayAvailable.length, sub: "Available Spots", icon: "✨" },
    { label: "Heute Belegt", value: stats.todayReservations, sub: "Active Bookings", icon: "🔑" },
  ]
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={card.label} className="p-8 bg-white rounded-[2rem] border-2 border-orendt-gray-100 hover:border-orendt-black transition-all shadow-sm group opacity-0 animate-slide-up" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "forwards" }}>
            <div className="text-3xl mb-4 group-hover:scale-125 transition-transform duration-500">{card.icon}</div>
            <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2">{card.label}</p>
            <p className="font-display text-4xl font-bold text-orendt-black tracking-tighter mb-2">{card.value}</p>
            <p className="text-[11px] text-orendt-gray-400 font-display font-bold uppercase tracking-widest">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Available spots today - who released what */}
      <div className="p-8 bg-white rounded-[2rem] border-2 border-orendt-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <h3 className="font-display text-sm font-bold text-orendt-black uppercase tracking-widest">Freie Plätze Heute</h3>
          <div className="h-px flex-1 bg-orendt-gray-100" />
          <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
            <span className="text-[10px] font-display font-bold text-emerald-700 uppercase tracking-wider">{todayAvailable.length} Verfügbar</span>
          </div>
        </div>
        {todayAvailable.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayAvailable.map((avail, i) => {
              const releaseType = avail.is_permanent ? "Dauerfreigabe" : avail.is_recurring ? "Wiederkehrend" : "Manuell"
              const releaseIcon = avail.is_permanent ? "∞" : avail.is_recurring ? "↻" : "✨"
              return (
                <div key={avail.id} className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 opacity-0 animate-slide-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}>
                  <div className="w-14 h-14 rounded-[1.25rem] bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <span className="font-display text-[10px] font-bold text-emerald-800 uppercase tracking-tight text-center leading-tight px-1">
                      {avail.spot?.label}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-display text-sm font-bold text-orendt-black block truncate">
                      {avail.released_by_user?.full_name || "Kein Inhaber"}
                    </span>
                    <span className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-wider block truncate">{avail.spot?.zone}</span>
                    <span className="text-[10px] font-display font-bold text-emerald-600 uppercase tracking-wider">{releaseIcon} {releaseType}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-orendt-gray-100 rounded-2xl">
            <p className="text-[11px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em]">Heute keine freien Plätze verfügbar</p>
          </div>
        )}
      </div>

      <div className="p-8 bg-white rounded-[2rem] border-2 border-orendt-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <h3 className="font-display text-sm font-bold text-orendt-black uppercase tracking-widest">Flexible Buchungen Heute</h3>
          <div className="h-px flex-1 bg-orendt-gray-100" />
          <div className="px-3 py-1 bg-orendt-gray-50 border border-orendt-gray-200 rounded-full">
            <span className="text-[10px] font-display font-bold text-orendt-black uppercase tracking-wider">{todayReservations.length} Buchungen</span>
          </div>
        </div>
        {todayReservations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayReservations.map((res, i) => (
              <div key={res.id} className="flex items-center gap-4 p-4 bg-orendt-gray-50 rounded-2xl border border-orendt-gray-100 opacity-0 animate-slide-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}>
                <div className="w-12 h-12 bg-orendt-accent/10 border border-orendt-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="font-display text-lg font-bold text-orendt-black">{res.spot?.label}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-display text-sm font-bold text-orendt-black block truncate">{res.user?.full_name}</span>
                  <span className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-wider">{res.spot?.zone}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-orendt-gray-100 rounded-2xl">
            <p className="text-[11px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em]">Heute noch keine flexiblen Buchungen</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Spots Tab ──────────────────────────────────────────────────

function SpotsTab({ spots, assignments, profiles, onRefresh }) {
  const [newLabel, setNewLabel] = useState("")
  const [newZone, setNewZone] = useState("Hauptparkplatz")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState("")
  const [editZone, setEditZone] = useState("")
  const [saving, setSaving] = useState(false)
  const [permanentLoading, setPermanentLoading] = useState(null) // spotId being toggled
  const [localPermanent, setLocalPermanent] = useState({}) // optimistic state: { [spotId]: bool }

  const assignmentsBySpot = {}
  assignments.forEach((a) => {
    if (!a.valid_until) {
      if (!assignmentsBySpot[a.spot_id]) assignmentsBySpot[a.spot_id] = []
      assignmentsBySpot[a.spot_id].push(a)
    }
  })

  async function handleAdd() {
    if (!newLabel.trim()) return
    setAdding(true)
    await createSpot(newLabel.trim(), newZone)
    setNewLabel("")
    await onRefresh(true)
    setAdding(false)
  }

  function startEdit(spot) {
    setEditingId(spot.id)
    setEditLabel(spot.label)
    setEditZone(spot.zone)
  }

  function cancelEdit() { setEditingId(null) }

  async function handleSaveEdit(spotId) {
    if (!editLabel.trim()) return
    setSaving(true)
    await updateSpot(spotId, { label: editLabel.trim(), zone: editZone })
    setEditingId(null)
    await onRefresh(true)
    setSaving(false)
  }

  async function handleDelete(spotId, label) {
    if (!confirm(`Parkplatz "${label}" wirklich löschen?`)) return
    await deleteSpot(spotId)
    await onRefresh(true)
  }

  async function handleTogglePermanent(spotId, currentValue) {
    const next = !currentValue
    // Optimistic UI update
    setLocalPermanent((prev) => ({ ...prev, [spotId]: next }))
    setPermanentLoading(spotId)
    await togglePermanentRelease(spotId, next)
    setPermanentLoading(null)
    // Silently refresh to sync DB state
    await onRefresh(true)
  }

  async function handleAddOwner(spotId, userId) {
    if (!userId) return
    await assignSpot(spotId, userId)
    await onRefresh(true)
  }

  async function handleRemoveOwner(assignmentId) {
    await unassignSpot(assignmentId)
    await onRefresh(true)
  }

  return (
    <div className="space-y-8">
      {/* Add form */}
      <div className="p-8 bg-white rounded-[2rem] border-2 border-orendt-gray-100 shadow-sm">
        <h3 className="font-display text-sm font-bold text-orendt-black uppercase tracking-widest mb-6">Neuen Platz anlegen</h3>
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Bezeichnung</label>
            <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="z.B. P-13" className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-sm font-body outline-none focus:border-orendt-black transition-all" />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Bereich</label>
            <select value={newZone} onChange={(e) => setNewZone(e.target.value)} className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-sm font-body outline-none focus:border-orendt-black transition-all appearance-none">
              <option>Tiefgarage</option>
              <option>Außenbereich</option>
              <option>Hauptparkplatz</option>
            </select>
          </div>
          <button onClick={handleAdd} disabled={adding || !newLabel.trim()} className="w-full md:w-auto px-8 py-4 bg-orendt-black text-orendt-accent font-display text-[11px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 disabled:opacity-30 transition-all shadow-lg active:scale-95">
            {adding ? "Hinzufügen..." : "Parkplatz Hinzufügen"}
          </button>
        </div>
      </div>

      {/* Spots grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {spots.map((spot, i) => {
          const isEditing = editingId === spot.id
          const spotAssignments = assignmentsBySpot[spot.id] || []
          const spotOwnerIds = new Set(spotAssignments.map((a) => a.user?.id).filter(Boolean))

          return (
            <div
              key={spot.id}
              className={`flex flex-col p-6 bg-white rounded-[2rem] border-2 transition-all duration-300 shadow-sm opacity-0 animate-slide-up ${isEditing ? "border-orendt-black" : "border-orendt-gray-100 hover:border-orendt-black"}`}
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "forwards" }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-[1.25rem] border flex items-center justify-center bg-orendt-gray-50 border-orendt-gray-100 flex-shrink-0 overflow-hidden">
                    <span className="font-display text-sm font-bold text-orendt-black uppercase tracking-tight text-center leading-tight px-1">
                      {(isEditing ? editLabel || spot.label : spot.label).slice(0, 5)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!isEditing ? (
                    <>
                      <button onClick={() => startEdit(spot)} className="p-2 text-orendt-gray-300 hover:text-orendt-black hover:bg-orendt-gray-50 rounded-xl transition-all" title="Bearbeiten">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(spot.id, spot.label)} className="p-2 text-orendt-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Löschen">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleSaveEdit(spot.id)} disabled={saving || !editLabel.trim()} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-30" title="Speichern">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </button>
                      <button onClick={cancelEdit} className="p-2 text-orendt-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Abbrechen">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Label/Zone */}
              {isEditing ? (
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Bezeichnung</label>
                    <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="w-full px-4 py-2.5 bg-orendt-gray-50 border border-orendt-gray-200 rounded-xl text-sm outline-none focus:border-orendt-black transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Bereich</label>
                    <select value={editZone} onChange={(e) => setEditZone(e.target.value)} className="w-full px-4 py-2.5 bg-orendt-gray-50 border border-orendt-gray-200 rounded-xl text-sm outline-none focus:border-orendt-black transition-all appearance-none">
                      <option>Tiefgarage</option>
                      <option>Außenbereich</option>
                      <option>Hauptparkplatz</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mb-5">
                  <span className="font-display text-base font-bold text-orendt-black block truncate" title={spot.label}>{spot.label}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-widest mt-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    {spot.zone}
                  </span>
                </div>
              )}

              {/* Assignment */}
              <div className="pt-4 border-t border-orendt-gray-100 space-y-3 mt-auto">
                <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] ml-1">Zugewiesen an</p>

                <div>
                  <label className="text-[9px] font-display font-bold text-orendt-gray-400 uppercase tracking-widest ml-1 block mb-1">Inhaber</label>
                  {/* Owner chips */}
                  {spotAssignments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {spotAssignments.map((a) => (
                        <div key={a.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-orendt-gray-50 border border-orendt-gray-200 rounded-xl group">
                          <span className="text-[11px] font-display font-bold text-orendt-black uppercase tracking-wider">{a.user?.full_name}</span>
                          <button onClick={() => handleRemoveOwner(a.id)} className="p-0.5 text-orendt-gray-300 hover:text-red-500 transition-colors" title="Entfernen">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Add owner dropdown */}
                  <div className="relative">
                    <select value="" onChange={(e) => handleAddOwner(spot.id, e.target.value)} className="w-full px-4 py-2.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-xl text-[11px] font-display font-bold uppercase tracking-wider outline-none focus:border-orendt-black transition-all appearance-none cursor-pointer pr-9">
                      <option value="">+ Mitarbeiter hinzufügen</option>
                      {profiles.filter((p) => !spotOwnerIds.has(p.id)).map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                </div>

                {/* Permanent release toggle */}
                {(() => {
                  const isPermanent = spot.id in localPermanent
                    ? localPermanent[spot.id]
                    : spot.is_permanently_released
                  const isToggling = permanentLoading === spot.id
                  return (
                    <button
                      onClick={() => handleTogglePermanent(spot.id, isPermanent)}
                      disabled={isToggling}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border-2 transition-all duration-200 group ${isPermanent
                          ? "bg-emerald-50 border-emerald-300 hover:border-emerald-400"
                          : "bg-orendt-gray-50 border-orendt-gray-100 hover:border-orendt-gray-300"
                        } disabled:opacity-50`}
                      title={isPermanent ? "Dauerfreigabe deaktivieren" : "Dauerhaft freigeben"}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none">{isPermanent ? "🔓" : "🔒"}</span>
                        <div className="text-left">
                          <span className={`block text-[10px] font-display font-bold uppercase tracking-widest ${isPermanent ? "text-emerald-700" : "text-orendt-gray-400"
                            }`}>
                            Dauerhaft freigegeben
                          </span>
                          {isPermanent && (
                            <span className="block text-[9px] font-display text-emerald-500 uppercase tracking-wider mt-0.5">Aktiv · Jeden Tag buchbar</span>
                          )}
                        </div>
                      </div>
                      {/* Toggle switch */}
                      <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 flex-shrink-0 ${isPermanent ? "bg-emerald-500" : "bg-orendt-gray-200"
                        }`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isPermanent ? "translate-x-5" : "translate-x-0"
                          }`} />
                        {isToggling && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })()}

              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Users Tab ──────────────────────────────────────────────────

function UsersTab({ profiles, onRefresh }) {
  const [newUser, setNewUser] = useState({ email: "", fullName: "", role: "flexible" })
  const [addingUser, setAddingUser] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [editingUser, setEditingUser] = useState(null) // { id, fullName, email }
  const [savingEdit, setSavingEdit] = useState(false)

  const ROLE_OPTIONS = [
    { value: "admin", label: "Administration" },
    { value: "owner", label: "Platzinhaber" },
    { value: "flexible", label: "Flexibler Nutzer" },
  ]

  function startEditUser(profile) {
    setEditingUser({ id: profile.id, fullName: profile.full_name || "", email: profile.email || "" })
  }

  function cancelEditUser() {
    setEditingUser(null)
  }

  async function handleSaveUser() {
    if (!editingUser || !editingUser.fullName.trim()) return
    setSavingEdit(true)
    try {
      const { data: { session } } = await getSession()
      await updateUserByAdmin(editingUser.id, { fullName: editingUser.fullName.trim(), email: editingUser.email.trim() }, session.access_token)
      setEditingUser(null)
      await onRefresh(true)
    } catch (err) {
      alert("Fehler: " + err.message)
    }
    setSavingEdit(false)
  }

  async function handleAddUser() {
    if (!newUser.email || !newUser.fullName) return
    setAddingUser(true)
    try {
      const { data: { session } } = await getSession()
      await createUserViaAdmin(newUser.email, newUser.fullName, newUser.role, session.access_token)
      setNewUser({ email: "", fullName: "", role: "flexible" })
      alert("Mitarbeiter erfolgreich angelegt! Er kann sich mit dem Default-Passwort einloggen.")
      await onRefresh(true)
    } catch (err) { alert(err.message) }
    setAddingUser(false)
  }

  async function handleRoleChange(userId, newRole) {
    setActionLoading(userId)
    try {
      const { data: { session } } = await getSession()
      await updateUserRoleByAdmin(userId, newRole, session.access_token)
      await onRefresh(true)
    } catch (err) { alert(err.message) }
    setActionLoading(null)
  }

  async function handleToggleBlock(userId, currentlyBlocked, name) {
    if (!confirm(`${name} wirklich ${currentlyBlocked ? "entsperren" : "sperren"}?`)) return
    setActionLoading(userId)
    const { error } = await toggleBlockUser(userId, !currentlyBlocked)
    if (error) alert("Fehler: " + error.message)
    await onRefresh(true)
    setActionLoading(null)
  }

  async function handleDeleteUser(userId, name) {
    if (!confirm(`${name} wirklich unwiderruflich löschen?`)) return
    setActionLoading(userId)
    try {
      const { data: { session } } = await getSession()
      await deleteUserByAdmin(userId, session.access_token)
      await onRefresh(true)
    } catch (err) { alert(err.message) }
    setActionLoading(null)
  }

  return (
    <div className="space-y-8">
      {/* Add user form */}
      <div className="p-8 bg-white rounded-[2rem] border-2 border-orendt-gray-100 shadow-sm">
        <h3 className="font-display text-sm font-bold text-orendt-black uppercase tracking-widest mb-2 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-orendt-black text-orendt-accent flex items-center justify-center text-[10px]">+</span>
          Neuen Mitarbeiter anlegen
        </h3>
        <p className="text-[11px] font-display text-orendt-gray-400 mb-6">Der Mitarbeiter erhält automatisch das Default-Passwort und muss es beim ersten Login ändern.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-3">
            <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] ml-1">Vollständiger Name</label>
            <input type="text" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} placeholder="z.B. Max Mustermann" className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-sm outline-none focus:border-orendt-black transition-all" />
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] ml-1">Email-Adresse</label>
            <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="E-Mail" className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-sm outline-none focus:border-orendt-black transition-all" />
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] ml-1">Standard-Rolle</label>
            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-sm outline-none focus:border-orendt-black transition-all appearance-none">
              <option value="flexible">Flexibler Nutzer</option>
              <option value="owner">Platzinhaber</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleAddUser} disabled={addingUser || !newUser.email || !newUser.fullName} className="px-10 py-4 bg-orendt-black text-orendt-accent font-display text-[11px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 disabled:opacity-30 transition-all shadow-lg active:scale-95">
            {addingUser ? "Anlegen..." : "Mitarbeiter Anlegen"}
          </button>
        </div>
      </div>

      {/* User list */}
      <div className="space-y-4">
        {profiles.map((profile, i) => {
          const isBlocked = profile.is_blocked
          const isLoading = actionLoading === profile.id
          const isEditingThis = editingUser?.id === profile.id

          return (
            <div key={profile.id} className={`flex flex-col p-6 bg-white rounded-3xl border-2 transition-all shadow-sm opacity-0 animate-slide-up ${isBlocked ? "border-red-200 bg-red-50/30" : isEditingThis ? "border-orendt-black" : "border-orendt-gray-100 hover:border-orendt-black"}`} style={{ animationDelay: `${i * 40}ms`, animationFillMode: "forwards" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-5 flex-shrink-0">
                  <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center ${isBlocked ? "bg-red-100 border border-red-200" : "bg-orendt-accent/10 border border-orendt-accent/20"}`}>
                    <span className={`font-display text-xl font-bold uppercase ${isBlocked ? "text-red-400" : "text-orendt-black"}`}>{profile.full_name?.charAt(0) || "?"}</span>
                  </div>
                  <div>
                    <span className={`font-display text-base font-bold block ${isBlocked ? "text-red-400 line-through" : "text-orendt-black"}`}>{profile.full_name}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-orendt-gray-400 font-display font-bold uppercase tracking-widest">{profile.email}</span>
                      {isBlocked && <span className="text-[9px] font-display font-bold uppercase tracking-widest px-2 py-0.5 bg-red-100 text-red-500 rounded-full border border-red-200">Gesperrt</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap sm:items-center gap-3">
                  {/* Role dropdown */}
                  <div className="relative">
                    <select value={profile.role} onChange={(e) => handleRoleChange(profile.id, e.target.value)} disabled={isLoading} className="w-full sm:w-auto px-6 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-[11px] font-display font-bold uppercase tracking-widest outline-none focus:border-orendt-black transition-all appearance-none cursor-pointer pr-10 disabled:opacity-50">
                      {ROLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                  {/* Edit button */}
                  <button
                    onClick={() => isEditingThis ? cancelEditUser() : startEditUser(profile)}
                    disabled={isLoading}
                    className={`p-3 rounded-xl border transition-all disabled:opacity-20 ${isEditingThis ? "text-orendt-black bg-orendt-gray-100 border-orendt-black" : "text-orendt-gray-400 hover:text-orendt-black hover:bg-orendt-gray-50 border-orendt-gray-100 hover:border-orendt-black"}`}
                    title="Bearbeiten"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                  </button>
                  {/* Block button */}
                  <button onClick={() => handleToggleBlock(profile.id, isBlocked, profile.full_name)} disabled={isLoading || profile.role === "admin"} className={`p-3 rounded-xl border transition-all disabled:opacity-20 ${isBlocked ? "text-emerald-600 hover:bg-emerald-50 border-emerald-200" : "text-amber-600 hover:bg-amber-50 border-orendt-gray-100 hover:border-amber-200"}`} title={isBlocked ? "Entsperren" : "Sperren"}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d={isBlocked ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1"} />
                    </svg>
                  </button>
                  {/* Delete button */}
                  <button onClick={() => handleDeleteUser(profile.id, profile.full_name)} disabled={isLoading || profile.role === "admin"} className="p-3 text-orendt-gray-300 hover:text-red-500 hover:bg-red-50 border border-orendt-gray-100 hover:border-red-200 rounded-xl transition-all disabled:opacity-20" title="Löschen">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>

              {/* Inline edit panel */}
              {isEditingThis && (
                <div className="mt-5 pt-5 border-t border-orendt-gray-100">
                  <p className="text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-4">Mitarbeiter bearbeiten</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Name</label>
                      <input type="text" value={editingUser.fullName} onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleSaveUser()} autoFocus className="w-full px-4 py-3 bg-orendt-gray-50 border border-orendt-gray-200 rounded-2xl text-sm outline-none focus:border-orendt-black transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">E-Mail</label>
                      <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleSaveUser()} className="w-full px-4 py-3 bg-orendt-gray-50 border border-orendt-gray-200 rounded-2xl text-sm outline-none focus:border-orendt-black transition-all" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4 justify-end">
                    <button onClick={cancelEditUser} className="px-5 py-2.5 text-orendt-gray-400 hover:text-orendt-black font-display text-[11px] font-bold uppercase tracking-widest transition-all">
                      Abbrechen
                    </button>
                    <button onClick={handleSaveUser} disabled={savingEdit || !editingUser.fullName.trim() || !editingUser.email.trim()} className="px-6 py-2.5 bg-orendt-black text-orendt-accent font-display text-[11px] font-bold uppercase tracking-[0.2em] rounded-xl hover:opacity-90 disabled:opacity-30 transition-all shadow-md active:scale-95">
                      {savingEdit ? "Speichern..." : "Änderungen Speichern"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {profiles.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-orendt-gray-100">
            <p className="text-orendt-gray-400 font-display text-[11px] font-bold uppercase tracking-[0.2em]">Noch keine Mitarbeiter registriert</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Settings Tab ───────────────────────────────────────────────

function SettingsTab() {
  const [defaultPw, setDefaultPw] = useState("")
  const [keyBoxPin, setKeyBoxPin] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingPw, setSavingPw] = useState(false)
  const [savingPin, setSavingPin] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    Promise.all([getAppSetting("default_password"), getAppSetting("key_box_pin")]).then(([pwRes, pinRes]) => {
      setDefaultPw(pwRes.data || "")
      setKeyBoxPin(pinRes.data || "")
      setLoading(false)
    })
  }, [])

  async function handleSavePw() {
    if (!defaultPw.trim() || defaultPw.trim().length < 6) { alert("Das Default-Passwort muss mindestens 6 Zeichen lang sein."); return }
    setSavingPw(true)
    const { error } = await updateAppSetting("default_password", defaultPw.trim())
    if (error) alert("Fehler: " + error.message)
    else alert("Default-Passwort erfolgreich aktualisiert!")
    setSavingPw(false)
  }

  async function handleSavePin() {
    if (!keyBoxPin.trim()) { alert("Bitte einen PIN eingeben."); return }
    setSavingPin(true)
    const { error } = await updateAppSetting("key_box_pin", keyBoxPin.trim())
    if (error) alert("Fehler: " + error.message)
    else alert("Schlüsselkasten-PIN erfolgreich aktualisiert!")
    setSavingPin(false)
  }

  if (loading) return <div className="flex items-center justify-center py-32 bg-white rounded-[2.5rem] border border-orendt-gray-200"><div className="w-10 h-10 border-3 border-orendt-gray-100 border-t-orendt-black rounded-full animate-spin" /></div>

  return (
    <div className="space-y-8">
      <div className="p-8 bg-white rounded-[2rem] border-2 border-orendt-gray-100 shadow-sm">
        <h3 className="font-display text-sm font-bold text-orendt-black uppercase tracking-widest mb-2 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-orendt-accent/20 flex items-center justify-center text-sm">🔑</span>
          Schlüsselkasten PIN
        </h3>
        <p className="text-[11px] font-display text-orendt-gray-400 mb-6">Dieser PIN wird flexiblen Nutzern angezeigt, sobald sie einen Parkplatz reserviert haben.</p>
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">PIN-Code</label>
            <input type="text" value={keyBoxPin} onChange={(e) => setKeyBoxPin(e.target.value)} placeholder="z.B. 1234" className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-sm outline-none focus:border-orendt-black transition-all font-mono tracking-[0.3em]" />
          </div>
          <button onClick={handleSavePin} disabled={savingPin || !keyBoxPin.trim()} className="w-full md:w-auto px-8 py-4 bg-orendt-black text-orendt-accent font-display text-[11px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 disabled:opacity-30 transition-all shadow-lg active:scale-95">
            {savingPin ? "Speichern..." : "PIN Aktualisieren"}
          </button>
        </div>
      </div>

      <div className="p-8 bg-white rounded-[2rem] border-2 border-orendt-gray-100 shadow-sm">
        <h3 className="font-display text-sm font-bold text-orendt-black uppercase tracking-widest mb-2">Default-Passwort</h3>
        <p className="text-[11px] font-display text-orendt-gray-400 mb-6">Dieses Passwort wird neuen Mitarbeitern automatisch zugewiesen. Sie müssen es nach dem ersten Login ändern.</p>
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Passwort</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={defaultPw} onChange={(e) => setDefaultPw(e.target.value)} className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-sm outline-none focus:border-orendt-black transition-all pr-12" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-orendt-gray-400 hover:text-orendt-black transition-colors">
                {showPw ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <button onClick={handleSavePw} disabled={savingPw || !defaultPw.trim()} className="w-full md:w-auto px-8 py-4 bg-orendt-black text-orendt-accent font-display text-[11px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 disabled:opacity-30 transition-all shadow-lg active:scale-95">
            {savingPw ? "Speichern..." : "Passwort Aktualisieren"}
          </button>
        </div>
      </div>
    </div>
  )
}
