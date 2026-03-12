-- ============================================
-- BookBarber — Schema completo para Supabase
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================

-- =============================================
-- TABLA: businesses
-- =============================================
CREATE TABLE IF NOT EXISTS businesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) NOT NULL,
  phone         VARCHAR(20),
  address       TEXT,
  logo_url      TEXT,
  timezone      VARCHAR(50) DEFAULT 'America/Santiago',
  plan          VARCHAR(20) DEFAULT 'free',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: services
-- =============================================
CREATE TABLE IF NOT EXISTS services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  duration_min  INTEGER NOT NULL CHECK (duration_min > 0),
  price         INTEGER NOT NULL CHECK (price >= 0),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: schedules (horarios de atención por día)
-- =============================================
CREATE TABLE IF NOT EXISTS schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  UNIQUE (business_id, day_of_week)
);

-- =============================================
-- TABLA: blocked_slots (bloqueos de agenda)
-- =============================================
CREATE TABLE IF NOT EXISTS blocked_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  blocked_date  DATE NOT NULL,
  start_time    TIME,
  end_time      TIME,
  all_day       BOOLEAN DEFAULT false,
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: bookings (reservas)
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID REFERENCES businesses(id) ON DELETE CASCADE,
  service_id          UUID REFERENCES services(id),
  client_name         VARCHAR(100) NOT NULL,
  client_email        VARCHAR(100) NOT NULL,
  client_phone        VARCHAR(20),
  booking_date        DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  status              VARCHAR(20) DEFAULT 'confirmed'
                      CHECK (status IN ('pending','confirmed','cancelled','completed')),
  payment_status      VARCHAR(20) DEFAULT 'pending'
                      CHECK (payment_status IN ('pending','paid','refunded')),
  payment_id          VARCHAR(100),
  amount_paid         INTEGER,
  notes               TEXT,
  confirmation_token  VARCHAR(64) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: notifications_log
-- =============================================
CREATE TABLE IF NOT EXISTS notifications_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID REFERENCES bookings(id) ON DELETE CASCADE,
  type        VARCHAR(50),
  recipient   VARCHAR(100),
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  status      VARCHAR(20) CHECK (status IN ('sent','failed'))
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_bookings_business_date
  ON bookings(business_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_bookings_client_email
  ON bookings(client_email);

CREATE INDEX IF NOT EXISTS idx_services_business
  ON services(business_id);

CREATE INDEX IF NOT EXISTS idx_schedules_business
  ON schedules(business_id);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_business_date
  ON blocked_slots(business_id, blocked_date);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS
ALTER TABLE businesses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- businesses: solo el dueño puede ver/editar su negocio
CREATE POLICY "owner_all" ON businesses
  FOR ALL USING (auth.uid() = user_id);

-- services: admin ve los suyos; público puede leer servicios activos
CREATE POLICY "owner_all" ON services
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "public_read_active" ON services
  FOR SELECT USING (is_active = true);

-- schedules
CREATE POLICY "owner_all" ON schedules
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "public_read" ON schedules
  FOR SELECT USING (is_active = true);

-- blocked_slots
CREATE POLICY "owner_all" ON blocked_slots
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- bookings: admin ve las suyas; público puede insertar y leer por token
CREATE POLICY "owner_all" ON bookings
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "public_insert" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_by_token" ON bookings
  FOR SELECT USING (true); -- El backend filtra por token

-- notifications_log: solo el backend (service key) accede
CREATE POLICY "service_only" ON notifications_log
  FOR ALL USING (false); -- Acceso solo via service_role

-- =============================================
-- FUNCIÓN: auto-crear negocio al registrarse
-- =============================================
CREATE OR REPLACE FUNCTION create_business_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  business_name TEXT;
  slug_base     TEXT;
  final_slug    TEXT;
  counter       INT := 0;
BEGIN
  business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'Mi Negocio');
  slug_base := lower(regexp_replace(business_name, '[^a-zA-Z0-9]', '-', 'g'));
  final_slug := slug_base;

  -- Asegurar slug único
  WHILE EXISTS (SELECT 1 FROM businesses WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := slug_base || '-' || counter;
  END LOOP;

  INSERT INTO businesses (user_id, name, slug, email)
  VALUES (NEW.id, business_name, final_slug, NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger al crear usuario
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_business_on_signup();
