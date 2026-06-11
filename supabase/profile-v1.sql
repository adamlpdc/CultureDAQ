-- Profile System V1 — avatar style + favorite achievement

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_style TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_achievement_id UUID REFERENCES achievements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_favorite_achievement ON profiles(favorite_achievement_id);
