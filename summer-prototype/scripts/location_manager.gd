extends Node
class_name LocationManager

var content_db: Node
var current_location_id: String = "camp"

func configure(database: Node) -> void:
	content_db = database

func has(location_id: String) -> bool:
	return content_db.has("location", location_id)

func definition(location_id: String) -> Dictionary:
	return content_db.get_location(location_id)

func enter(location_id: String) -> bool:
	if not has(location_id):
		return false
	current_location_id = location_id
	return true

func scene_path(location_id: String) -> String:
	return String(definition(location_id).get("scene", ""))

func display_name(location_id: String) -> String:
	return String(definition(location_id).get("display_name", location_id))

func spawn_position(location_id: String, spawn_id: String = "default") -> Vector2:
	var points: Dictionary = definition(location_id).get("spawn_points", {})
	var value: Array = points.get(spawn_id, points.get("default", points.get("entry", [640, 560])))
	return Vector2(float(value[0]), float(value[1]))

func snapshot() -> Dictionary:
	return {"current_location": current_location_id}

func restore(data: Dictionary) -> bool:
	var location_id := String(data.get("current_location", data.get("current_scene", "camp")))
	return enter(location_id)
