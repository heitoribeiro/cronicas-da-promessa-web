extends Node2D

const PlayerScript = preload("res://scripts/player.gd")
const NpcScript = preload("res://scripts/npc.gd")

var player: PrototypePlayer
var hanan: PrototypeNPC

var prompt_panel: PanelContainer
var prompt_label: Label
var dialogue_panel: PanelContainer
var dialogue_title: Label
var dialogue_text: Label
var destination_marker: Node2D

var quest_started := false
var quest_completed := false

func _ready() -> void:
	_build_world()
	_build_ui()
	_spawn_player()
	_spawn_hanan()
	_create_destination_marker()

func _process(_delta: float) -> void:
	if player == null or hanan == null:
		return

	var nearby := player.global_position.distance_to(hanan.global_position) <= 82.0
	prompt_panel.visible = nearby and not dialogue_panel.visible

	if nearby:
		prompt_label.text = "CLIQUE / E — Falar com Hanan"


func _unhandled_input(event: InputEvent) -> void:
	if dialogue_panel.visible:
		if event is InputEventKey and event.pressed:
			dialogue_panel.visible = false
			hanan.paused = false
			return
		if event is InputEventMouseButton and event.pressed:
			dialogue_panel.visible = false
			hanan.paused = false
			return
		return

	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_E:
			if player.global_position.distance_to(hanan.global_position) <= 82.0:
				_interact_with_hanan()
				get_viewport().set_input_as_handled()
				return

	if prompt_panel.visible and event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			var prompt_rect := prompt_panel.get_global_rect()
			if prompt_rect.has_point(mouse_event.position):
				_interact_with_hanan()
				get_viewport().set_input_as_handled()

func _on_prompt_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			if player != null and hanan != null and player.global_position.distance_to(hanan.global_position) <= 82.0:
				_interact_with_hanan()
				get_viewport().set_input_as_handled()

func _build_world() -> void:
	var ground := Polygon2D.new()
	ground.polygon = PackedVector2Array([
		Vector2(0, 0), Vector2(1280, 0),
		Vector2(1280, 720), Vector2(0, 720)
	])
	ground.color = Color("#b58b52")
	add_child(ground)

	_create_path(Rect2(0, 315, 1280, 100), Color("#d5b979"))
	_create_path(Rect2(590, 0, 100, 720), Color("#d5b979"))

	_create_static_rect("Cozinha", Vector2(315, 245), Vector2(210, 105), Color("#efe0b6"))
	_create_static_rect("Oficina", Vector2(920, 455), Vector2(220, 120), Color("#ead4a5"))
	_create_static_rect("Tenda do Estandarte", Vector2(520, 65), Vector2(250, 125), Color("#e8d8ad"))
	_create_static_rect("Curral", Vector2(165, 455), Vector2(300, 150), Color("#927046"))

	_create_well(Vector2(640, 500))
	_create_campfire(Vector2(640, 360))
	_create_world_bounds()

	var title := Label.new()
	title.text = "CRÔNICAS DA PROMESSA — PROTÓTIPO SUMMER"
	title.position = Vector2(24, 18)
	title.add_theme_font_size_override("font_size", 18)
	title.add_theme_color_override("font_color", Color("#3a271a"))
	add_child(title)

func _build_ui() -> void:
	var canvas := CanvasLayer.new()
	add_child(canvas)

	var instructions := Label.new()
	instructions.text = "Clique no chão para mover • WASD/setas • E para interagir"
	instructions.position = Vector2(24, 675)
	instructions.add_theme_font_size_override("font_size", 14)
	instructions.add_theme_color_override("font_color", Color.WHITE)
	canvas.add_child(instructions)

	prompt_panel = PanelContainer.new()
	prompt_panel.position = Vector2(455, 635)
	prompt_panel.size = Vector2(370, 44)
	prompt_panel.visible = false
	prompt_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	prompt_panel.gui_input.connect(_on_prompt_gui_input)
	canvas.add_child(prompt_panel)

	prompt_label = Label.new()
	prompt_label.text = "CLIQUE / E — Interagir"
	prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	prompt_label.add_theme_font_size_override("font_size", 17)
	prompt_panel.add_child(prompt_label)

	dialogue_panel = PanelContainer.new()
	dialogue_panel.position = Vector2(280, 470)
	dialogue_panel.size = Vector2(720, 150)
	dialogue_panel.visible = false
	canvas.add_child(dialogue_panel)

	var dialogue_box := VBoxContainer.new()
	dialogue_box.add_theme_constant_override("separation", 8)
	dialogue_panel.add_child(dialogue_box)

	dialogue_title = Label.new()
	dialogue_title.add_theme_font_size_override("font_size", 20)
	dialogue_title.add_theme_color_override("font_color", Color("#e5b94e"))
	dialogue_box.add_child(dialogue_title)

	dialogue_text = Label.new()
	dialogue_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	dialogue_text.add_theme_font_size_override("font_size", 15)
	dialogue_box.add_child(dialogue_text)

	var hint := Label.new()
	hint.text = "Clique ou pressione uma tecla para fechar."
	hint.add_theme_color_override("font_color", Color("#a8a8a8"))
	dialogue_box.add_child(hint)

func _spawn_player() -> void:
	player = PlayerScript.new()
	player.name = "Player"
	player.global_position = Vector2(640, 595)
	player.destination_changed.connect(_on_destination_changed)
	player.destination_reached.connect(_on_destination_reached)
	player.destination_failed.connect(_on_destination_failed)
	add_child(player)

