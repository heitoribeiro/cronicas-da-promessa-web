# Vertical Slice M1 — Primeiro Dia em Judá

## Goal
Deliver a substantially complete playable chapter of **Crônicas da Promessa** inside the Summer prototype. The player should be able to start a new game, learn the camp, complete a chain of work and story quests across a full day/night cycle, manage basic needs/resources, sleep, save, reload, and reach a clear chapter-complete state.

This is a **mechanical/content vertical slice**. Use functional placeholder visuals where needed; final visual polish is a separate workstream.

## Player experience
Target: 20–35 minutes for a first playthrough without rushing.

Flow:
1. New Game / Continue / Import Save.
2. Short opening briefing introducing Tina, Judah camp and controls.
3. Guided first-morning objectives.
4. Free movement with click-to-move and keyboard.
5. Complete work/story quests for Hanan, Eliabe and Miriã.
6. Gather and deliver resources.
7. Enter at least three functional interiors.
8. Eat to manage hunger; rest/sleep to restore needs and advance the day.
9. Use journal/map/inventory/pause menu.
10. Reach the evening sequence.
11. Sleep in the player tent.
12. Wake on the next morning with persistence intact.
13. Trigger a clear "Chapter 1 complete" summary and unlock free play / next-chapter placeholder.

## Systems to deliver

### 1. Boot and pause flow
- Main menu:
  - New Game
  - Continue
  - Import Save
  - Settings
- Pause/menu:
  - Resume
  - Journal
  - Inventory
  - Map
  - Save Now
  - Export Save
  - Settings
  - Main Menu
- New Game confirmation if progress already exists.

### 2. Core player state
Persist:
- player position / current scene
- current day and time
- energy
- hunger
- inventory
- camp resource stocks
- active quests
- completed quests
- tutorial flags
- chapter progress
- relevant NPC state where needed

Energy/hunger:
- movement and work consume modest energy
- hunger increases over time
- eating restores hunger and some energy
- sleeping restores energy and advances to morning
- never allow an unrecoverable state; emergency ration / kitchen fallback must exist

### 3. Scene structure / interiors
Functional scenes:
- Judah camp exterior
- Player tent interior
- Kitchen interior
- Workshop interior
- Council/standard-bearer tent interior

Requirements:
- enter/exit interaction points
- preserve player state across scene changes
- collision and navigation appropriate to each scene
- camera framing consistent
- NPC presence in interiors when routine requires it

### 4. Interaction framework
One generic interaction system for:
- NPC talk
- resource gathering
- doors/interior transitions
- bed/sleep
- kitchen/eat
- chest/storage
- council table / story inspect points

Mouse:
- clicking interaction prompt performs the same action as E
- click-to-move may approach a target and allow immediate interaction when in range

### 5. Quest framework
Use data-driven quest definitions. Avoid quest-specific booleans in main.gd.

Quest states:
- locked
- available
- active
- ready_to_turn_in
- completed

Quest objectives supported in M1:
- talk
- visit
- collect
- deliver
- inspect
- wait_until_time
- sleep

Quest journal:
- Active tab
- Completed history
- objective progress
- giver and location
- no completed quest clutter on normal HUD

### 6. M1 quest chain
Implement at least these quests, with sensible prerequisite order:

Q1 — Conhecendo o Acampamento de Judá
- talk to Ancião
- visit Kitchen, Workshop, Well, Player Tent
- return to Ancião

Q2 — Água para a Cozinha
- Hanan
- collect 2 Water
- deliver

Q3 — Lenha para a Oficina
- Eliabe
- collect 3 Wood
- deliver

Q4 — Preparativos da Refeição
- Miriã/Hanan
- inspect Kitchen
- ensure Water/Wood stock thresholds
- receive/eat one meal

Q5 — Cuidado do Rebanho
- shepherd NPC
- inspect/count flock points or interact with three flock markers
- return to shepherd

Q6 — Serviço no Centro
- Ancião
- visit standard/service area during required time window
- talk to two named NPCs

Q7 — Recolher ao Entardecer
- shepherd or Hanan
- trigger after late afternoon
- inspect corral and flock
- complete before night

