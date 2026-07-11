-- Manual-first Culture Intelligence Engine v1.
ALTER TABLE culture_events
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual_admin',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_confirmation TEXT;

ALTER TABLE culture_events DROP CONSTRAINT IF EXISTS culture_events_status_check;
ALTER TABLE culture_events ADD CONSTRAINT culture_events_status_check
  CHECK (status IN ('draft', 'verified', 'resolved', 'cancelled'));
ALTER TABLE culture_events ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE culture_events DROP CONSTRAINT IF EXISTS culture_events_resolution_complete;
ALTER TABLE culture_events ADD CONSTRAINT culture_events_v1_lifecycle CHECK (
  (is_verified = false AND verified_at IS NULL)
  OR (is_verified = true AND verified_at IS NOT NULL AND verification_confirmation = 'CONFIRM_VERIFIED_EVENT_PRICING')
);

CREATE INDEX IF NOT EXISTS culture_events_v1_queue_idx
  ON culture_events (verified_at, created_at)
  WHERE is_verified = true AND resolved_at IS NULL AND cancelled_at IS NULL;

CREATE TABLE IF NOT EXISTS culture_event_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  culture_event_id UUID NOT NULL REFERENCES culture_events(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'edited', 'verified', 'resolved', 'cancelled', 'rollback')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE culture_event_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON culture_event_audit_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION rollback_culture_event_v1(p_event_id UUID, p_actor UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_before JSONB;
BEGIN
  SELECT to_jsonb(e) INTO v_before FROM culture_events e WHERE id = p_event_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM market_engine_v2_calculations WHERE culture_event_id = p_event_id AND applied = true) THEN
    RAISE EXCEPTION 'Cannot rollback an event after a price movement was applied';
  END IF;
  UPDATE culture_events SET is_verified = false, verified_at = NULL,
    verification_confirmation = NULL, status = 'draft' WHERE id = p_event_id;
  INSERT INTO culture_event_audit_log(culture_event_id, action, actor_id, before_state, after_state)
  SELECT p_event_id, 'rollback', p_actor, v_before, to_jsonb(e) FROM culture_events e WHERE id = p_event_id;
END $$;
REVOKE ALL ON FUNCTION rollback_culture_event_v1(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rollback_culture_event_v1(UUID, UUID) TO service_role;
