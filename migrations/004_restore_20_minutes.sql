-- RESTAURAR: Voltar regra de avaliação para 20 minutos
-- Execute este SQL no Supabase SQL Editor para restaurar

-- 1. Restaurar função de verificação de avaliação para 20 minutos
CREATE OR REPLACE FUNCTION can_evaluate_user(
  p_lobby_id UUID,
  p_user_id UUID,
  p_evaluated_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  time_together INTEGER;
BEGIN
  -- Calcular tempo que os dois usuários estiveram juntos no lobby
  SELECT COALESCE(
    EXTRACT(EPOCH FROM (
      LEAST(p1.left_at, p2.left_at, NOW()) - 
      GREATEST(p1.joined_at, p2.joined_at)
    )) / 60, 0
  ) INTO time_together
  FROM lobby_members p1, lobby_members p2
  WHERE p1.lobby_id = p_lobby_id 
    AND p1.user_id = p_user_id
    AND p2.lobby_id = p_lobby_id 
    AND p2.user_id = p_evaluated_id
    AND p1.joined_at <= COALESCE(p2.left_at, NOW())
    AND p2.joined_at <= COALESCE(p1.left_at, NOW());
  
  -- RESTAURADO: Voltar para 20 minutos
  RETURN time_together >= 20;
END;
$$ LANGUAGE plpgsql;

-- 2. Restaurar trigger para usar 20 minutos
CREATE OR REPLACE FUNCTION update_participation_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    NEW.total_time_minutes := calculate_lobby_time(NEW.joined_at, NEW.left_at);
    -- RESTAURADO: Voltar para 20 minutos
    NEW.can_evaluate := NEW.total_time_minutes >= 20;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
