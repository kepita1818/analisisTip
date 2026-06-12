CREATE TABLE IF NOT EXISTS competitions (
  id SERIAL PRIMARY KEY,
  key VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(80),
  type VARCHAR(30) NOT NULL,
  source VARCHAR(40),
  source_code VARCHAR(30),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  season_label VARCHAR(20) NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  UNIQUE(competition_id, season_label)
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  normalized_name VARCHAR(160) UNIQUE NOT NULL,
  country VARCHAR(80),
  team_type VARCHAR(30) DEFAULT 'club',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR(100) UNIQUE NOT NULL,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  season_id INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
  match_date DATE,
  kickoff_time VARCHAR(20),
  home_team_id INTEGER NOT NULL REFERENCES teams(id),
  away_team_id INTEGER NOT NULL REFERENCES teams(id),
  status VARCHAR(20) DEFAULT 'scheduled',
  round_label VARCHAR(60),
  home_goals INTEGER,
  away_goals INTEGER,
  ht_home_goals INTEGER,
  ht_away_goals INTEGER,
  home_shots INTEGER,
  away_shots INTEGER,
  home_shots_on_target INTEGER,
  away_shots_on_target INTEGER,
  home_corners INTEGER,
  away_corners INTEGER,
  home_yellow_cards INTEGER,
  away_yellow_cards INTEGER,
  home_red_cards INTEGER,
  away_red_cards INTEGER,
  referee VARCHAR(120),
  venue VARCHAR(120),
  imported_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_match_features (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT UNIQUE NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_last5_goals_for NUMERIC(6,2),
  home_last5_goals_against NUMERIC(6,2),
  away_last5_goals_for NUMERIC(6,2),
  away_last5_goals_against NUMERIC(6,2),
  home_last5_corners_for NUMERIC(6,2),
  away_last5_corners_for NUMERIC(6,2),
  home_last5_cards_for NUMERIC(6,2),
  away_last5_cards_for NUMERIC(6,2),
  expected_goals_line NUMERIC(6,2),
  expected_corners_line NUMERIC(6,2),
  expected_cards_line NUMERIC(6,2),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT UNIQUE NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  market_goals VARCHAR(20),
  market_corners VARCHAR(20),
  market_cards VARCHAR(20),
  confidence_goals NUMERIC(5,2),
  confidence_corners NUMERIC(5,2),
  confidence_cards NUMERIC(5,2),
  notes TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_competition_date ON matches(competition_id, match_date);
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id);
