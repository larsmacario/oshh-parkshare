import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { sendWelcomeEmail } from "@/lib/mail"

// Lazy-initialized clients — avoids build-time error when env vars are missing
function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

function getAuthClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
}

export async function POST(request) {
    try {
        const supabaseAuth = getAuthClient()
        const supabaseAdmin = getAdminClient()

        // 1. Verify the calling user is an admin
        const authHeader = request.headers.get("authorization")
        if (!authHeader) {
            return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
        }

        const token = authHeader.replace("Bearer ", "")
        const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser(token)
        if (authError || !caller) {
            return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
        }

        // Check admin role from profiles
        const { data: callerProfile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", caller.id)
            .single()

        if (callerProfile?.role !== "admin") {
            return NextResponse.json({ error: "Nur Admins können Mitarbeiter anlegen" }, { status: 403 })
        }

        // 2. Parse request body
        const { email, fullName, role = "flexible" } = await request.json()
        if (!email || !fullName) {
            return NextResponse.json({ error: "E-Mail und Name sind erforderlich" }, { status: 400 })
        }

        // 3. Get default password from app_settings
        const { data: setting } = await supabaseAdmin
            .from("app_settings")
            .select("value")
            .eq("key", "default_password")
            .single()

        const defaultPassword = setting?.value || "Parkshare2024!"

        // 4. Create user via admin API (no email confirmation needed)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName, role },
        })

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 })
        }

        // Send welcome email via SMTP (using the default password)
        try {
            await sendWelcomeEmail(email, fullName, defaultPassword)
        } catch (mailError) {
            console.error("Failed to send welcome email via SMTP:", mailError)
            // Rollback user creation to prevent orphaned accounts with unknown/inaccessible passwords
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            return NextResponse.json(
                { error: "Mitarbeiter konnte nicht angelegt werden, da der SMTP-E-Mail-Versand fehlgeschlagen ist. Bitte überprüfe die SMTP-Konfiguration." },
                { status: 500 }
            )
        }

        // 5. Set must_change_password = true in profiles
        await supabaseAdmin
            .from("profiles")
            .update({ must_change_password: true })
            .eq("id", newUser.user.id)

        return NextResponse.json({
            success: true,
            user: { id: newUser.user.id, email, fullName, role },
        })
    } catch (err) {
        console.error("Create user error:", err)
        return NextResponse.json({ error: "Interner Fehler" }, { status: 500 })
    }
}
