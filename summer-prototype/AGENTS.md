# AGENTS.md — Crônicas da Promessa / Summer Prototype

## Mission
Build and validate the Summer/Godot prototype as a complete playable vertical slice, not as isolated micro-features.

## Working mode
- Work autonomously in milestone-sized batches.
- Do not stop after each small feature unless a blocker requires user input.
- Inspect the live project first with Summer MCP.
- Implement the batch.
- Run the game through Summer Engine.
- Read diagnostics/debugger/runtime evidence.
- Fix regressions.
- Repeat until the acceptance criteria for the milestone pass.
- Preserve unrelated local modifications.
- Prefer clean reusable systems over one-off flags and hard-coded quest branches.
- Keep visual presentation functional but do not redesign the approved visual style here; visual refinement is handled separately.

## Source control
- Pull before work when requested.
- Never discard local user changes without explicit permission.
- Keep commits cohesive by subsystem/checkpoint.
- Do not commit editor-generated noise unless the engine requires it.

## Architecture direction
Split the current monolithic prototype into reusable systems as the milestone progresses:
- GameState / time / day progression
- SaveManager
- QuestManager
- InventoryManager
- ResourceEconomy
- NPC schedule/activity controller
- Interaction system
- Scene/interior transition manager
- HUD / journal / pause menu
- data definitions for quests, NPC routines and resource recipes

Do not refactor everything blindly first. Extract systems while implementing the vertical slice, keeping the game runnable at every checkpoint.

## Validation discipline
Every checkpoint must end with:
- scene launches
- no script/runtime errors
- no debugger errors
- no new warnings unless explicitly documented
- movement/pathfinding works
- NPCs do not cross blocked geometry
- dialogue pauses only the active NPC when appropriate
- save/load round trip works
- active quests and completed quests persist
- input works with keyboard and mouse

Use Summer Engine runtime inspection, screenshots, input injection, diagnostics and debugger tools whenever available.

## Current baseline
The project already has:
- click-to-move + keyboard movement
- A* navigation around obstacles
- Hanan, Eliabe and Miriã schedules/activities
- camp resource economy
- player inventory
- two generic delivery quests
- local manual save + autosave
- portable .cdpsave export/import with integrity validation
- debug hotkeys/tests

Do not remove working baseline functionality while expanding the vertical slice.
