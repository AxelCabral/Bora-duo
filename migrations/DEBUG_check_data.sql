-- DEBUG: Verificar o que está acontecendo com os dados
-- Execute este SQL para ver os dados do seu lobby

-- 1. Ver todos os membros do lobby (substitua o ID do lobby)
SELECT 
  lm.user_id,
  lm.lobby_id,
  lm.joined_at,
  lm.left_at,
  lm.total_time_minutes,
  lm.can_evaluate,
  p.nickname,
  p.riot_id,
  -- Calcular tempo atual se ainda está no lobby
  CASE 
    WHEN lm.left_at IS NULL THEN 
      ROUND(EXTRACT(EPOCH FROM (NOW() - lm.joined_at)) / 60)
    ELSE lm.total_time_minutes
  END as tempo_calculado_agora
FROM lobby_members lm
LEFT JOIN profiles p ON p.user_id = lm.user_id
WHERE lm.lobby_id = 'SEU_LOBBY_ID_AQUI'  -- SUBSTITUA pelo ID do seu lobby
ORDER BY lm.joined_at;

-- 2. Ver informações do lobby
SELECT 
  id,
  title,
  creator_id,
  current_members,
  max_members,
  status,
  created_at
FROM lobbies 
WHERE id = 'SEU_LOBBY_ID_AQUI';  -- SUBSTITUA pelo ID do seu lobby

-- 3. Contar quantos podem ser avaliados
SELECT 
  COUNT(*) as total_membros,
  COUNT(CASE WHEN can_evaluate = true THEN 1 END) as podem_avaliar,
  COUNT(CASE WHEN total_time_minutes >= 1 THEN 1 END) as ficaram_1min_plus
FROM lobby_members 
WHERE lobby_id = 'SEU_LOBBY_ID_AQUI';  -- SUBSTITUA pelo ID do seu lobby
