ALTER TABLE teams 
  ADD COLUMN country text DEFAULT NULL,
  ADD COLUMN autonomous_community text DEFAULT NULL,
  ADD COLUMN province text DEFAULT NULL,
  ADD COLUMN city text DEFAULT NULL;