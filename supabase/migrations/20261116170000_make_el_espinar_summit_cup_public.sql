-- Make El Espinar Summit Cup visible to public tournament pages.
-- This also updates installations where the tournament brand already exists.
UPDATE public.tournament_brands
SET is_public = true
WHERE slug = 'el-espinar-summit-cup';
