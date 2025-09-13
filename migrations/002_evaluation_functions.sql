-- Função para buscar participantes que podem ser avaliados
-- (compartilharam lobby por 20+ minutos)

CREATE OR REPLACE FUNCTION get_lobby_participants_for_evaluation(
  p_lobby_id UUID
) RETURNS TABLE (
  user_id UUID,
  profile JSONB,
  can_evaluate BOOLEAN,
  time_together INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH current_user_id AS (
    SELECT auth.uid() as uid
  ),
  participant_times AS (
    SELECT 
      lm1.user_id,
      lm1.total_time_minutes,
      lm1.can_evaluate,
      p.nickname,
      p.riot_id,
      p.icon_url,
      p.rank_solo,
      p.rank_flex,
      p.full_name,
      p.birth_date,
      p.roles_preference,
      p.playstyle_tags,
      p.created_at,
      p.updated_at
    FROM lobby_members lm1
    JOIN profiles p ON p.user_id = lm1.user_id
    WHERE lm1.lobby_id = p_lobby_id
      AND lm1.can_evaluate = true
      AND lm1.user_id != (SELECT uid FROM current_user_id)
  )
  SELECT 
    pt.user_id,
    jsonb_build_object(
      'user_id', pt.user_id,
      'nickname', pt.nickname,
      'riot_id', pt.riot_id,
      'icon_url', pt.icon_url,
      'rank_solo', pt.rank_solo,
      'rank_flex', pt.rank_flex,
      'full_name', pt.full_name,
      'birth_date', pt.birth_date,
      'roles_preference', pt.roles_preference,
      'playstyle_tags', pt.playstyle_tags,
      'created_at', pt.created_at,
      'updated_at', pt.updated_at
    ) as profile,
    pt.can_evaluate,
    pt.total_time_minutes
  FROM participant_times pt
  ORDER BY pt.total_time_minutes DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar histórico de lobbies do usuário
CREATE OR REPLACE FUNCTION get_user_lobby_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  lobby_id UUID,
  lobby_title TEXT,
  game_mode TEXT,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  total_time_minutes INTEGER,
  participants_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lh.id,
    lh.lobby_id,
    lh.lobby_title,
    lh.game_mode,
    lh.joined_at,
    lh.left_at,
    lh.total_time_minutes,
    lh.participants_count,
    lh.created_at
  FROM lobby_history lh
  WHERE lh.user_id = p_user_id
  ORDER BY lh.left_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar participantes de um lobby histórico
CREATE OR REPLACE FUNCTION get_historical_lobby_participants(
  p_lobby_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  user_id UUID,
  profile JSONB,
  can_evaluate BOOLEAN,
  time_together INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH participant_times AS (
    SELECT 
      lm.user_id,
      lm.total_time_minutes,
      lm.can_evaluate,
      p.nickname,
      p.riot_id,
      p.icon_url,
      p.rank_solo,
      p.rank_flex,
      p.full_name,
      p.birth_date,
      p.roles_preference,
      p.playstyle_tags,
      p.created_at,
      p.updated_at
    FROM lobby_members lm
    JOIN profiles p ON p.user_id = lm.user_id
    WHERE lm.lobby_id = p_lobby_id
      AND lm.can_evaluate = true
      AND lm.user_id != p_user_id
  )
  SELECT 
    pt.user_id,
    jsonb_build_object(
      'user_id', pt.user_id,
      'nickname', pt.nickname,
      'riot_id', pt.riot_id,
      'icon_url', pt.icon_url,
      'rank_solo', pt.rank_solo,
      'rank_flex', pt.rank_flex,
      'full_name', pt.full_name,
      'birth_date', pt.birth_date,
      'roles_preference', pt.roles_preference,
      'playstyle_tags', pt.playstyle_tags,
      'created_at', pt.created_at,
      'updated_at', pt.updated_at
    ) as profile,
    pt.can_evaluate,
    pt.total_time_minutes
  FROM participant_times pt
  ORDER BY pt.total_time_minutes DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