Q8 — Descanso Merecido
- return to Player Tent
- optionally store excess resources in chest
- sleep

Q9 — Um Novo Dia
- wake next morning
- talk to Ancião
- chapter summary
- mark M1 complete

### 7. Inventory, chest and camp economy
Player inventory:
- Water
- Wood
- Materials
- Meals
- at least one mission-item category reserved for future use

Chest:
- deposit/withdraw transferable resources
- capacity shown
- mission-critical items cannot be accidentally lost if later added

Camp economy:
- keep existing NPC production/consumption
- quest deliveries must not soft-lock on full stock
- kitchen can produce meals when requirements are available
- expose shortages clearly

### 8. NPC schedules and world behavior
Keep Hanan, Eliabe, Miriã and add:
- Ancião
- Shepherd/Rebanho NPC

Minimum states:
- work
- travel
- socialize
- rest
- meal/wait where appropriate

Rules:
- schedules change by time
- NPCs path around structures
- no walking through buildings/crates/props
- dialogues pause only the engaged NPC unless a scripted scene intentionally pauses more
- interiors should be used by routines where relevant

### 9. Day/night and sleep
- morning, afternoon, dusk, night presentation states
- clock continues during normal play
- at night, NPCs settle into rest routines
- sleep available in Player Tent after appropriate time or chapter condition
- sleep advances to next morning
- restore energy strongly and reduce hunger appropriately
- autosave before/after sleep transition

### 10. HUD and UX
Functional, not final-polish:
- player status
- energy/hunger
- current time/day
- compact current objective only
- inventory summary
- interaction prompt
- optional FPS
- debug panel hidden by default in player-facing build

Journal and map must be accessible from UI buttons and keyboard shortcuts.

### 11. Save system
Maintain:
- manual slot
- autosave slot
- portable export/import

Add:
- current scene
- day number
- needs
- chapter completion
- all quest states/objectives
- chest storage

Import must remain transactional: validate before applying.

### 12. Regression/autotest suite
Retain existing tests and add milestone tests. Target a single console summary such as:

[M1TEST] BOOT 5/5
[M1TEST] INTERACTION 8/8
[M1TEST] QUESTS 9/9
[M1TEST] NEEDS 6/6
[M1TEST] INTERIORS 4/4
[M1TEST] SAVE 8/8
[M1TEST] CHAPTER 5/5

Exact counts may differ if architecture improves, but every subsystem must have deterministic checks.

## Architecture acceptance
By the end of M1, main.gd must no longer be the sole owner of all game logic. Extract at minimum:
- quest_manager.gd
- save_manager.gd
- game_state.gd
- inventory_manager.gd

Additional managers/resources are encouraged if they simplify the code.

Quest and routine content should be definitions/data, not a chain of special-case if/elif blocks.

## Completion criteria
M1 is accepted only when:
- a fresh New Game can reach the next morning and chapter-complete state
- no manual code edits are required during the playthrough
- all nine quests can be completed in sequence
- interiors work
- food/hunger/energy loop works
- save/load works in the middle of the quest chain
- portable export/import restores the same chapter state
- NPC routines continue through the full cycle
- no player can escape map bounds or remain indefinitely targeting unreachable points
- diagnostics and debugger finish with 0 errors
- Codex captures runtime evidence/screenshots for the main checkpoints

## Agent execution strategy
Work in internal checkpoints, but do not ask the user to validate every checkpoint.

Recommended checkpoints:
A. Refactor managers + preserve baseline.
B. Boot/menu + game state + needs.
C. Scene transitions/interiors.
D. Generic objective types + journal.
E. Full nine-quest chain + added NPCs.
F. sleep/day transition + chapter completion.
G. persistence expansion.
H. end-to-end automated/runtime validation.

At each checkpoint:
- run Summer
- inspect diagnostics
- fix regressions
- commit
- continue automatically

Stop only for:
- a destructive conflict that cannot be safely resolved
- a missing asset/decision that blocks mechanics
- an engine/tool failure that cannot be worked around

Otherwise continue until the M1 acceptance criteria are met.
