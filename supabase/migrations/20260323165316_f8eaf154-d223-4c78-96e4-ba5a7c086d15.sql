
-- Allow anonymous users to manage goals (needed for mesa panel token-based access)
CREATE POLICY "Anon can insert goals" ON public.match_goals
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update goals" ON public.match_goals
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Anon can delete goals" ON public.match_goals
  FOR DELETE TO anon USING (true);
