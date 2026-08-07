DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['events','teams','posts','sponsors','participants','sponsor_events'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated users can insert ' || replace(t,'_',' '), t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can update events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can delete teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can insert sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Authenticated users can update sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Authenticated users can delete sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Authenticated users can insert participants" ON public.participants;
DROP POLICY IF EXISTS "Authenticated users can update participants" ON public.participants;
DROP POLICY IF EXISTS "Authenticated users can delete participants" ON public.participants;
DROP POLICY IF EXISTS "Authenticated users can insert sponsor events" ON public.sponsor_events;
DROP POLICY IF EXISTS "Authenticated users can update sponsor events" ON public.sponsor_events;
DROP POLICY IF EXISTS "Authenticated users can delete sponsor events" ON public.sponsor_events;

CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can insert teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can update teams" ON public.teams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can insert posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can update posts" ON public.posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can delete posts" ON public.posts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can insert sponsors" ON public.sponsors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can update sponsors" ON public.sponsors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can delete sponsors" ON public.sponsors FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can insert participants" ON public.participants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can update participants" ON public.participants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can delete participants" ON public.participants FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can insert sponsor events" ON public.sponsor_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can update sponsor events" ON public.sponsor_events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can delete sponsor events" ON public.sponsor_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));