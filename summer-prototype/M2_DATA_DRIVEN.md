# M2 — Fundação Sistêmica e Mundo Orientado a Dados

## Propósito

Transformar o M1 já jogável em uma base escalável para o jogo completo. O M2 deve entregar uma versão jogável melhor, enquanto migra os principais sistemas para conteúdo orientado a dados.

## Critério macro

Ao final de M2:
1. M1 continua jogável do início ao fim.
2. As 9 quests de M1 vêm do novo QuestEngine orientado a dados.
3. NPCs principais vêm do ContentDatabase.
4. Rotinas vêm de Schedule definitions.
5. Itens vêm do ItemDatabase.
6. Diálogos principais são resolvidos pelo DialogueManager.
7. Saves usam IDs estáveis e versão de schema.
8. Relações e reputação funcionam.
9. Eventos dirigidos por dados funcionam.
10. Adicionar NPC, quest ou item simples não exige editar main.gd.

## Entregas obrigatórias

### A — ContentDatabase
Migrar Hanan, Eliabe, Miriã, Ancião e Pastor. Migrar Água, Lenha, Materiais e Refeição.

### B — Schedule Engine
Migrar rotinas atuais para dados com horário, localização, atividade, prioridade, condição opcional e fallback. Garantir navegação sem atravessar construções.

### C — Quest Engine 2
Migrar Q1–Q9 para definições. Objetivos genéricos: talk, visit, collect, deliver, inspect, wait_until_time, sleep e interact. Journal lê diretamente do QuestManager.

### D — Relationship + Reputation
Criar afinidade por NPC e reputação por tribo. Tela de relações deve mostrar pelo menos Hanan, Eliabe, Miriã, Ancião e Pastor. Recompensas podem alterar relação/reputação.

### E — Dialogue Context
Criar DialogueManager com variações por quest state, atividade do NPC, horário e relação básica.

### F — Event Engine
Criar eventos dirigidos por dados para abertura do capítulo, primeira reunião/serviço, entardecer/fogueira e conclusão do capítulo.

### G — Item/Inventory 2
Itens por definição com stack, consumable, transferable, quest_item e effects. Refeição restaura necessidades pela definição do item.

### H — Locations
Registrar Judah Camp, Player Tent, Kitchen, Workshop e Council Tent. Transições usam location IDs e spawn IDs.

### I — Save Schema 2
Adicionar schema_version, content_version, migration path do save M1 anterior, relações, reputação, eventos vistos, current_location e quest objectives. Manual/autosave/portable permanecem.

### J — Content Validation
Validar duplicate IDs, referências ausentes, schedules inválidos, prerequisites quebrados e dialogue owner inválido.

## Expansão jogável obrigatória

Além da migração, M2 deve provar a arquitetura com conteúdo novo.

Novos NPCs: pelo menos 3 NPCs simples por dados, sem lógica específica em main: um trabalhador/coletor, uma pessoa das tendas familiares e um auxiliar do serviço/conselho.

Novas quests do Dia 2: 3 quests, sendo uma de coleta, uma social/interação e uma produção/entrega. Cada uma altera relação ou reputação.

Novo evento: um evento contextual desbloqueado por relação ou conclusão das novas quests.

## Visual readiness

Não redesenhar a direção visual nesta milestone. Preparar assets por referência, animações desacopladas da lógica, UI independente de tamanho específico de sprite e tilesets/scene art substituíveis pelos assets pixel art.

## Estrutura mínima

Responsabilidades equivalentes a:
- content_database.gd
- game_state.gd
- save_manager.gd
- inventory_manager.gd
- quest_manager.gd
- npc_schedule_manager.gd
- relationship_manager.gd
- dialogue_manager.gd
- event_manager.gd
- location_manager.gd

main.gd deve atuar principalmente como composição/boot.

## Testes

Relatório consolidado esperado:
    [M2TEST] CONTENT ...
    [M2TEST] ITEMS ...
    [M2TEST] SCHEDULES ...
    [M2TEST] QUESTS ...
    [M2TEST] RELATIONSHIPS ...
    [M2TEST] DIALOGUES ...
    [M2TEST] EVENTS ...
    [M2TEST] LOCATIONS ...
    [M2TEST] SAVE ...
    [M2TEST] M1_REGRESSION ...

## Playthrough final

New Game -> concluir M1 Q1–Q9 -> dormir -> Dia 2 -> aceitar as 3 quests novas -> completar pelo menos duas -> verificar relações/reputação -> disparar evento contextual -> salvar/recarregar -> exportar/importar save -> validar persistência -> diagnostics/debugger.

## Critérios de aceitação

- 0 errors no diagnostics;
- 0 debugger errors;
- sem warning novo relevante;
- M1 continua completo;
- três quests do Dia 2 funcionam;
- três NPCs novos funcionam sem lógica específica;
- relações e eventos persistem;
- saves antigos do M1 são migrados ou tratados com segurança;
- conteúdo inválido gera diagnóstico claro;
- main.gd significativamente menos acoplado;
- novo conteúdo simples pode ser criado primariamente por dados.

## Estratégia

Checkpoints internos grandes:
A. Foundation + ContentDatabase.
B. Items + Inventory migration.
C. Schedules + NPC migration.
D. Quest migration.
E. Relationships + Dialogues.
F. Events + Locations.
G. Save migration.
H. Dia 2 content.
I. Regression M1 + M2 end-to-end.

Não solicitar aprovação do usuário entre checkpoints, salvo bloqueio destrutivo.