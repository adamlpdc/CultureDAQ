-- Culture Intelligence Engine v2: AI suggestions only. AI has no path to verification or pricing.
CREATE TABLE IF NOT EXISTS culture_discovery_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  feed_url TEXT NOT NULL UNIQUE CHECK (feed_url ~ '^https://'),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Small, reviewed starter allow-list. Sources remain individually disableable.
INSERT INTO culture_discovery_sources(name, feed_url) VALUES
  ('BBC News - Entertainment & Arts', 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml'),
  ('The Guardian - Culture', 'https://www.theguardian.com/culture/rss'),
  ('Variety', 'https://variety.com/feed/'),
  ('ESPN - Top Headlines', 'https://www.espn.com/espn/rss/news')
ON CONFLICT (feed_url) DO NOTHING;

CREATE TABLE IF NOT EXISTS culture_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tick_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  articles_seen INTEGER NOT NULL DEFAULT 0,
  quality_filtered INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  suggestions_created INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS culture_event_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_run_id UUID REFERENCES culture_discovery_runs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('announcement','release','performance','award','controversy','viral_moment','sports_result','partnership')),
  affected_assets JSONB NOT NULL CHECK (jsonb_typeof(affected_assets) = 'array'),
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive','neutral','negative','mixed')),
  expected_attention NUMERIC(3,1) NOT NULL CHECK (expected_attention BETWEEN 1 AND 5),
  predicted_attention NUMERIC(3,1) NOT NULL CHECK (predicted_attention BETWEEN 1 AND 5),
  reach NUMERIC(3,1) NOT NULL CHECK (reach BETWEEN 1 AND 5),
  time_to_peak_hours NUMERIC(8,2) NOT NULL CHECK (time_to_peak_hours >= 0),
  decay_rate NUMERIC(8,6) NOT NULL CHECK (decay_rate BETWEEN 0 AND 1),
  reasoning TEXT NOT NULL,
  source_links JSONB NOT NULL CHECK (jsonb_typeof(source_links) = 'array'),
  duplicate_key TEXT NOT NULL,
  estimated_price_impact_percent NUMERIC(8,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','merged')),
  merged_into_id UUID REFERENCES culture_event_suggestions(id) ON DELETE SET NULL,
  approved_culture_event_id UUID REFERENCES culture_events(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  ai_model TEXT NOT NULL,
  ai_prediction JSONB NOT NULL,
  final_admin_edits JSONB,
  final_outcome JSONB,
  surprise_delta NUMERIC(8,4),
  actual_market_impact_percent NUMERIC(10,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS culture_event_suggestions_queue_idx ON culture_event_suggestions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS culture_event_suggestions_duplicate_idx ON culture_event_suggestions(duplicate_key, created_at DESC);

CREATE TABLE IF NOT EXISTS culture_suggestion_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES culture_event_suggestions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('ai_suggested','edited','approved','rejected','merged','outcome_recorded')),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('ai','admin','system')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE culture_discovery_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_event_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_suggestion_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON culture_discovery_sources, culture_discovery_runs, culture_event_suggestions, culture_suggestion_audit_log FROM anon, authenticated;

-- Atomic manual approval. The resulting CultureEvent is always an unverified draft.
CREATE OR REPLACE FUNCTION approve_culture_event_suggestion(p_suggestion_id UUID, p_actor UUID, p_edits JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_s culture_event_suggestions%ROWTYPE; v_event_id UUID; v_title TEXT; v_summary TEXT;
BEGIN
  SELECT * INTO v_s FROM culture_event_suggestions WHERE id = p_suggestion_id FOR UPDATE;
  IF NOT FOUND OR v_s.status <> 'pending' THEN RAISE EXCEPTION 'Suggestion is not pending'; END IF;
  v_title := COALESCE(NULLIF(p_edits->>'title',''), v_s.title);
  v_summary := COALESCE(NULLIF(p_edits->>'summary',''), v_s.summary);
  INSERT INTO culture_events(title, description, source, source_url, event_type, affected_assets,
    confidence, sentiment, expected_attention, predicted_attention, reach, time_to_peak_hours,
    decay_rate, is_verified, status, created_by)
  VALUES(v_title, v_summary, 'ai_suggestion_reviewed', v_s.source_links->0->>'url',
    COALESCE(NULLIF(p_edits->>'event_type',''),v_s.event_type),
    COALESCE(p_edits->'affected_assets',v_s.affected_assets),
    COALESCE((p_edits->>'confidence')::NUMERIC,v_s.confidence)/100,
    COALESCE(NULLIF(p_edits->>'sentiment',''),v_s.sentiment),
    COALESCE((p_edits->>'expected_attention')::NUMERIC,v_s.expected_attention)*20,
    COALESCE((p_edits->>'predicted_attention')::NUMERIC,v_s.predicted_attention)*20,
    COALESCE((p_edits->>'reach')::NUMERIC,v_s.reach),
    COALESCE((p_edits->>'time_to_peak_hours')::NUMERIC,v_s.time_to_peak_hours),
    COALESCE((p_edits->>'decay_rate')::NUMERIC,v_s.decay_rate), false, 'draft', p_actor)
  RETURNING id INTO v_event_id;
  UPDATE culture_event_suggestions SET status='approved', reviewed_by=p_actor, reviewed_at=NOW(),
    approved_culture_event_id=v_event_id, final_admin_edits=p_edits, updated_at=NOW() WHERE id=p_suggestion_id;
  INSERT INTO culture_event_audit_log(culture_event_id,action,actor_id,after_state)
    SELECT v_event_id,'created',p_actor,to_jsonb(e) FROM culture_events e WHERE id=v_event_id;
  INSERT INTO culture_suggestion_audit_log(suggestion_id,action,actor_type,actor_id,before_state,after_state)
    VALUES(p_suggestion_id,'approved','admin',p_actor,to_jsonb(v_s),jsonb_build_object('culture_event_id',v_event_id,'edits',p_edits));
  RETURN v_event_id;
END $$;
REVOKE ALL ON FUNCTION approve_culture_event_suggestion(UUID,UUID,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_culture_event_suggestion(UUID,UUID,JSONB) TO service_role;

-- Capture outcomes for later calibration without giving AI any write authority.
CREATE OR REPLACE FUNCTION record_culture_suggestion_outcome()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE culture_event_suggestions SET final_outcome=jsonb_build_object(
      'actual_attention',NEW.actual_attention,'resolved_at',NEW.resolved_at),
      surprise_delta=NEW.surprise_delta,updated_at=NOW()
    WHERE approved_culture_event_id=NEW.id;
    INSERT INTO culture_suggestion_audit_log(suggestion_id,action,actor_type,after_state)
      SELECT id,'outcome_recorded','system',jsonb_build_object('actual_attention',NEW.actual_attention,'surprise_delta',NEW.surprise_delta)
      FROM culture_event_suggestions WHERE approved_culture_event_id=NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS culture_suggestion_outcome_trigger ON culture_events;
CREATE TRIGGER culture_suggestion_outcome_trigger AFTER UPDATE ON culture_events
  FOR EACH ROW EXECUTE FUNCTION record_culture_suggestion_outcome();

CREATE OR REPLACE FUNCTION record_culture_suggestion_market_impact()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.culture_event_id IS NOT NULL AND NEW.applied THEN
    UPDATE culture_event_suggestions SET
      actual_market_impact_percent=COALESCE(actual_market_impact_percent,0)+NEW.final_percentage_move,
      updated_at=NOW() WHERE approved_culture_event_id=NEW.culture_event_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS culture_suggestion_impact_trigger ON market_engine_v2_calculations;
CREATE TRIGGER culture_suggestion_impact_trigger AFTER INSERT ON market_engine_v2_calculations
  FOR EACH ROW EXECUTE FUNCTION record_culture_suggestion_market_impact();
