import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

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

        const { data: callerProfile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", caller.id)
            .single()

        if (callerProfile?.role !== "admin") {
            return NextResponse.json({ error: "Nur Admins dürfen Mitarbeiter bearbeiten" }, { status: 403 })
        }

        // 2. Parse body
        const { userId, fullName, email } = await request.json()
        if (!userId) {
            return NextResponse.json({ error: "Benutzer-ID erforderlich" }, { status: 400 })
        }

        // 3. Update Supabase Auth user (email)
        const authUpdates = {}
        if (email) authUpdates.email = email

        if (Object.keys(authUpdates).length > 0) {
            const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates)
            if (authUpdateError) {
                return NextResponse.json({ error: authUpdateError.message }, { status: 400 })
            }
        }

        // 4. Update profiles table (full_name, email)
        const profileUpdates = { updated_at: new Date().toISOString() }
        if (fullName) profileUpdates.full_name = fullName
        if (email) profileUpdates.email = email

        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update(profileUpdates)
            .eq("id", userId)

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error("Update user error:", err)
        return NextResponse.json({ error: "Interner Fehler" }, { status: 500 })
    }
}
