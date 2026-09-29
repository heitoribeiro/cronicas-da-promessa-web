extends CharacterBody2D
class_name PrototypeNPC

signal navigation_requested(world_position: Vector2)
signal navigation_path_updated(path: PackedVector2Array, resolved_target: Vector2)
signal patrol_point_reached(index: int, world_position: Vector2)
signal routine_changed(routine_id: String)
signal activity_changed(activity_id: String)
signal action_started(activity_id: String, routine_id: String, point_index: int, world_position: Vector2)
signal action_completed(activity_id: String, routine_id: String, point_index: int, world_position: Vector2)

@export var npc_name := "Hanan"
@export var patrol_speed := 42.0
@export var patrol_pause_seconds := 0.8

var patrol_points: Array[Vector2] = []
var patrol_index := 0
var paused := false
var active_routine_id := "default"
var active_activity_id := "wait"
var _settled := false

var _navigation_path: PackedVector2Array = PackedVector2Array()
var _path_index := 0
var _waiting_for_path := false
var _pause_remaining := 0.0
var _stuck_time := 0.0
var _action_active := false
var _action_world_position := Vector2.ZERO
var _action_point_index := -1

func _ready() -> void:
	collision_layer = 4
	collision_mask = 1 | 2

	var shape := CollisionShape2D.new()
	var capsule := CapsuleShape2D.new()
	capsule.radius = 13.0
	capsule.height = 34.0
	shape.shape = capsule
	add_child(shape)
	queue_redraw()

func apply_routine(routine_id: String, points: Array[Vector2], activity_id: String = "work", pause_seconds: float = -1.0) -> void:
	active_routine_id = routine_id
	set_activity_state(activity_id)
	if pause_seconds >= 0.0:
		patrol_pause_seconds = pause_seconds
	set_patrol(points)
	routine_changed.emit(active_routine_id)

func set_activity_state(activity_id: String) -> void:
	if active_activity_id == activity_id:
		return
	active_activity_id = activity_id
	activity_changed.emit(active_activity_id)

func set_patrol(points: Array[Vector2]) -> void:
	patrol_points = points
	patrol_index = 0
	_navigation_path = PackedVector2Array()
	_path_index = 0
	_waiting_for_path = false
	_pause_remaining = 0.0
	_action_active = false
	_settled = false

func set_navigation_path(path: PackedVector2Array, resolved_target: Vector2) -> void:
	_waiting_for_path = false
	_navigation_path = path
	_path_index = 0
	_stuck_time = 0.0

	if _navigation_path.is_empty():
		_pause_remaining = patrol_pause_seconds
		_advance_patrol()
		navigation_path_updated.emit(PackedVector2Array(), resolved_target)
		return

	while _path_index < _navigation_path.size() and global_position.distance_to(_navigation_path[_path_index]) <= 9.0:
		_path_index += 1

	navigation_path_updated.emit(_navigation_path, resolved_target)

	if _path_index >= _navigation_path.size():
		_finish_current_patrol_point()

func _physics_process(delta: float) -> void:
	if paused:
		velocity = Vector2.ZERO
		return

	if _pause_remaining > 0.0:
		_pause_remaining = maxf(0.0, _pause_remaining - delta)
		velocity = Vector2.ZERO
		if _pause_remaining <= 0.0 and _action_active:
			_action_active = false
			action_completed.emit(active_activity_id, active_routine_id, _action_point_index, _action_world_position)
		return

	if patrol_points.is_empty() or _settled:
		velocity = Vector2.ZERO
		return

	if _path_index < _navigation_path.size():
		_follow_navigation_path(delta)
		return

	velocity = Vector2.ZERO
	if not _waiting_for_path:
		_waiting_for_path = true
		navigation_requested.emit(patrol_points[patrol_index])

func _follow_navigation_path(delta: float) -> void:
	if _path_index >= _navigation_path.size():
		_finish_current_patrol_point()
		return

	var waypoint := _navigation_path[_path_index]
	var offset := waypoint - global_position

	if offset.length() <= 7.0:
		_path_index += 1
		if _path_index >= _navigation_path.size():
			_finish_current_patrol_point()
			return
		waypoint = _navigation_path[_path_index]
		offset = waypoint - global_position

	velocity = offset.normalized() * _movement_speed_for_activity()
	var before_move := global_position
	move_and_slide()

	var moved := global_position.distance_to(before_move)
	if moved < 0.25 and velocity.length() > 1.0:
		_stuck_time += delta
		if _stuck_time >= 0.65:
			_navigation_path = PackedVector2Array()
			_path_index = 0
			_waiting_for_path = false
			_stuck_time = 0.0
			navigation_path_updated.emit(PackedVector2Array(), global_position)
	else:
		_stuck_time = 0.0

func _finish_current_patrol_point() -> void:
	var reached_index := patrol_index
	var reached_position := patrol_points[patrol_index]
	_navigation_path = PackedVector2Array()
	_path_index = 0
	_waiting_for_path = false
	_stuck_time = 0.0
	velocity = Vector2.ZERO
	patrol_point_reached.emit(reached_index, reached_position)
	_begin_point_action(reached_index, reached_position)

	if patrol_points.size() == 1 and _activity_is_stationary(active_activity_id):
		_settled = true
	else:
		_advance_patrol()

	navigation_path_updated.emit(PackedVector2Array(), reached_position)

func _begin_point_action(point_index: int, world_position: Vector2) -> void:
	_action_point_index = point_index
	_action_world_position = world_position
	_action_active = true
	_pause_remaining = maxf(0.05, patrol_pause_seconds)
	action_started.emit(active_activity_id, active_routine_id, point_index, world_position)

func _advance_patrol() -> void:
	if patrol_points.is_empty():
		return
	patrol_index = (patrol_index + 1) % patrol_points.size()

func _activity_is_stationary(activity_id: String) -> bool:
	return activity_id == "wait" or activity_id == "meal" or activity_id == "rest"

func _movement_speed_for_activity() -> float:
	match active_activity_id:
		"travel":
			return patrol_speed * 1.25
		"socialize":
			return patrol_speed * 0.85
		"meal":
			return patrol_speed * 0.8
		"rest":
			return patrol_speed * 0.75
		"wait":
			return patrol_speed * 0.75
		_:
			return patrol_speed

func _draw() -> void:
	draw_circle(Vector2(0, -8), 11.0, Color("#c9895e"))
	draw_rect(Rect2(-12, 2, 24, 27), Color("#657044"))
	draw_rect(Rect2(-9, 29, 7, 12), Color("#513524"))
	draw_rect(Rect2(2, 29, 7, 12), Color("#513524"))
