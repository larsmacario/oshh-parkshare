"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateProfile, updateEmail, updatePassword, signOut, getSession } from "@/lib/supabase"

const icons = {
    user: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    mail: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    ),
    lock: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    trash: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
    ),
    check: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    alert: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
}

function SettingsCard({ icon, title, children }) {
    return (
        <div className="bg-white rounded-3xl border border-orendt-gray-200 p-6 sm:p-8 transition-all hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orendt-gray-50 border border-orendt-gray-100 rounded-xl flex items-center justify-center text-orendt-black">
                    {icon}
                </div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-orendt-black">
                    {title}
                </h3>
            </div>
            {children}
        </div>
    )
}

function StatusMessage({ type, message }) {
    if (!message) return null
    const isError = type === "error"
    return (
        <div className={`mt-4 px-5 py-3.5 rounded-2xl text-sm font-body flex items-center gap-2 animate-fade-in ${isError
                ? "bg-red-500/5 border border-red-500/10 text-red-600"
                : "bg-emerald-500/5 border border-emerald-500/10 text-emerald-600"
            }`}>
            {isError ? icons.alert : icons.check}
            {message}
        </div>
    )
}

export default function UserSettings({ user, onUserUpdate }) {
    const router = useRouter()

    // Name state
    const [fullName, setFullName] = useState(user?.full_name || "")
    const [nameLoading, setNameLoading] = useState(false)
    const [nameStatus, setNameStatus] = useState({ type: null, message: "" })

    // Email state
    const [email, setEmail] = useState(user?.email || "")
    const [emailLoading, setEmailLoading] = useState(false)
    const [emailStatus, setEmailStatus] = useState({ type: null, message: "" })

    // Password state
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordStatus, setPasswordStatus] = useState({ type: null, message: "" })

    // Delete state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState("")
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deleteStatus, setDeleteStatus] = useState({ type: null, message: "" })

    // ─── Name Update ──────────────────────────────────────────────
    async function handleNameUpdate(e) {
        e.preventDefault()
        if (!fullName.trim()) return
        setNameLoading(true)
        setNameStatus({ type: null, message: "" })

        const { error } = await updateProfile(user.id, { full_name: fullName.trim() })
        if (error) {
            setNameStatus({ type: "error", message: error.message })
        } else {
            setNameStatus({ type: "success", message: "Name erfolgreich geändert." })
            onUserUpdate?.()
        }
        setNameLoading(false)
    }

    // ─── Email Update ─────────────────────────────────────────────
    async function handleEmailUpdate(e) {
        e.preventDefault()
        if (!email.trim()) return
        setEmailLoading(true)
        setEmailStatus({ type: null, message: "" })

        const { error } = await updateEmail(email.trim())
        if (error) {
            setEmailStatus({ type: "error", message: error.message })
        } else {
            // Also update the profile table
            await updateProfile(user.id, { email: email.trim() })
            setEmailStatus({ type: "success", message: "Bestätigungs-E-Mail wurde gesendet. Bitte überprüfe dein Postfach." })
            onUserUpdate?.()
        }
        setEmailLoading(false)
    }

    // ─── Password Update ─────────────────────────────────────────
    async function handlePasswordUpdate(e) {
        e.preventDefault()
        setPasswordStatus({ type: null, message: "" })

        if (newPassword.length < 6) {
            setPasswordStatus({ type: "error", message: "Mindestens 6 Zeichen erforderlich." })
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordStatus({ type: "error", message: "Die Passwörter stimmen nicht überein." })
            return
        }

        setPasswordLoading(true)
        const { error } = await updatePassword(newPassword)
        if (error) {
            setPasswordStatus({ type: "error", message: error.message })
        } else {
            setPasswordStatus({ type: "success", message: "Passwort erfolgreich geändert." })
            setNewPassword("")
            setConfirmPassword("")
        }
        setPasswordLoading(false)
    }

    // ─── Account Delete ───────────────────────────────────────────
    async function handleDeleteAccount() {
        setDeleteLoading(true)
        setDeleteStatus({ type: null, message: "" })

        try {
            const { data: { session } } = await getSession()
            if (!session) throw new Error("Nicht eingeloggt")

            const res = await fetch("/api/user/delete-account", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Fehler beim Löschen")

            await signOut()
            router.push("/login")
        } catch (err) {
            setDeleteStatus({ type: "error", message: err.message })
            setDeleteLoading(false)
        }
    }

    const nameChanged = fullName.trim() !== (user?.full_name || "")
    const emailChanged = email.trim() !== (user?.email || "")

    return (
        <div className="space-y-6">
            {/* ─── Name ─────────────────────────────────────────────── */}
            <SettingsCard icon={icons.user} title="Name">
                <form onSubmit={handleNameUpdate}>
                    <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
                        Vollständiger Name
                    </label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Max Mustermann"
                        required
                        className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                    />
                    <StatusMessage {...nameStatus} />
                    <button
                        type="submit"
                        disabled={nameLoading || !nameChanged}
                        className="mt-5 px-8 py-3.5 bg-orendt-black text-orendt-white font-display font-bold text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.15)]"
                    >
                        {nameLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-orendt-white/20 border-t-orendt-white rounded-full animate-spin" />
                                Speichern...
                            </span>
                        ) : "Speichern"}
                    </button>
                </form>
            </SettingsCard>

            {/* ─── Email ────────────────────────────────────────────── */}
            <SettingsCard icon={icons.mail} title="E-Mail">
                <form onSubmit={handleEmailUpdate}>
                    <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
                        E-Mail-Adresse
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@orendtstudios.com"
                        required
                        className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                    />
                    <StatusMessage {...emailStatus} />
                    <button
                        type="submit"
                        disabled={emailLoading || !emailChanged}
                        className="mt-5 px-8 py-3.5 bg-orendt-black text-orendt-white font-display font-bold text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.15)]"
                    >
                        {emailLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-orendt-white/20 border-t-orendt-white rounded-full animate-spin" />
                                Speichern...
                            </span>
                        ) : "Speichern"}
                    </button>
                </form>
            </SettingsCard>

            {/* ─── Password ─────────────────────────────────────────── */}
            <SettingsCard icon={icons.lock} title="Passwort">
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
                            Neues Passwort
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mindestens 6 Zeichen"
                            required
                            minLength={6}
                            className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
                            Passwort bestätigen
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Passwort wiederholen"
                            required
                            minLength={6}
                            className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                        />
                    </div>
                    <StatusMessage {...passwordStatus} />
                    <button
                        type="submit"
                        disabled={passwordLoading || !newPassword || !confirmPassword}
                        className="mt-1 px-8 py-3.5 bg-orendt-black text-orendt-white font-display font-bold text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.15)]"
                    >
                        {passwordLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-orendt-white/20 border-t-orendt-white rounded-full animate-spin" />
                                Speichern...
                            </span>
                        ) : "Passwort Ändern"}
                    </button>
                </form>
            </SettingsCard>

            {/* ─── Danger Zone ──────────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-red-200/60 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500">
                        {icons.trash}
                    </div>
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-red-600">
                        Danger Zone
                    </h3>
                </div>
                <p className="text-sm text-orendt-gray-500 font-body mb-5 leading-relaxed">
                    Dein Account und alle zugehörigen Daten werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <StatusMessage {...deleteStatus} />
                <button
                    onClick={() => setShowDeleteModal(true)}
                    className="mt-2 px-8 py-3.5 bg-red-600 text-white font-display font-bold text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_8px_16px_-6px_rgba(220,38,38,0.3)]"
                >
                    Account Löschen
                </button>
            </div>

            {/* ─── Delete Confirmation Modal ────────────────────────── */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[2rem] border border-orendt-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] animate-scale-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                                {icons.alert}
                            </div>
                            <h2 className="font-display text-xl font-bold text-orendt-black tracking-tight">
                                Account wirklich löschen?
                            </h2>
                            <p className="font-body text-sm text-orendt-gray-500 mt-3 leading-relaxed">
                                Alle deine Daten, Reservierungen und Zuweisungen werden permanent gelöscht. Tippe <strong className="text-red-600">LÖSCHEN</strong> zur Bestätigung.
                            </p>
                        </div>

                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="LÖSCHEN"
                            className="w-full px-5 py-3.5 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-center"
                        />

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setDeleteConfirmText("")
                                }}
                                className="flex-1 py-3.5 bg-orendt-gray-50 text-orendt-black font-display font-bold text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-orendt-gray-100 transition-all border border-orendt-gray-200"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== "LÖSCHEN" || deleteLoading}
                                className="flex-1 py-3.5 bg-red-600 text-white font-display font-bold text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 transition-all disabled:opacity-30 disabled:hover:bg-red-600"
                            >
                                {deleteLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Löschen...
                                    </span>
                                ) : "Endgültig Löschen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
