-- CORREÇÃO SIMPLES: Garantir que o sistema de avaliação funcione
-- Execute este SQL no Supabase SQL Editor

-- 1. Atualizar todos os registros existentes para permitir avaliação se ficaram 1+ minuto
UPDATE lobby_members 
SET can_evaluate = true,
    total_time_minutes = GREATEST(
      EXTRACT(EPOCH FROM (COALESCE(left_at, NOW()) - joined_at)) / 60,
      total_time_minutes
    )
WHERE total_time_minutes >= 1 OR 
      EXTRACT(EPOCH FROM (COALESCE(left_at, NOW()) - joined_at)) / 60 >= 1;

-- 2. Para lobbies ativos, calcular tempo atual
UPDATE lobby_members 
SET total_time_minutes = EXTRACT(EPOCH FROM (NOW() - joined_at)) / 60,
    can_evaluate = EXTRACT(EPOCH FROM (NOW() - joined_at)) / 60 >= 1
WHERE left_at IS NULL;

-- 3. Verificar dados (opcional - para debug)
-- SELECT 
--   lm.user_id,
--   lm.lobby_id,
--   lm.joined_at,
--   lm.left_at,
--   lm.total_time_minutes,
--   lm.can_evaluate,
--   p.nickname
-- FROM lobby_members lm
-- LEFT JOIN profiles p ON p.user_id = lm.user_id
-- ORDER BY lm.joined_at DESC
-- LIMIT 10;
