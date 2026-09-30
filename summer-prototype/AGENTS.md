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


## M2 data-driven rule

After the M1 vertical slice, prefer content definitions over special-case gameplay code.

New NPCs, schedules, quests, items, locations, dialogues and events should be created through the ContentDatabase/data layer whenever practical.

The project may use Stardew Valley and similar persistent-world RPGs as design/architecture references, but must not copy proprietary/decompiled code or copyrighted game assets.

Keep gameplay logic independent from final art assets so the approved pixel-art workstream can replace placeholders without rewriting systems.

When extending the game:
- first ask whether the feature belongs in data or a reusable system;
- avoid adding quest/NPC-specific booleans to main.gd;
- use stable content IDs in saves;
- validate content references at boot/debug time;
- maintain save migration paths;
- validate the full M1 regression after architectural changes.


## M3 living-world rule

M3 shifts the project from a systems prototype into a persistent playable world.

New work must preserve the M1/M2 regression baseline while delivering milestone-sized player-facing progress.

For M3:
- treat the seven-day Judah week as one integrated playable arc;
- prefer reusable calendar, vocation, needs, crafting, economy, relationship and event systems over content-specific branches;
- NPC schedules may vary by day and world state but must remain data-driven;
- do not re-centralize logic into main.gd;
- all essential keyboard-only actions need mouse/touch equivalents where practical;
- build anti-softlock behavior into quests, resources, schedules and navigation;
- keep final visual art replaceable through asset references;
- end the milestone with a genuine end-to-end playthrough, not only synthetic runtime probes.

Source-control safety:
- never use reset --hard or git clean on this project without explicit user authorization;
- inspect local .tscn, .uid and project.godot changes before deciding whether they are editor noise or valid work;
- preserve M1/M2 commits even if the local branch and origin diverge.
