extends Node
class_name M1GameState

const MINUTES_PER_SECOND: float = 2.0

var day: int = 1
var minutes: float = 360.0
var energy: float = 100.0
var hunger: float = 0.0
var scene_id: String = "camp"
var chapter_complete: bool = false
var tutorial_flags: Dictionary = {}
var npc_state: Dictionary = {}

func new_game() -> void:
	day = 1
	minutes = 360.0
	energy = 100.0
	hunger = 0.0
	scene_id = "camp"
	chapter_complete = false
	tutorial_flags.clear()
	npc_state.clear()

func tick(delta: float, moving: bool) -> void:
	minutes += delta * MINUTES_PER_SECOND
	while minutes >= 1440.0:
		minutes -= 1440.0
		day += 1
	hunger = clampf(hunger + delta * 0.035, 0.0, 100.0)
	if moving:
		energy = clampf(energy - delta * 0.025, 0.0, 100.0)
	if hunger >= 90.0:
		energy = clampf(energy - delta * 0.015, 0.0, 100.0)

func work(cost: float = 1.0) -> void:
	energy = clampf(energy - cost, 0.0, 100.0)
	hunger = clampf(hunger + cost * 0.4, 0.0, 100.0)

func eat() -> void:
	hunger = clampf(hunger - 38.0, 0.0, 100.0)
	energy = clampf(energy + 12.0, 0.0, 100.0)

func can_sleep() -> bool:
	return minutes >= 1020.0 or minutes < 360.0

func sleep_until_morning() -> void:
	day += 1
	minutes = 360.0
	energy = 100.0
	hunger = clampf(hunger - 20.0, 0.0, 100.0)
	scene_id = "tent"

func time_text() -> String:
	var total: int = int(floor(minutes))
	return "%02d:%02d" % [int(float(total) / 60.0), total % 60]

func phase() -> String:
	if minutes >= 1260.0 or minutes < 360.0:
		return "noite"
	if minutes >= 1080.0:
		return "entardecer"
	if minutes >= 720.0:
		return "tarde"
	return "manhã"

func snapshot() -> Dictionary:
	return {
		"day": day, "game_minutes": minutes, "energy": energy, "hunger": hunger,
		"current_scene": scene_id, "chapter_complete": chapter_complete,
		"tutorial_flags": tutorial_flags.duplicate(true), "npc_state": npc_state.duplicate(true)
	}

func restore(data: Dictionary) -> bool:
	if not data.has("game_minutes"):
		return false
	var next_scene: String = String(data.get("current_scene", "camp"))
	if not next_scene in ["camp", "tent", "kitchen", "workshop", "council"]:
		return false
	day = maxi(1, int(data.get("day", 1)))
	minutes = clampf(float(data["game_minutes"]), 0.0, 1439.999)
	energy = clampf(float(data.get("energy", 100.0)), 0.0, 100.0)
	hunger = clampf(float(data.get("hunger", 0.0)), 0.0, 100.0)
	scene_id = next_scene
	chapter_complete = bool(data.get("chapter_complete", false))
	tutorial_flags = Dictionary(data.get("tutorial_flags", {})).duplicate(true)
	npc_state = Dictionary(data.get("npc_state", {})).duplicate(true)
	return true
