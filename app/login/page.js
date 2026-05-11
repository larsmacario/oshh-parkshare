"use client"

import { useEffect, useState } from "react"
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

  // Password change modal state
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordChangeUser, setPasswordChangeUser] = useState(null)
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false)
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false)
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(true)

  const router = useRouter()

  function activateRecoveryMode() {
    setIsSignUp(false)
    setIsForgotPasswordMode(false)
    setShowPasswordChange(true)
    setIsRecoveryFlow(true)
    setSuccessMessage("Bitte setze jetzt ein neues Passwort.")
    setError("")
  }

  useEffect(() => {
    let active = true

    async function initRecoveryFlow() {
      const queryParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const queryType = queryParams.get("type")
      const hashType = hashParams.get("type")
      const flow = queryParams.get("flow")
      const code = queryParams.get("code")
      const tokenHash = queryParams.get("token_hash") || hashParams.get("token_hash")
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const queryError = queryParams.get("error") || hashParams.get("error")
      const queryErrorCode = queryParams.get("error_code") || hashParams.get("error_code")
      const queryErrorDescription = queryParams.get("error_description") || hashParams.get("error_description")
      const hasExplicitAuthError = Boolean(queryError || queryErrorCode)

      function getRecoveryErrorMessage() {
        if (queryErrorDescription) {
          return `Reset-Link ungültig/abgelaufen (${queryErrorDescription}). Bitte fordere einen neuen Link an.`
        }
        if (queryErrorCode || queryError) {
          return `Reset-Link ungültig/abgelaufen (${queryErrorCode || queryError}). Bitte fordere einen neuen Link an.`
        }
        return "Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an."
      }

      async function ensureRecoverySession() {
        const { data: currentSession } = await supabase.auth.getSession()
        if (currentSession?.session) return true

        if (tokenHash) {
          const { error: verifyOtpError } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          })
          if (!verifyOtpError) {
            const { data: otpSession } = await supabase.auth.getSession()
            if (otpSession?.session) return true
          }
        }

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!setSessionError) {
            const { data: hashSession } = await supabase.auth.getSession()
            if (hashSession?.session) return true
          }
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (!exchangeError) {
            const { data: codeSession } = await supabase.auth.getSession()
            if (codeSession?.session) return true
          }
        }

        for (let i = 0; i < 6; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 200))
          const { data: polledSession } = await supabase.auth.getSession()
          if (polledSession?.session) return true
        }

        return false
      }

      // Case 1: Supabase redirect already contains explicit recovery marker
      if (queryType === "recovery" || hashType === "recovery" || flow === "recovery") {
        const hasRecoverySession = await ensureRecoverySession()
        if (active && hasRecoverySession) {
          activateRecoveryMode()
        } else if (active && hasExplicitAuthError) {
          setError(getRecoveryErrorMessage())
        }
        if (active) setIsCheckingRecovery(false)
        return
      }

      // Case 2: PKCE flow -> exchange one-time code for a session first
      if (code) {
        const hasRecoverySession = await ensureRecoverySession()
        if (hasRecoverySession && active) {
          activateRecoveryMode()
        } else if (active && hasExplicitAuthError) {
          setError(getRecoveryErrorMessage())
        }
      }

      if (active) setIsCheckingRecovery(false)
    }

    initRecoveryFlow()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        activateRecoveryMode()
      }
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (isForgotPasswordMode) {
      await handleForgotPassword()
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
          setPasswordChangeUser(profile)
          setShowPasswordChange(true)
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
      const redirectTo = `${window.location.origin}/login?flow=recovery`
      const { error: resetError } = await requestPasswordReset(normalizedEmail, redirectTo)
      if (resetError) throw resetError
      setSuccessMessage("Wenn ein Konto mit dieser E-Mail existiert, wurde ein Passwort-Reset-Link versendet.")
    } catch (err) {
      setError(err.message || "Passwort-Reset konnte nicht gestartet werden.")
    } finally {
      setLoading(false)
    }
  }

  function openForgotPasswordMode() {
    setIsSignUp(false)
    setIsForgotPasswordMode(true)
    setPassword("")
    setError("")
    setSuccessMessage("")
  }

  function closeForgotPasswordMode() {
    setIsForgotPasswordMode(false)
    setError("")
    setSuccessMessage("")
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setError("")
    setSuccessMessage("")

    if (newPassword.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.")
      return
    }

    setChangingPassword(true)
    try {
      const { error: pwError } = await updatePassword(newPassword)
      if (pwError) throw pwError

      if (passwordChangeUser?.id) {
        const { error: markError } = await markPasswordChanged(passwordChangeUser.id)
        if (markError) throw markError
      }

      router.push("/dashboard")
    } catch (err) {
      setError(err.message || "Fehler beim Ändern des Passworts")
    } finally {
      setChangingPassword(false)
    }
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

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[2rem] border border-orendt-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-orendt-accent/20 rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orendt-black">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-bold text-orendt-black tracking-tight">
                {isRecoveryFlow ? "Neues Passwort setzen" : "Passwort ändern"}
              </h2>
              <p className="font-display text-[11px] text-orendt-gray-400 uppercase tracking-[0.2em] mt-2">
                {isRecoveryFlow ? "Passwort-Reset bestätigen" : "Bitte lege ein persönliches Passwort fest"}
              </p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-5">
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
                  className="w-full px-6 py-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
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
                  className="w-full px-6 py-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-black font-body text-base placeholder:text-orendt-gray-300 focus:border-orendt-black focus:ring-4 focus:ring-orendt-black/5 transition-all outline-none"
                />
              </div>

              {error && (
                <div className="px-5 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-500 text-sm font-body animate-shake">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="w-full py-5 bg-orendt-black text-orendt-white font-display font-bold text-xs uppercase tracking-[0.25em] rounded-2xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.15)] mt-2"
              >
                {changingPassword ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-4 h-4 border-2 border-orendt-white/20 border-t-orendt-white rounded-full animate-spin" />
                    Wird gespeichert...
                  </span>
                ) : "Passwort Festlegen"}
              </button>
            </form>
          </div>
        </div>
      )}

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
              {isCheckingRecovery && (
                <div className="px-5 py-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-2xl text-orendt-gray-500 text-sm font-body">
                  Prüfe Passwort-Reset-Link...
                </div>
              )}
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

              {error && !showPasswordChange && (
                <div className="px-5 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-500 text-sm font-body animate-shake">
                  {error}
                </div>
              )}

              {successMessage && !showPasswordChange && (
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
                ) : isForgotPasswordMode ? "Reset-Link senden" : isSignUp ? "Konto erstellen" : "Anmelden"}
              </button>
            </form>

            <div className="mt-8 sm:mt-10 text-center border-t border-orendt-gray-50 pt-6 sm:pt-8">
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError("") }}
                disabled={isRecoveryFlow || isForgotPasswordMode}
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
