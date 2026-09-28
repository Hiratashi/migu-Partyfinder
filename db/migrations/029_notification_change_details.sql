-- Add structured before/after values without changing notifications already created in beta.
ALTER TABLE notifications
  ADD COLUMN change_details jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_change_details_array CHECK (jsonb_typeof(change_details)='array');
