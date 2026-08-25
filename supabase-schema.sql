-- ============================================================
-- Supabase Schema untuk Aplikasi Liburan — Multi-User Collaboration
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Profiles (extend Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Trips
CREATE TABLE IF NOT EXISTS trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    destination TEXT,
    budget NUMERIC DEFAULT 0,
    room_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trip Members
CREATE TABLE IF NOT EXISTS trip_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, user_id)
);

-- 4. Transactions (Ledger + Split Bill)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    note TEXT,
    paid_by TEXT,
    is_split BOOLEAN DEFAULT FALSE,
    split_type TEXT CHECK (split_type IN ('equal', 'custom', NULL)),
    split_among TEXT[],
    custom_amounts JSONB,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Activities (Itinerary)
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TEXT,
    description TEXT NOT NULL,
    location_name TEXT,
    maps_url TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    sort_order INTEGER,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Checklist Items
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    category TEXT DEFAULT 'Lainnya',
    done BOOLEAN DEFAULT FALSE,
    sort_order INTEGER,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT,
    link TEXT,
    image_path TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Plans
CREATE TABLE IF NOT EXISTS plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Plan Options
CREATE TABLE IF NOT EXISTS plan_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    note TEXT,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Hanya member trip yang bisa mengakses data trip tersebut
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_options ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Helper functions for RLS (SECURITY DEFINER to bypass recursion)
CREATE OR REPLACE FUNCTION is_trip_member(check_trip_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM trip_members WHERE trip_id = check_trip_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_trip_owner(check_trip_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM trip_members WHERE trip_id = check_trip_id AND user_id = auth.uid() AND role = 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.join_trip_by_code(join_room_code TEXT)
RETURNS UUID AS $$
DECLARE
    found_trip_id UUID;
    v_user_id UUID;
    v_user_name TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT id INTO found_trip_id
    FROM public.trips
    WHERE room_code = join_room_code;

    IF found_trip_id IS NULL THEN
        RAISE EXCEPTION 'Room code tidak ditemukan';
    END IF;

    SELECT display_name INTO v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    IF NOT EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = found_trip_id AND user_id = v_user_id) THEN
        INSERT INTO public.trip_members (trip_id, user_id, display_name, role)
        VALUES (found_trip_id, v_user_id, v_user_name, 'editor');
    END IF;

    RETURN found_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trips: members can view and update their trips
CREATE POLICY "Members can view their trips" ON trips
    FOR SELECT USING (is_trip_member(id) OR created_by = auth.uid());
CREATE POLICY "Authenticated users can create trips" ON trips
    FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Members can update their trips" ON trips
    FOR UPDATE USING (is_trip_member(id) OR created_by = auth.uid());
CREATE POLICY "Owner can delete trip" ON trips
    FOR DELETE USING (is_trip_owner(id));

-- Trip Members: members can view other members in same trip
CREATE POLICY "Members can view trip members" ON trip_members
    FOR SELECT USING (is_trip_member(trip_id) OR user_id = auth.uid());
CREATE POLICY "Authenticated users can join trips" ON trip_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can leave trips" ON trip_members
    FOR DELETE USING (auth.uid() = user_id);

-- Helper function: check if user is member of a trip
CREATE OR REPLACE FUNCTION is_trip_member(check_trip_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM trip_members WHERE trip_id = check_trip_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Transactions
CREATE POLICY "Members can view trip transactions" ON transactions
    FOR SELECT USING (is_trip_member(trip_id));
CREATE POLICY "Members can insert trip transactions" ON transactions
    FOR INSERT WITH CHECK (is_trip_member(trip_id));
CREATE POLICY "Members can update trip transactions" ON transactions
    FOR UPDATE USING (is_trip_member(trip_id));
CREATE POLICY "Members can delete trip transactions" ON transactions
    FOR DELETE USING (is_trip_member(trip_id));

-- Activities
CREATE POLICY "Members can view trip activities" ON activities
    FOR SELECT USING (is_trip_member(trip_id));
CREATE POLICY "Members can insert trip activities" ON activities
    FOR INSERT WITH CHECK (is_trip_member(trip_id));
CREATE POLICY "Members can update trip activities" ON activities
    FOR UPDATE USING (is_trip_member(trip_id));
CREATE POLICY "Members can delete trip activities" ON activities
    FOR DELETE USING (is_trip_member(trip_id));

-- Checklist Items
CREATE POLICY "Members can view trip checklist" ON checklist_items
    FOR SELECT USING (is_trip_member(trip_id));
CREATE POLICY "Members can insert trip checklist" ON checklist_items
    FOR INSERT WITH CHECK (is_trip_member(trip_id));
CREATE POLICY "Members can update trip checklist" ON checklist_items
    FOR UPDATE USING (is_trip_member(trip_id));
CREATE POLICY "Members can delete trip checklist" ON checklist_items
    FOR DELETE USING (is_trip_member(trip_id));

-- Documents
CREATE POLICY "Members can view trip documents" ON documents
    FOR SELECT USING (is_trip_member(trip_id));
CREATE POLICY "Members can insert trip documents" ON documents
    FOR INSERT WITH CHECK (is_trip_member(trip_id));
CREATE POLICY "Members can update trip documents" ON documents
    FOR UPDATE USING (is_trip_member(trip_id));
CREATE POLICY "Members can delete trip documents" ON documents
    FOR DELETE USING (is_trip_member(trip_id));

-- Plans
CREATE POLICY "Members can view trip plans" ON plans
    FOR SELECT USING (is_trip_member(trip_id));
CREATE POLICY "Members can insert trip plans" ON plans
    FOR INSERT WITH CHECK (is_trip_member(trip_id));
CREATE POLICY "Members can update trip plans" ON plans
    FOR UPDATE USING (is_trip_member(trip_id));
CREATE POLICY "Members can delete trip plans" ON plans
    FOR DELETE USING (is_trip_member(trip_id));

-- Plan Options (access through plan's trip_id)
CREATE POLICY "Members can view plan options" ON plan_options
    FOR SELECT USING (
        plan_id IN (SELECT id FROM plans WHERE is_trip_member(trip_id))
    );
CREATE POLICY "Members can insert plan options" ON plan_options
    FOR INSERT WITH CHECK (
        plan_id IN (SELECT id FROM plans WHERE is_trip_member(trip_id))
    );
CREATE POLICY "Members can update plan options" ON plan_options
    FOR UPDATE USING (
        plan_id IN (SELECT id FROM plans WHERE is_trip_member(trip_id))
    );
CREATE POLICY "Members can delete plan options" ON plan_options
    FOR DELETE USING (
        plan_id IN (SELECT id FROM plans WHERE is_trip_member(trip_id))
    );


-- ============================================================
-- REALTIME — Enable realtime for collaborative tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER PUBLICATION supabase_realtime ADD TABLE plans;
ALTER PUBLICATION supabase_realtime ADD TABLE plan_options;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_members;
ALTER PUBLICATION supabase_realtime ADD TABLE trips;


-- ============================================================
-- STORAGE — Bucket untuk dokumen/gambar
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Members can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND auth.uid() IS NOT NULL
    );
CREATE POLICY "Anyone can view documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Members can delete own documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND auth.uid() IS NOT NULL
    );
