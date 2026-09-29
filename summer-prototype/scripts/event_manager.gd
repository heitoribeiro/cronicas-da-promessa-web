extends Node
class_name EventManager

signal action_requested(action: Dictionary)
signal event_triggered(event_id: String)

const ACTION_TYPES: Array[String] = ["dialogue", "move_player", "move_npc", "wait", "camera_focus", "give_item", "remove_item", "set_flag", "set_time", "set_location", "start_quest", "complete_objective", "fade", "play_animation"]

var content_db: Node
var seen: Dictionary = {}

func configure(database: Node) -> void:
	content_db = database

func new_game() -> void:
	seen.clear()

func can_trigger(event_id: String, context: Dictionary) -> bool:
	var definition: Dictionary = content_db.get_definition("event", event_id)
	if definition.is_empty() or (bool(definition.get("once", true)) and bool(seen.get(event_id, false))):
		return false
	var conditions: Dictionary = definition.get("conditions", {})
	if conditions.has("day") and int(context.get("day", 1)) != int(conditions["day"]): return false
	if conditions.has("min_day") and int(context.get("day", 1)) < int(conditions["min_day"]): return false
	if conditions.has("min_time") and float(context.get("minutes", 0)) < float(conditions["min_time"]): return false
	if conditions.has("max_time") and float(context.get("minutes", 0)) >= float(conditions["max_time"]): return false
	if conditions.has("relationship_min") and int(context.get("relationship", 0)) < int(conditions["relationship_min"]): return false
	if conditions.has("quests_completed"):
		for quest_id in conditions["quests_completed"]:
			if not bool(context.get("completed_quests", {}).get(String(quest_id), false)): return false
	return true

func trigger(event_id: String, context: Dictionary) -> bool:
	if not can_trigger(event_id, context):
		return false
	var definition: Dictionary = content_db.get_definition("event", event_id)
	seen[event_id] = true
	print("[EVENT] ", event_id)
	for value in definition.get("actions", []):
		action_requested.emit(Dictionary(value).duplicate(true))
	event_triggered.emit(event_id)
	return true

func action_types(event_id: String) -> Array[String]:
	var result: Array[String] = []
	for value in content_db.get_definition("event", event_id).get("actions", []):
		result.append(String(value.get("type", "")))
	return result

func snapshot() -> Dictionary:
	return {"events_seen": seen.duplicate(true)}

func restore(data: Dictionary) -> bool:
	if not (data.get("events_seen", {}) is Dictionary): return false
	seen = Dictionary(data.get("events_seen", {})).duplicate(true)
	return true
