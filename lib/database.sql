-- ============================================================
-- ParkShare – Orendt Studios
-- Database Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── 1. PROFILES (extends auth.users) ───────────────────────

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'flexible' CHECK (role IN ('admin', 'owner', 'flexible')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'flexible')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 2. PARKING SPOTS ───────────────────────────────────────

CREATE TABLE public.parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,          -- e.g. "P-01", "P-02"
  zone TEXT DEFAULT 'Hauptparkplatz',  -- e.g. "Tiefgarage", "Außenbereich"
  description TEXT,             -- optional notes
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. SPOT ASSIGNMENTS (Owner ↔ Spot) ─────────────────────

CREATE TABLE public.spot_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,  -- NULL = unbefristet
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Multiple owners per spot allowed
  -- Duplicate prevention via partial unique index (see below)
);

-- Prevent duplicate active assignments (same user + same spot where valid_until IS NULL)
CREATE UNIQUE INDEX idx_unique_active_spot_user
  ON public.spot_assignments(spot_id, user_id)
  WHERE valid_until IS NULL;

-- ─── 4. RECURRING AVAILABILITIES (Dauerhafte Wochentag-Freigaben) ──

CREATE TABLE public.recurring_availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 5),  -- 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(spot_id, owner_id, weekday)
);

ALTER TABLE public.recurring_availabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RecurringAvail: Jeder kann lesen"
  ON public.recurring_availabilities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "RecurringAvail: Owner verwaltet eigene"
  ON public.recurring_availabilities FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "RecurringAvail: Owner kann eigene löschen"
  ON public.recurring_availabilities FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "RecurringAvail: Admin verwaltet"
  ON public.recurring_availabilities FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ─── 5. AVAILABILITIES (Owner gibt Tag frei) ────────────────

CREATE TABLE public.availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  released_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,  -- für Phase 2: jeden Freitag etc.
  recurrence_rule TEXT,  -- z.B. "FREQ=WEEKLY;BYDAY=FR"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(spot_id, date)  -- ein Platz kann pro Tag nur einmal freigegeben werden
);

-- ─── 5. RESERVATIONS (Flexible bucht freigegebenen Platz) ───

CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  availability_id UUID NOT NULL REFERENCES public.availabilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE(spot_id, date, status)  -- ein Platz, ein Tag, eine aktive Buchung
);

-- Constraint: ein User kann pro Tag nur einen Platz buchen
CREATE UNIQUE INDEX idx_one_reservation_per_user_per_day
  ON public.reservations (user_id, date)
  WHERE status = 'confirmed';


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Helper: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Check if current user is owner of a spot
CREATE OR REPLACE FUNCTION public.is_spot_owner(p_spot_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spot_assignments
    WHERE spot_id = p_spot_id
      AND user_id = auth.uid()
      AND valid_from <= CURRENT_DATE
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── PROFILES ────────────────────────────────────────────────

CREATE POLICY "Profiles: Jeder kann Profile lesen"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Profiles: Eigenes Profil bearbeiten"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Profiles: Admin kann alle bearbeiten"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Profiles: Admin kann erstellen"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR id = auth.uid());

-- ─── PARKING SPOTS ───────────────────────────────────────────

CREATE POLICY "Spots: Jeder kann lesen"
  ON public.parking_spots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Spots: Admin verwaltet"
  ON public.parking_spots FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ─── SPOT ASSIGNMENTS ────────────────────────────────────────

CREATE POLICY "Assignments: Jeder kann lesen"
  ON public.spot_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Assignments: Admin verwaltet"
  ON public.spot_assignments FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ─── AVAILABILITIES ──────────────────────────────────────────

CREATE POLICY "Availabilities: Jeder kann lesen"
  ON public.availabilities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Availabilities: Owner gibt eigenen Platz frei"
  ON public.availabilities FOR INSERT
  TO authenticated
  WITH CHECK (
    released_by = auth.uid()
    AND public.is_spot_owner(spot_id)
  );

CREATE POLICY "Availabilities: Owner kann eigene löschen"
  ON public.availabilities FOR DELETE
  TO authenticated
  USING (
    released_by = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.reservations
      WHERE availability_id = availabilities.id
        AND status = 'confirmed'
    )
  );

CREATE POLICY "Availabilities: Admin verwaltet"
  ON public.availabilities FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ─── RESERVATIONS ────────────────────────────────────────────

CREATE POLICY "Reservations: Jeder kann lesen"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Reservations: Flexible kann buchen"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Reservations: Eigene stornieren"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Reservations: Admin verwaltet"
  ON public.reservations FOR ALL
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Note: daily_spot_status view is replaced by getDailyOverview() in lib/supabase.js
-- which handles multiple owners per spot correctly in application code.


-- ============================================================
-- SEED DATA (Demo – Löschen vor Produktion!)
-- ============================================================

-- Demo Parkplätze
INSERT INTO public.parking_spots (label, zone, sort_order) VALUES
  ('P-01', 'Tiefgarage', 1),
  ('P-02', 'Tiefgarage', 2),
  ('P-03', 'Tiefgarage', 3),
  ('P-04', 'Tiefgarage', 4),
  ('P-05', 'Tiefgarage', 5),
  ('P-06', 'Außenbereich', 6),
  ('P-07', 'Außenbereich', 7),
  ('P-08', 'Außenbereich', 8),
  ('P-09', 'Außenbereich', 9),
  ('P-10', 'Außenbereich', 10),
  ('P-11', 'Außenbereich', 11),
  ('P-12', 'Außenbereich', 12);
