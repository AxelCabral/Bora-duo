-- DEBUG: Ver TODOS os dados para entender o problema

-- 1. Ver TODOS os membros de TODOS os lobbies
SELECT 
  lm.user_id,
  lm.lobby_id,
  lm.joined_at,
  lm.left_at,
  lm.total_time_minutes,
  lm.can_evaluate,
  p.nickname,
  l.title as lobby_title,
  l.status as lobby_status
FROM lobby_members lm
LEFT JOIN profiles p ON p.user_id = lm.user_id
LEFT JOIN lobbies l ON l.id = lm.lobby_id
ORDER BY lm.joined_at DESC
LIMIT 20;

-- 2. Ver todos os lobbies recentes
SELECT 
  id,
  title,
  creator_id,
  current_members,
  max_members,
  status,
  created_at
FROM lobbies 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Contar total de registros
SELECT 
  'lobby_members' as tabela,
  COUNT(*) as total
FROM lobby_members
UNION ALL
SELECT 
  'lobbies' as tabela,
  COUNT(*) as total
FROM lobbies;
