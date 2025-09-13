# Migrações do Sistema de Avaliações

Execute as migrações SQL no Supabase SQL Editor na seguinte ordem:

## 1. Sistema de Avaliações (001_evaluation_system.sql)
```sql
-- Execute o conteúdo do arquivo 001_evaluation_system.sql
-- Este arquivo cria as tabelas e funções básicas do sistema de avaliações
```

## 2. Funções de Avaliação (002_evaluation_functions.sql)
```sql
-- Execute o conteúdo do arquivo 002_evaluation_functions.sql
-- Este arquivo cria as funções para buscar participantes e histórico
```

## Funcionalidades Implementadas

### ✅ Sistema de Avaliações
- **Modal de avaliação** ao sair do lobby (se ficou 20+ minutos)
- **Avaliação por estrelas** (0-5 estrelas)
- **Sistema de denúncias** com motivos predefinidos
- **Comentários opcionais** para avaliações e denúncias

### ✅ Histórico de Lobbies
- **Aba no perfil** para visualizar histórico
- **Lista de lobbies** com informações detalhadas
- **Botão para avaliar** participantes de lobbies históricos
- **Filtro automático** por tempo de permanência (20+ minutos)

### ✅ Lógica de 20+ Minutos
- **Controle de tempo** baseado em `joined_at` e `left_at`
- **Apenas participantes** que compartilharam 20+ minutos aparecem para avaliação
- **Registro automático** no histórico quando sair do lobby
- **Cálculo automático** de tempo de permanência

### ✅ Interface Responsiva
- **Design consistente** com o resto da aplicação
- **Modal responsivo** para avaliações
- **Tabs** para alternar entre perfil e histórico
- **Estilos ModuleCSS** seguindo o padrão do projeto

## Como Usar

1. **Ao sair do lobby**: Se ficou 20+ minutos, aparece modal de avaliação
2. **No perfil**: Acesse a aba "Histórico de Lobbies" para ver lobbies anteriores
3. **Avaliar participantes**: Clique em "Avaliar Participantes" em qualquer lobby do histórico
4. **Sistema de denúncias**: Marque "Denunciar este jogador" e selecione o motivo

## Estrutura do Banco

- `lobby_members`: Adicionadas colunas `left_at`, `total_time_minutes`, `can_evaluate`
- `user_evaluations`: Tabela de avaliações e denúncias
- `lobby_history`: Tabela de histórico de lobbies
- Funções SQL para buscar participantes e histórico
