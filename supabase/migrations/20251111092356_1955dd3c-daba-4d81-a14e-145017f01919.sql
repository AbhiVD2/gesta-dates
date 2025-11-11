-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'subadmin', 'patient');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create scan_types table for configurable tests
CREATE TABLE public.scan_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  week_range_start INTEGER NOT NULL,
  week_range_end INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scan_types ENABLE ROW LEVEL SECURITY;

-- Create patient_scans table
CREATE TABLE public.patient_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lmp_date DATE NOT NULL,
  aua_weeks INTEGER,
  corrected_lmp DATE,
  edd_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.patient_scans ENABLE ROW LEVEL SECURITY;

-- Create reminders table
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_scan_id UUID NOT NULL REFERENCES public.patient_scans(id) ON DELETE CASCADE,
  scan_type_id UUID NOT NULL REFERENCES public.scan_types(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Insert default scan types
INSERT INTO public.scan_types (name, week_range_start, week_range_end, is_default) VALUES
  ('Dating Scan', 6, 8, true),
  ('NT Scan', 11, 13, true),
  ('Anomaly Scan', 18, 22, true),
  ('Fetal Echo', 21, 22, true),
  ('Routine Scan (7 months)', 28, 32, true),
  ('Colour Doppler Scan (8 months)', 32, 36, true),
  ('Routine OBS Scan (9 months)', 36, 40, true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'subadmin')
  );

CREATE POLICY "Admins can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Superadmin can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admin can create admin and patient roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    role IN ('subadmin', 'patient')
  );

-- RLS Policies for scan_types
CREATE POLICY "Everyone can view scan types"
  ON public.scan_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage scan types"
  ON public.scan_types FOR ALL
  USING (
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for patient_scans
CREATE POLICY "Patients can view their own scans"
  ON public.patient_scans FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Admins can view all scans"
  ON public.patient_scans FOR SELECT
  USING (
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'subadmin')
  );

CREATE POLICY "Admins can create patient scans"
  ON public.patient_scans FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update patient scans"
  ON public.patient_scans FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for reminders
CREATE POLICY "Patients can view their reminders"
  ON public.reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_scans
      WHERE patient_scans.id = reminders.patient_scan_id
      AND patient_scans.patient_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all reminders"
  ON public.reminders FOR SELECT
  USING (
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'subadmin')
  );

CREATE POLICY "Subadmin can create reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'subadmin')
  );

-- Create trigger for profile updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_patient_scans_updated_at
  BEFORE UPDATE ON public.patient_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();