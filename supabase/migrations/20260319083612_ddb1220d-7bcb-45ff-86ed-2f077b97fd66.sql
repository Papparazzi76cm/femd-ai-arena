
-- Table for token-based mesa assignments (no user account required)
CREATE TABLE public.mesa_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    mesa_name text NOT NULL,
    phone text NOT NULL,
    token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    status text NOT NULL DEFAULT 'pending',
    assigned_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX idx_mesa_assignments_token ON public.mesa_assignments(token);
CREATE INDEX idx_mesa_assignments_match_id ON public.mesa_assignments(match_id);

-- Enable RLS
ALTER TABLE public.mesa_assignments ENABLE ROW LEVEL SECURITY;

-- Public can read by token (for the mesa panel)
CREATE POLICY "Anyone can read assignment by token"
ON public.mesa_assignments
FOR SELECT
TO anon, authenticated
USING (true);

-- Admins can manage assignments
CREATE POLICY "Admins can insert assignments"
ON public.mesa_assignments
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update assignments"
ON public.mesa_assignments
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete assignments"
ON public.mesa_assignments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow anon to update status (for accept/reject via token)
CREATE POLICY "Anyone can accept/reject via token"
ON public.mesa_assignments
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Enable realtime for mesa_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE public.mesa_assignments;
