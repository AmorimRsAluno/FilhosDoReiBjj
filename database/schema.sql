CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'finance');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE technique_status AS ENUM ('learned', 'developing', 'not_learned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx ON users(username);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_key)
);

CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  belt TEXT NOT NULL DEFAULT 'Preta',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  audience TEXT NOT NULL DEFAULT 'Geral',
  monthly_value NUMERIC(10,2) NOT NULL CHECK (monthly_value >= 0),
  due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 28),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  checkin_start_time TIME NOT NULL DEFAULT '20:30',
  checkin_end_time TIME NOT NULL DEFAULT '22:30',
  checkin_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS checkin_start_time TIME NOT NULL DEFAULT '20:30';
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS checkin_end_time TIME NOT NULL DEFAULT '22:30';
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS checkin_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5];
UPDATE membership_plans
SET checkin_start_time = COALESCE(checkin_start_time, '20:30'::time),
    checkin_end_time = COALESCE(checkin_end_time, '22:30'::time),
    checkin_days = CASE WHEN checkin_days IS NULL OR cardinality(checkin_days) = 0 THEN ARRAY[1,2,3,4,5] ELSE checkin_days END;

INSERT INTO membership_plans (name, audience, monthly_value, due_day, billing_cycle, status, description)
VALUES
  ('Jovens e Adultos Mensal', 'Jovens e adultos', 120.00, 10, 'monthly', 'active', 'Plano mensal para jovens e adultos.'),
  ('Kids Mensal', 'Kids', 80.00, 10, 'monthly', 'active', 'Plano mensal para alunos kids.')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  phone_ddd TEXT,
  birth_date DATE,
  cpf TEXT,
  address TEXT,
  zip_code TEXT,
  plan_id UUID REFERENCES membership_plans(id) ON DELETE SET NULL,
  billing_due_date DATE,
  billing_notify BOOLEAN NOT NULL DEFAULT true,
  belt TEXT NOT NULL DEFAULT 'Branca',
  stripe_count INTEGER NOT NULL DEFAULT 0 CHECK (stripe_count BETWEEN 0 AND 4),
  classes_until_next_stripe INTEGER NOT NULL DEFAULT 12 CHECK (classes_until_next_stripe >= 0),
  status TEXT NOT NULL DEFAULT 'active',
  goals TEXT,
  photo_url TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS classes_until_next_stripe INTEGER NOT NULL DEFAULT 12 CHECK (classes_until_next_stripe >= 0);
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone_ddd TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES membership_plans(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS billing_due_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS billing_notify BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_cpf_unique ON students(cpf) WHERE cpf IS NOT NULL AND cpf <> '';

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  due_date DATE NOT NULL,
  paid_at DATE,
  value NUMERIC(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  pix_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending')),
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  class_date TIMESTAMPTZ NOT NULL,
  checkin_start_at TIMESTAMPTZ,
  checkin_end_at TIMESTAMPTZ,
  auto_plan_id UUID REFERENCES membership_plans(id) ON DELETE SET NULL,
  auto_class_date DATE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  focus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS checkin_start_at TIMESTAMPTZ;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS checkin_end_at TIMESTAMPTZ;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS auto_plan_id UUID REFERENCES membership_plans(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS auto_class_date DATE;
UPDATE classes SET checkin_start_at = COALESCE(checkin_start_at, class_date);
UPDATE classes SET checkin_end_at = COALESCE(checkin_end_at, class_date + INTERVAL '2 hours');
ALTER TABLE classes ALTER COLUMN checkin_start_at SET DEFAULT now();
ALTER TABLE classes ALTER COLUMN checkin_end_at SET DEFAULT now() + INTERVAL '2 hours';
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_auto_plan_date ON classes(auto_plan_id, auto_class_date) WHERE auto_plan_id IS NOT NULL AND auto_class_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS class_allowed_plans (
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, plan_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded INTEGER NOT NULL DEFAULT 50,
  UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS training_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE techniques ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE techniques ADD COLUMN IF NOT EXISTS notes TEXT;
UPDATE techniques
SET video_url = regexp_replace(video_url, '^http://', 'https://')
WHERE video_url LIKE 'http://filhosdoreibjj.onrender.com/%'
   OR video_url LIKE 'http://api.filhosdoreibjj.com/%';
UPDATE techniques
SET video_url = ''
WHERE video_url IS NOT NULL
  AND video_url <> ''
  AND video_url !~ '^(https?://|/api/techniques/video/)';

CREATE TABLE IF NOT EXISTS technique_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'video/mp4',
  content BYTEA NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_techniques (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
  status technique_status NOT NULL DEFAULT 'not_learned',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, technique_id)
);

CREATE TABLE IF NOT EXISTS graduations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  belt TEXT NOT NULL,
  graduation_date DATE NOT NULL,
  teacher_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  location TEXT NOT NULL,
  registration_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competition_students (
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  medal TEXT,
  result_notes TEXT,
  PRIMARY KEY (competition_id, student_id)
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  pix_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  content BYTEA NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS likes (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS xp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_student_status ON payments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_students_plan ON students(plan_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_status ON membership_plans(status);
CREATE INDEX IF NOT EXISTS idx_financial_entries_date_type ON financial_entries(entry_date, type);
CREATE INDEX IF NOT EXISTS idx_attendance_student_checkin ON attendance(student_id, check_in_at);
CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(class_date);
CREATE INDEX IF NOT EXISTS idx_classes_checkin_window ON classes(checkin_start_at, checkin_end_at);
CREATE INDEX IF NOT EXISTS idx_training_checkins_status ON training_checkins(status, requested_at);
