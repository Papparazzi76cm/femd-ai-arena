-- Update SELECT policy for matches to restrict mesa users to only see their assigned matches
DROP POLICY IF EXISTS "Matches are viewable by everyone" ON public.matches;

-- Create new policy: Everyone can view matches, but mesas only see their assigned ones
CREATE POLICY "Matches viewable by admins and assigned mesas"
ON public.matches
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR referee_user_id = auth.uid()
  OR referee_user_id IS NULL
);

-- Also allow public read for unauthenticated users (for public tournament pages)
CREATE POLICY "Public matches viewable by everyone"
ON public.matches
FOR SELECT
TO anon
USING (true);