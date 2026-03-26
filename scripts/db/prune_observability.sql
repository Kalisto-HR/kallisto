DELETE FROM service_logs
WHERE logged_at < NOW() - INTERVAL '30 days';

DELETE FROM audit_logs
WHERE occurred_at < NOW() - INTERVAL '365 days';
