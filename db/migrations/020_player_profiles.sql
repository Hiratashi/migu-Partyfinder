-- Public player profile customization.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_image_path text;
