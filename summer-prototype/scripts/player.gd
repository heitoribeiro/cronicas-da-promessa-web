extends CharacterBody2D
class_name PrototypePlayer

signal destination_changed(world_position: Vector2)
signal destination_reached(world_position: Vector2)
signal destination_failed(world_position: Vector2)

@export var move_speed: float = 190.0

var target_position: Vector2
var has_target := false
var _stuck_time := 0.0

func _ready() -> void:
	target_position = global_position
	collision_layer = 1
	collision_mask = 2 | 4

	var shape := CollisionShape2D.new()
	var capsule := CapsuleShape2D.new()
	capsule.radius = 13.0
	capsule.height = 34.0
	shape.shape = capsule
	add_child(shape)
	queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			target_position = get_global_mouse_position()
			has_target = true
			_stuck_time = 0.0
			destination_changed.emit(target_position)

func _physics_process(delta: float) -> void:
	var manual := Vector2(
		float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) - float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)),
		float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) - float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
	)

	if manual.length() > 0.05:
		has_target = false
		_stuck_time = 0.0
		velocity = manual.normalized() * move_speed
	elif has_target:
		var offset := target_position - global_position
		if offset.length() > 7.0:
			velocity = offset.normalized() * move_speed
		else:
			has_target = false
			_stuck_time = 0.0
			velocity = Vector2.ZERO
			destination_reached.emit(target_position)
	else:
		velocity = Vector2.ZERO

	var before_move := global_position
	move_and_slide()

	if has_target:
		var moved := global_position.distance_to(before_move)
		if moved < 0.35 and velocity.length() > 1.0:
			_stuck_time += delta
			if _stuck_time >= 0.45:
				has_target = false
				velocity = Vector2.ZERO
				_stuck_time = 0.0
				destination_failed.emit(target_position)
		else:
			_stuck_time = 0.0

func _draw() -> void:
	# Temporary technical representation. Final sprite comes from the visual pipeline.
	draw_circle(Vector2(0, -8), 11.0, Color("#d7a071"))
	draw_rect(Rect2(-12, 2, 24, 27), Color("#29627a"))
	draw_rect(Rect2(-9, 29, 7, 12), Color("#433022"))
	draw_rect(Rect2(2, 29, 7, 12), Color("#433022"))
	draw_arc(Vector2.ZERO, 20.0, 0.0, TAU, 32, Color("#f2d16b"), 2.0)
