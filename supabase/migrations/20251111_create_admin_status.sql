-- Create admin_status table
CREATE TABLE IF NOT EXISTS public.admin_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on admin_status table
ALTER TABLE public.admin_status ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_status table
CREATE POLICY "Superadmins can view admin status" ON public.admin_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can update admin status" ON public.admin_status
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can insert admin status" ON public.admin_status
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can delete admin status" ON public.admin_status
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
    )
  );
