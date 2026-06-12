CREATE OR REPLACE VIEW vw_match_cards AS
SELECT
  m.id,
  m.external_id,
  c.name AS competition,
  m.match_date,
  th.name AS home_team,
  ta.name AS away_team,
  COALESCE(m.home_yellow_cards,0) + COALESCE(m.away_yellow_cards,0) + COALESCE(m.home_red_cards,0) + COALESCE(m.away_red_cards,0) AS total_cards
FROM matches m
JOIN competitions c ON c.id = m.competition_id
JOIN teams th ON th.id = m.home_team_id
JOIN teams ta ON ta.id = m.away_team_id;

CREATE OR REPLACE VIEW vw_match_corners AS
SELECT
  m.id,
  m.external_id,
  c.name AS competition,
  m.match_date,
  th.name AS home_team,
  ta.name AS away_team,
  COALESCE(m.home_corners,0) + COALESCE(m.away_corners,0) AS total_corners
FROM matches m
JOIN competitions c ON c.id = m.competition_id
JOIN teams th ON th.id = m.home_team_id
JOIN teams ta ON ta.id = m.away_team_id;
