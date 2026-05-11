"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks"
import Header from "@/components/Header"
import UserSettings from "@/components/UserSettings"
import Footer from "@/components/Footer"

export default function ProfilePage() {
    const { user, loading, refresh } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login")
        }
    }, [user, loading, router])

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-2 border-orendt-gray-200 border-t-orendt-black rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-orendt-gray-50 flex flex-col">
            <Header user={user} currentPage="profile" />

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 md:py-14 animate-slide-up">
                <div className="mb-10">
                    <p className="font-display text-[11px] font-bold tracking-[0.2em] uppercase text-orendt-gray-500 mb-3 block">
                        Einstellungen
                    </p>
                    <h1 className="font-display text-[clamp(2.2rem,5vw,3.125rem)] font-bold text-orendt-black uppercase tracking-tight">
                        Mein Profil
                    </h1>
                    <p className="text-base text-orendt-gray-500 font-body mt-4 max-w-lg leading-relaxed">
                        Verwalte deine persönlichen Daten und Kontoeinstellungen.
                    </p>
                </div>

                <UserSettings user={user} onUserUpdate={refresh} />
            </main>

            <Footer />
        </div>
    )
}
