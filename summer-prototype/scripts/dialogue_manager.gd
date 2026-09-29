extends Node
class_name DialogueManager

var content_db: Node

func configure(database: Node) -> void:
	content_db = database

func resolve(npc_id: String, context: Dictionary) -> String:
	var npc: Dictionary = content_db.get_npc(npc_id)
	var dialogue: Dictionary = content_db.get_definition("dialogue", String(npc.get("dialogue_set", "")))
	var matches: Array[Dictionary] = []
	for value in dialogue.get("variants", []):
		var variant: Dictionary = value
		if _matches(Dictionary(variant.get("conditions", {})), context):
			matches.append(variant)
	if matches.is_empty():
		return ""
	matches.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return int(a.get("priority", 0)) > int(b.get("priority", 0)))
	return String(matches[0].get("text", ""))

func _matches(conditions: Dictionary, context: Dictionary) -> bool:
	for key_value in conditions.keys():
		var key := String(key_value)
		match key:
			"relationship_min":
				if int(context.get("relationship", 0)) < int(conditions[key_value]): return false
			"relationship_max":
				if int(context.get("relationship", 0)) > int(conditions[key_value]): return false
			"flag":
				if not bool(context.get("flags", {}).get(String(conditions[key_value]), false)): return false
			_:
				if String(context.get(key, "")) != String(conditions[key_value]): return false
	return true