func _spawn_hanan() -> void:
	hanan = NpcScript.new()
	hanan.name = "Hanan"
	hanan.npc_name = "Hanan"
	hanan.global_position = Vector2(420, 390)
	add_child(hanan)
	hanan.set_patrol([
		Vector2(420, 390),
		Vector2(365, 390),
		Vector2(350, 420),
		Vector2(395, 435),
		Vector2(455, 425),
		Vector2(480, 390)
	])

	var label := Label.new()
	label.text = "Hanan"
	label.position = Vector2(-23, 45)
	label.add_theme_font_size_override("font_size", 12)
	hanan.add_child(label)

func _create_destination_marker() -> void:
	destination_marker = Node2D.new()
	destination_marker.visible = false

	var diamond := Polygon2D.new()
	diamond.polygon = PackedVector2Array([
		Vector2(0, -10), Vector2(14, 0), Vector2(0, 10), Vector2(-14, 0)
	])
	diamond.color = Color("#f2ce58")
	destination_marker.add_child(diamond)

	add_child(destination_marker)

func _on_destination_changed(world_position: Vector2) -> void:
	destination_marker.global_position = world_position
	destination_marker.modulate = Color.WHITE
	destination_marker.visible = true

func _on_destination_reached(_world_position: Vector2) -> void:
	destination_marker.visible = false

func _on_destination_failed(world_position: Vector2) -> void:
	destination_marker.global_position = world_position
	destination_marker.modulate = Color("#d95b4d")
	destination_marker.visible = true
	var timer := get_tree().create_timer(0.65)
	timer.timeout.connect(func() -> void:
		if destination_marker != null:
			destination_marker.visible = false
	)

func _interact_with_hanan() -> void:
	hanan.paused = true
	dialogue_panel.visible = true
	prompt_panel.visible = false
	dialogue_title.text = "Hanan"

	if not quest_started:
		quest_started = true
		dialogue_text.text = "A cozinha precisa de água antes que o movimento aumente. Este protótipo já valida movimentação, colisão, patrulha de NPC e interação."
	elif not quest_completed:
		quest_completed = true
		dialogue_text.text = "Muito bem. Na próxima etapa, esta missão será ligada ao inventário e ao sistema de quests do jogo web."
	else:
		dialogue_text.text = "O protótipo Summer está funcionando. Podemos migrar os sistemas mecânicos gradualmente."

func _create_path(rect: Rect2, color: Color) -> void:
	var polygon := Polygon2D.new()
	polygon.polygon = PackedVector2Array([
		rect.position,
		Vector2(rect.end.x, rect.position.y),
		rect.end,
		Vector2(rect.position.x, rect.end.y)
	])
	polygon.color = color
	add_child(polygon)

func _create_static_rect(label_text: String, center: Vector2, size: Vector2, color: Color) -> void:
	var body := StaticBody2D.new()
	body.position = center
	body.collision_layer = 2
	body.collision_mask = 1 | 4
	add_child(body)

	var visual := Polygon2D.new()
	var half := size * 0.5
	visual.polygon = PackedVector2Array([
		Vector2(-half.x, -half.y),
		Vector2(half.x, -half.y),
		Vector2(half.x, half.y),
		Vector2(-half.x, half.y)
	])
	visual.color = color
	body.add_child(visual)

	var shape := CollisionShape2D.new()
	var rectangle := RectangleShape2D.new()
	rectangle.size = size
	shape.shape = rectangle
	body.add_child(shape)

	var label := Label.new()
	label.text = label_text
	label.position = Vector2(-half.x, -half.y - 24)
	label.add_theme_font_size_override("font_size", 13)
	label.add_theme_color_override("font_color", Color("#3c2a1b"))
	body.add_child(label)

func _create_well(center: Vector2) -> void:
	var body := StaticBody2D.new()
	body.position = center
	body.collision_layer = 2
	add_child(body)

	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 38.0
	shape.shape = circle
	body.add_child(shape)

	var visual := Polygon2D.new()
	visual.polygon = _regular_polygon(38.0, 20)
	visual.color = Color("#496f7a")
	body.add_child(visual)

func _create_campfire(center: Vector2) -> void:
	var visual := Polygon2D.new()
	visual.position = center
	visual.polygon = _regular_polygon(27.0, 12)
	visual.color = Color("#e9792e")
	add_child(visual)

func _create_world_bounds() -> void:
	const thickness := 48.0
	const width := 1280.0
	const height := 720.0
	_create_invisible_wall(Vector2(width * 0.5, -thickness * 0.5), Vector2(width + thickness * 2.0, thickness))
	_create_invisible_wall(Vector2(width * 0.5, height + thickness * 0.5), Vector2(width + thickness * 2.0, thickness))
	_create_invisible_wall(Vector2(-thickness * 0.5, height * 0.5), Vector2(thickness, height))
	_create_invisible_wall(Vector2(width + thickness * 0.5, height * 0.5), Vector2(thickness, height))

func _create_invisible_wall(center: Vector2, wall_size: Vector2) -> void:
	var body := StaticBody2D.new()
	body.position = center
	body.collision_layer = 2
	body.collision_mask = 1 | 4
	add_child(body)

	var shape := CollisionShape2D.new()
	var rectangle := RectangleShape2D.new()
	rectangle.size = wall_size
	shape.shape = rectangle
	body.add_child(shape)

func _regular_polygon(radius: float, sides: int) -> PackedVector2Array:
	var points := PackedVector2Array()
	for i in range(sides):
		var angle := TAU * float(i) / float(sides)
		points.append(Vector2(cos(angle), sin(angle)) * radius)
	return points
