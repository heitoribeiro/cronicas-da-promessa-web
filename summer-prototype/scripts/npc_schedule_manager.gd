extends Node
class_name NPCScheduleManager

const VALID_ACTIVITIES: Array[String] = ["work", "travel", "socialize", "rest", "meal", "wait"]

var content_db: Node

func configure(database: Node) -> void:
	content_db = database

func npc_id_for_name(npc_name: String) -> String:
	if content_db == null:
		return ""
	for npc_id in content_db.ids("npc"):
		if String(content_db.get_npc(npc_id).get("name", "")) == npc_name:
			return npc_id
	return ""

func schedule_for_npc(npc_name: String) -> Dictionary:
	var npc_id := npc_id_for_name(npc_name)
	if npc_id.is_empty():
		return {}
	var schedule_id := String(content_db.get_npc(npc_id).get("schedule_id", ""))
	return content_db.get_definition("schedule", schedule_id)

func entry_at(npc_name: String, total_minutes: int, context: Dictionary = {}) -> Dictionary:
	var schedule := schedule_for_npc(npc_name)
	var candidates: Array[Dictionary] = []
	for value in schedule.get("entries", []):
		var entry: Dictionary = value
		if total_minutes < int(entry.get("start", 0)) or total_minutes >= int(entry.get("end", 1440)):
			continue
		if not _condition_matches(Dictionary(entry.get("condition", {})), context):
			continue
		candidates.append(entry)
	if candidates.is_empty():
		var fallback_id := String(schedule.get("fallback", ""))
		return entry_by_routine(npc_name, fallback_id)
	candidates.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return int(a.get("priority", 0)) > int(b.get("priority", 0)))
	return candidates[0].duplicate(true)

func entry_by_routine(npc_name: String, routine_id: String) -> Dictionary:
	for value in schedule_for_npc(npc_name).get("entries", []):
		var entry: Dictionary = value
		if String(entry.get("routine_id", "")) == routine_id:
			return entry.duplicate(true)
	return {}

func route_for(npc_name: String, routine_id: String) -> Array[Vector2]:
	var route: Array[Vector2] = []
	for point in entry_by_routine(npc_name, routine_id).get("route", []):
		if point is Array and point.size() >= 2:
			route.append(Vector2(float(point[0]), float(point[1])))
	return route

func point_effect(npc_name: String, routine_id: String, point_index: int) -> Dictionary:
	var effects: Dictionary = entry_by_routine(npc_name, routine_id).get("point_effects", {})
	return Dictionary(effects.get(str(point_index), {})).duplicate(true)

func _condition_matches(condition: Dictionary, context: Dictionary) -> bool:
	if condition.is_empty():
		return true
	if condition.has("min_day") and int(context.get("day", 1)) < int(condition["min_day"]):
		return false
	if condition.has("flag") and not bool(context.get("flags", {}).get(String(condition["flag"]), false)):
		return false
	return true
