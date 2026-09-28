extends CharacterBody2D
class_name PrototypeNPC

@export var npc_name := "Hanan"
@export var patrol_speed := 42.0

var patrol_points: Array[Vector2] = []
var patrol_index := 0
var paused := false

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

func set_patrol(points: Array[Vector2]) -> void:
	patrol_points = points
	patrol_index = 0

func _physics_process(_delta: float) -> void:
	if paused or patrol_points.is_empty():
		velocity = Vector2.ZERO
		return

	var target := patrol_points[patrol_index]
	var offset := target - global_position
	if offset.length() <= 7.0:
		patrol_index = (patrol_index + 1) % patrol_points.size()
		velocity = Vector2.ZERO
	else:
		velocity = offset.normalized() * patrol_speed

	move_and_slide()

func _draw() -> void:
	draw_circle(Vector2(0, -8), 11.0, Color("#c9895e"))
	draw_rect(Rect2(-12, 2, 24, 27), Color("#657044"))
	draw_rect(Rect2(-9, 29, 7, 12), Color("#513524"))
	draw_rect(Rect2(2, 29, 7, 12), Color("#513524"))
