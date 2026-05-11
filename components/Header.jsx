"use client"

import { useRouter } from "next/navigation"
import { signOut } from "@/lib/supabase"

const icons = {
  grid: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

const ROLE_LABELS = {
  admin: "Admin",
  owner: "Platzinhaber",
  flexible: "Flexibel",
}

function OrendtLogo() {
  return (
    <div className="h-10 px-4 py-2 bg-orendt-black rounded-xl flex items-center justify-center">
      <img
        src="/orendtstudios_logo.png"
        alt="Orendt Studios"
        className="h-full w-auto object-contain"
      />
    </div>
  )
}

export default function Header({ user, currentPage = "dashboard" }) {
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push("/login")
  }

  return (
    <header className="w-full bg-white border-b border-orendt-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3 sm:gap-4">
            <OrendtLogo />
            <div className="hidden xs:block sm:block">
              <span className="font-display text-xs sm:text-sm font-bold text-orendt-black uppercase tracking-tight">ParkShare</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 bg-orendt-gray-50 border border-orendt-gray-200 rounded-xl">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-orendt-black rounded-lg flex items-center justify-center text-[10px] sm:text-[11px] font-display font-bold text-orendt-white">
                {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold font-display text-orendt-black leading-none">{user?.full_name}</span>
                <span className="text-[9px] font-display font-bold uppercase tracking-wider text-orendt-gray-400 mt-1">
                  {ROLE_LABELS[user?.role] || "–"}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 sm:p-2.5 text-orendt-gray-400 hover:text-orendt-black transition-all rounded-xl hover:bg-orendt-gray-100 border border-transparent hover:border-orendt-gray-200"
              title="Abmelden"
            >
              {icons.logout}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <NavTab
            label="Übersicht"
            icon={icons.grid}
            active={currentPage === "dashboard"}
            onClick={() => router.push("/dashboard")}
          />
          <NavTab
            label="Profil"
            icon={icons.settings}
            active={currentPage === "profile"}
            onClick={() => router.push("/profile")}
          />
          {user?.role === "admin" && (
            <NavTab
              label="Admin"
              icon={icons.settings}
              active={currentPage === "admin"}
              onClick={() => router.push("/admin")}
            />
          )}
        </div>
      </div>
    </header>
  )
}

function NavTab({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-5 py-3 text-[13px] font-display font-bold uppercase tracking-wider transition-colors border-b-2
        ${active
          ? "text-orendt-black border-orendt-black"
          : "text-orendt-gray-400 border-transparent hover:text-orendt-black hover:border-orendt-gray-300"
        }
      `}
    >
      {icon}
      {label}
    </button>
  )
}
