extends Node
class_name ContentDatabase

const SCHEMA_VERSION: int = 1
const CONTENT_VERSION: String = "m2.0"
const CONTENT_ROOT: String = "res://data"
const CATEGORY_DIRS: Dictionary = {
	"item": "items",
	"npc": "npcs",
	"schedule": "schedules",
	"quest": "quests",
	"dialogue": "dialogues",
	"location": "locations",
	"recipe": "recipes",
	"event": "events",
	"relationship": "relationships",
	"chapter": "chapters"
}

var _records: Dictionary = {}
var _errors: Array[String] = []
var _loaded_files: Array[String] = []

func load_all(root_path: String = CONTENT_ROOT) -> bool:
	_records.clear()
	_errors.clear()
	_loaded_files.clear()
	for category_id in CATEGORY_DIRS.keys():
		_records[category_id] = {}
		_load_category(String(category_id), root_path.path_join(String(CATEGORY_DIRS[category_id])))
	_validate_content()
	for message in _errors:
		push_error("[CONTENT] %s" % message)
	return _errors.is_empty()

func _load_category(category_id: String, directory_path: String) -> void:
	var directory := DirAccess.open(directory_path)
	if directory == null:
		return
	var file_names := directory.get_files()
	file_names.sort()
	for file_name in file_names:
		if not file_name.to_lower().ends_with(".json"):
			continue
		var path := directory_path.path_join(file_name)
		var file := FileAccess.open(path, FileAccess.READ)
		if file == null:
			_errors.append("não foi possível abrir %s" % path)
			continue
		var parsed: Variant = JSON.parse_string(file.get_as_text())
		file.close()
		if not (parsed is Array):
			_errors.append("%s deve conter um array de definições" % path)
			continue
		_loaded_files.append(path)
		for value in parsed:
			if not (value is Dictionary):
				_errors.append("entrada inválida em %s" % path)
				continue
			_register(category_id, value, path)

func _register(category_id: String, definition: Dictionary, path: String) -> void:
	var content_id := String(definition.get("id", "")).strip_edges()
	if content_id.is_empty():
		_errors.append("ID ausente em %s" % path)
		return
	var category: Dictionary = _records[category_id]
	if category.has(content_id):
		_errors.append("ID duplicado '%s' na categoria %s" % [content_id, category_id])
		return
	var stored := definition.duplicate(true)
	stored["_source"] = path
	category[content_id] = stored

func _validate_content() -> void:
	for item_id in ids("item"):
		var item := get_item(item_id)
		for required_key in ["name", "category", "description"]:
			if String(item.get(required_key, "")).strip_edges().is_empty():
				_errors.append("item '%s' sem campo obrigatório '%s'" % [item_id, required_key])
		if int(item.get("stack_max", 0)) < 1:
			_errors.append("item '%s' possui stack_max inválido" % item_id)
		if not (item.get("effects", {}) is Dictionary) or not (item.get("tags", []) is Array):
			_errors.append("item '%s' possui effects/tags inválidos" % item_id)
	for npc_id in ids("npc"):
		var npc := get_npc(npc_id)
		for required_key in ["name", "tribe", "role", "home", "schedule_id", "dialogue_set"]:
			if String(npc.get(required_key, "")).strip_edges().is_empty():
				_errors.append("NPC '%s' sem campo obrigatório '%s'" % [npc_id, required_key])
	if count("schedule") > 0:
		for npc_id in ids("npc"):
			var schedule_id := String(get_npc(npc_id).get("schedule_id", ""))
			if not has("schedule", schedule_id):
				_errors.append("NPC '%s' referencia schedule ausente '%s'" % [npc_id, schedule_id])
	if count("dialogue") > 0:
		for npc_id in ids("npc"):
			var dialogue_id := String(get_npc(npc_id).get("dialogue_set", ""))
			if not has("dialogue", dialogue_id):
				_errors.append("NPC '%s' referencia diálogo ausente '%s'" % [npc_id, dialogue_id])

func has(category_id: String, content_id: String) -> bool:
	return _records.has(category_id) and (_records[category_id] as Dictionary).has(content_id)

func get_definition(category_id: String, content_id: String) -> Dictionary:
	if not has(category_id, content_id):
		return {}
	return Dictionary((_records[category_id] as Dictionary)[content_id]).duplicate(true)

func get_npc(content_id: String) -> Dictionary:
	return get_definition("npc", content_id)

func get_item(content_id: String) -> Dictionary:
	return get_definition("item", content_id)

func get_quest(content_id: String) -> Dictionary:
	return get_definition("quest", content_id)

func get_location(content_id: String) -> Dictionary:
	return get_definition("location", content_id)

func ids(category_id: String) -> Array[String]:
	var result: Array[String] = []
	if _records.has(category_id):
		for content_id in (_records[category_id] as Dictionary).keys():
			result.append(String(content_id))
	result.sort()
	return result

func all(category_id: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for content_id in ids(category_id):
		result.append(get_definition(category_id, content_id))
	return result

func count(category_id: String) -> int:
	return (_records.get(category_id, {}) as Dictionary).size()

func errors() -> Array[String]:
	return _errors.duplicate()

func loaded_files() -> Array[String]:
	return _loaded_files.duplicate()

func schema_version() -> int:
	return SCHEMA_VERSION

func content_version() -> String:
	return CONTENT_VERSION
