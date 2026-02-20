-- Termin-Performance-Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_queue_position ON queue_entries(position, called_at);

-- Wartezeit-Berechnungs-View
CREATE OR REPLACE VIEW v_current_queue AS
SELECT 
  q.*,
  s.name AS service_name,
  s.average_duration_minutes,
  COUNT(*) FILTER (WHERE q2.position < q.position) AS ahead_in_queue,
  COUNT(*) FILTER (WHERE q2.position < q.position) * s.average_duration_minutes AS estimated_wait_minutes
FROM queue_entries q
JOIN services s ON q.service_id = s.id
JOIN queue_entries q2 ON q2.service_id = q.service_id AND q2.status = 'waiting'
WHERE q.status = 'waiting'
GROUP BY q.id, s.name, s.average_duration_minutes;
