CREATE INDEX notifications_created_at_idx ON notifications(created_at);
DELETE FROM notifications WHERE created_at<now()-interval '30 days';
