"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks"
import Header from "@/components/Header"
import OwnerCalendar from "@/components/OwnerCalendar"
import FlexibleBooking from "@/components/FlexibleBooking"
import Footer from "@/components/Footer"
import { getMyAssignments } from "@/lib/supabase"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [assignments, setAssignments] = useState(null)
  const [loadingAssignment, setLoadingAssignment] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    } else if (user) {
      getMyAssignments(user.id).then(({ data }) => {
        setAssignments(data || [])
        setLoadingAssignment(false)
      })
    }
  }, [user, loading, router])

  if (loading || !user || loadingAssignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-orendt-gray-200 border-t-orendt-black rounded-full animate-spin" />
      </div>
    )
  }

  // Admin or Owner with assigned spot(s) → show calendar
  const hasAssignment = assignments && assignments.length > 0
  const showCalendar = (user.role === "owner" || user.role === "admin") && hasAssignment

  return (
    <div className="min-h-screen bg-orendt-gray-50 flex flex-col">
      <Header user={user} currentPage="dashboard" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 md:py-14 animate-slide-up">
        {/* Welcome message */}
        <div className="mb-12">
          <p className="font-display text-[11px] font-bold tracking-[0.2em] uppercase text-orendt-gray-500 mb-3 block">
            Willkommen zurück
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-orendt-black uppercase tracking-tight">
            Hallo, {user.full_name?.split(" ")[0]}
          </h1>
          <p className="text-base text-orendt-gray-500 font-body mt-4 max-w-lg leading-relaxed">
            {showCalendar
              ? "Verwalte deine Platz-Verfügbarkeit. Standardmäßig ist dein Platz besetzt – gib ihn einfach per Klick für Kollegen frei."
              : user.role === "flexible"
                ? "Schnapp dir deinen Parkplatz für heute – first come, first served."
                : "Dir wurde noch kein Parkplatz zugewiesen."}
          </p>
        </div>

        {/* Calendar for owners and admins with a spot */}
        {showCalendar && (
          <div className="max-w-3xl mx-auto">
            <OwnerCalendar user={user} />
          </div>
        )}

        {/* No spot assigned (owner or admin without assignment) */}
        {(user.role === "owner" || user.role === "admin") && !hasAssignment && (
          <div className="max-w-3xl mx-auto">
            <div className="p-8 bg-white rounded-3xl border border-orendt-gray-200 text-center">
              <p className="text-orendt-gray-500 font-body">Kein Parkplatz zugeordnet. Bitte Administrator kontaktieren.</p>
            </div>
          </div>
        )}

        {/* Flexible users */}
        {user.role === "flexible" && (
          <div className="max-w-xl mx-auto">
            <FlexibleBooking user={user} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
