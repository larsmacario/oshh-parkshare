"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/hooks"
import Footer from "@/components/Footer"
import { supabase, signIn, signUp, signOut, getCurrentUser, updatePassword, markPasswordChanged, requestPasswordReset } from "@/lib/supabase"

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false)
  const [isOtpResetMode, setIsOtpResetMode] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [otpNewPassword, setOtpNewPassword] = useState("")
  const [otpConfirmPassword, setOtpConfirmPassword] = useState("")

  const router = useRouter()

  async function triggerOtpReset(normalizedEmail) {
    const redirectTo = `${window.location.origin}/login`
    const { error: resetError } = await requestPasswordReset(normalizedEmail, redirectTo)
    if (resetError) throw resetError
    setIsForgotPasswordMode(true)
    setIsOtpResetMode(true)
    setSuccessMessage("Wenn ein Konto mit dieser E-Mail existiert, wurde ein Sicherheitscode versendet. Bitte gib ihn unten ein.")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isForgotPasswordMode) {
      if (isOtpResetMode) {
        await handleOtpPasswordReset()
      } else {
        await handleForgotPassword()
      }
      return
    }

    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error } = await signUp(email, password, fullName)
        if (error) throw error

        if (data?.session) {
          // If auto-confirmation is enabled, we get a session immediately
          router.push("/dashboard")
        } else {
          // If email confirmation is required, data.session will be null
          setSuccessMessage("Registrierung erfolgreich! Bitte bestätige deine E-Mail, bevor du dich einloggst.")
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error

        // Check if user is blocked
        const profile = await getCurrentUser()
        if (profile?.is_blocked) {
          await signOut()
          throw new Error("Dein Account wurde gesperrt. Bitte wende dich an einen Administrator.")
        }

        // Check if user must change password
        if (profile?.must_change_password) {
          await triggerOtpReset((email || "").trim().toLowerCase())
          setLoading(false)
          return
        }

        router.push("/dashboard")
      }
    } catch (err) {
      setError(err.message || "Ein Fehler ist aufgetreten")
      setSuccessMessage("")
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    setError("")
    setSuccessMessage("")

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError("Bitte gib zuerst deine E-Mail-Adresse ein.")
      return
    }

    setLoading(true)
    try {
      await triggerOtpReset(normalizedEmail)
    } catch (err) {
      setError(err.message || "Passwort-Reset konnte nicht gestartet werden.")
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpPasswordReset() {
    setError("")
    setSuccessMessage("")

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError("Bitte gib zuerst deine E-Mail-Adresse ein.")
      return
    }
    if (!otpCode.trim()) {
      setError("Bitte gib den Sicherheitscode aus der E-Mail ein.")
      return
    }
    if (otpNewPassword.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.")
      return
    }
    if (otpNewPassword !== otpConfirmPassword) {
      setError("Die Passwörter stimmen nicht überein.")
      return
    }

    setLoading(true)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otpCode.trim(),
        type: "recovery",
      })
      if (verifyError) throw verifyError

      const { error: pwError } = await updatePassword(otpNewPassword)
      if (pwError) throw pwError

      const updatedProfile = await getCurrentUser()
      if (updatedProfile?.id && updatedProfile?.must_change_password) {
        const { error: markError } = await markPasswordChanged(updatedProfile.id)
        if (markError) throw markError
      }

      setIsForgotPasswordMode(false)
      setIsOtpResetMode(false)
      setOtpCode("")
      setOtpNewPassword("")
      setOtpConfirmPassword("")
      setPassword("")
      setSuccessMessage("Passwort erfolgreich zurückgesetzt.")
      router.push("/dashboard")
    } catch (err) {
      setError(err.message || "Code ungültig oder abgelaufen. Bitte fordere einen neuen Code an.")
    } finally {
      setLoading(false)
    }
  }

  function openForgotPasswordMode() {
    setIsSignUp(false)
    setIsForgotPasswordMode(true)
    setIsOtpResetMode(false)
    setOtpCode("")
    setOtpNewPassword("")
    setOtpConfirmPassword("")
    setPassword("")
    setError("")
    setSuccessMessage("")
  }

  function closeForgotPasswordMode() {
    setIsForgotPasswordMode(false)
    setIsOtpResetMode(false)
    setOtpCode("")
    setOtpNewPassword("")
    setOtpConfirmPassword("")
    setError("")
    setSuccessMessage("")
  }

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orendt-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orendt-gray-50 rounded-full blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <div className="w-full border-b border-orendt-gray-100 px-6 py-4 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="h-10 px-4 py-2 bg-orendt-black rounded-xl flex items-center justify-center">
            <img src="/orendtstudios_logo.png" alt="Orendt Studios" className="h-full w-auto object-contain" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-20 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 sm:mb-12 animate-slide-up">
            <h1 className="font-display text-[32px] sm:text-[42px] md:text-[56px] font-bold text-orendt-black mb-3 sm:mb-4 tracking-tighter leading-tight">
              ParkShare
            </h1>
            <p className="font-display text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.4em] text-orendt-gray-400">
              Community Parking Platform
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 md:p-12 rounded-[2rem] sm:rounded-[2.5rem] border border-orendt-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] animate-scale-in">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {isSignUp && (
                <div className="animate-fade-in">
                  <label className="block text-[9px] sm:text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2 sm:mb-3 ml-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Max Mustermann"
                    required
                    className="w-full px-5 py-3.5 sm:px-6 sm:py-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[9px] sm:text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2 sm:mb-3 ml-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@orendtstudios.com"
                  required
                  className="w-full px-5 py-3.5 sm:px-6 sm:py-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                />
              </div>

              {!isForgotPasswordMode && (
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2 sm:mb-3 ml-1">
                    Passwort
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required={!isForgotPasswordMode}
                    minLength={6}
                    className="w-full px-5 py-3.5 sm:px-6 sm:py-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                  />
                </div>
              )}

              {isForgotPasswordMode && isOtpResetMode && (
                <>
                  <div className="animate-fade-in">
                    <label className="block text-[9px] sm:text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2 sm:mb-3 ml-1">
                      Sicherheitscode
                    </label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Code aus der E-Mail"
                      required
                      className="w-full px-5 py-3.5 sm:px-6 sm:py-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                    />
                  </div>

                  <div className="animate-fade-in">
                    <label className="block text-[9px] sm:text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2 sm:mb-3 ml-1">
                      Neues Passwort
                    </label>
                    <input
                      type="password"
                      value={otpNewPassword}
                      onChange={(e) => setOtpNewPassword(e.target.value)}
                      placeholder="Mindestens 6 Zeichen"
                      required
                      minLength={6}
                      className="w-full px-5 py-3.5 sm:px-6 sm:py-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                    />
                  </div>

                  <div className="animate-fade-in">
                    <label className="block text-[9px] sm:text-[10px] font-display font-bold text-orendt-gray-400 uppercase tracking-[0.2em] mb-2 sm:mb-3 ml-1">
                      Passwort bestätigen
                    </label>
                    <input
                      type="password"
                      value={otpConfirmPassword}
                      onChange={(e) => setOtpConfirmPassword(e.target.value)}
                      placeholder="Passwort wiederholen"
                      required
                      minLength={6}
                      className="w-full px-5 py-3.5 sm:px-6 sm:py-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {isSignUp && (
                <div className="animate-fade-in">
                  <label className="flex items-start gap-3 cursor-pointer group" onClick={(e) => { if (e.target.closest('a')) return; }}>
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={privacyAccepted}
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        required
                        className="peer sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer pointer-events-none ${privacyAccepted
                            ? "bg-orendt-black border-orendt-black"
                            : "bg-white border-orendt-gray-200 group-hover:border-orendt-gray-400"
                          }`}
                      >
                        {privacyAccepted && (
                          <svg className="w-3 h-3 text-orendt-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="font-body text-xs text-orendt-gray-400 leading-relaxed">
                      Ich habe die{" "}
                      <Link
                        href="/datenschutz"
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-orendt-black underline underline-offset-2 hover:opacity-70 transition-opacity font-semibold"
                      >
                        Datenschutzerklärung
                      </Link>{" "}
                      gelesen und stimme ihr zu.
                    </span>
                  </label>
                </div>
              )}

              {error && (
                <div className="px-5 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-500 text-sm font-body animate-shake">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="px-5 py-4 bg-green-500/5 border border-green-500/10 rounded-2xl text-green-700 text-sm font-body">
                  {successMessage}
                </div>
              )}

              {!isSignUp && !isForgotPasswordMode && (
                <button
                  type="button"
                  onClick={openForgotPasswordMode}
                  disabled={loading}
                  className="w-full text-right text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-[0.22em] text-orendt-gray-400 hover:text-orendt-black transition-colors disabled:opacity-50"
                >
                  Passwort vergessen?
                </button>
              )}

              {isForgotPasswordMode && (
                <button
                  type="button"
                  onClick={closeForgotPasswordMode}
                  disabled={loading}
                  className="w-full text-right text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-[0.22em] text-orendt-gray-400 hover:text-orendt-black transition-colors disabled:opacity-50"
                >
                  Zurück zum Login
                </button>
              )}

              <button
                type="submit"
                disabled={loading || (isSignUp && !privacyAccepted)}
                className="w-full py-4 sm:py-5 bg-orendt-black text-orendt-white font-display font-bold text-xs uppercase tracking-[0.25em] rounded-2xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.15)] mt-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-4 h-4 border-2 border-orendt-white/20 border-t-orendt-white rounded-full animate-spin" />
                    Authentication...
                  </span>
                ) : isForgotPasswordMode
                  ? isOtpResetMode
                    ? "Passwort zurücksetzen"
                    : "Code senden"
                  : isSignUp
                    ? "Konto erstellen"
                    : "Anmelden"}
              </button>
            </form>

            <div className="mt-8 sm:mt-10 text-center border-t border-orendt-gray-50 pt-6 sm:pt-8">
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError("") }}
                disabled={isForgotPasswordMode}
                className="text-orendt-gray-400 hover:text-orendt-black text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-[0.3em] transition-colors"
              >
                {isSignUp ? "Already registered?" : "New here? Register"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
