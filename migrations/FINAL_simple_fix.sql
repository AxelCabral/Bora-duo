-- CORREÇÃO FINAL SIMPLES - Execute APENAS este arquivo
-- Vai corrigir tudo de uma vez sem complicação

-- 1. Calcular tempo correto para todos os membros existentes
UPDATE lobby_members 
SET total_time_minutes = ROUND(EXTRACT(EPOCH FROM (COALESCE(left_at, NOW()) - joined_at)) / 60),
    can_evaluate = EXTRACT(EPOCH FROM (COALESCE(left_at, NOW()) - joined_at)) / 60 >= 1
WHERE total_time_minutes IS NULL OR total_time_minutes = 0;

-- 2. Marcar como avaliável quem ficou 1+ minuto
UPDATE lobby_members 
SET can_evaluate = true
WHERE total_time_minutes >= 1;

-- Pronto! Agora deve funcionar.
