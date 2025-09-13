-- FORÇAR correção para o lobby atual
-- Execute este SQL substituindo o ID do lobby

-- 1. Atualizar TODOS os membros do lobby para ter dados corretos
UPDATE lobby_members 
SET 
  total_time_minutes = CASE 
    WHEN left_at IS NULL THEN 
      ROUND(EXTRACT(EPOCH FROM (NOW() - joined_at)) / 60)
    ELSE 
      ROUND(EXTRACT(EPOCH FROM (left_at - joined_at)) / 60)
  END,
  can_evaluate = CASE 
    WHEN left_at IS NULL THEN 
      EXTRACT(EPOCH FROM (NOW() - joined_at)) / 60 >= 1
    ELSE 
      EXTRACT(EPOCH FROM (left_at - joined_at)) / 60 >= 1
  END
WHERE lobby_id = 'SEU_LOBBY_ID_AQUI';  -- SUBSTITUA pelo ID do seu lobby

-- 2. Para teste, forçar que TODOS no lobby possam ser avaliados (temporário)
UPDATE lobby_members 
SET can_evaluate = true,
    total_time_minutes = GREATEST(total_time_minutes, 5)  -- Garantir pelo menos 5 minutos
WHERE lobby_id = 'SEU_LOBBY_ID_AQUI';  -- SUBSTITUA pelo ID do seu lobby
