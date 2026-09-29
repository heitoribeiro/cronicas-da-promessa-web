extends Node2D

const PlayerScript = preload("res://scripts/player.gd")
const NpcScript = preload("res://scripts/npc.gd")
const GameStateScript = preload("res://scripts/game_state.gd")
const InventoryManagerScript = preload("res://scripts/inventory_manager.gd")
const QuestManagerScript = preload("res://scripts/quest_manager.gd")
const SaveManagerScript = preload("res://scripts/save_manager.gd")

var game_state: Node
var inventory_manager: Node
var quest_manager: Node
var save_manager: Node

var player: PrototypePlayer
var hanan: PrototypeNPC
var eliabe: PrototypeNPC
var miria: PrototypeNPC
var registered_npcs: Dictionary = {}
var current_npc_routines: Dictionary = {}
var current_npc_activities: Dictionary = {}

var prompt_panel: PanelContainer
var prompt_label: Label
var dialogue_panel: PanelContainer
var dialogue_title: Label
var dialogue_text: Label
var destination_marker: Node2D
var navigation_debug_line: Line2D
var npc_navigation_debug_line: Line2D
var navigation_debug_label: Label
var navigation_debug_visible := true
var navigation_self_test_summary := "NAV: aguardando autoteste"
var routine_self_test_summary := "ROTINA: aguardando autoteste"
var behavior_self_test_summary := "ESTADOS: aguardando autoteste"
var economy_self_test_summary := "ECONOMIA: aguardando autoteste"
var quest_self_test_summary := "QUEST: aguardando autoteste"
var save_self_test_summary := "SAVE: aguardando autoteste"
var portable_self_test_summary := "PORTABLE: aguardando autoteste"
var clock_label: Label
var routine_label: Label
var resource_label: Label
var inventory_label: Label
var quest_label: Label
var save_status_label: Label
var export_dialog: FileDialog
var import_dialog: FileDialog
var active_interaction_target := ""
var active_dialogue_npc: PrototypeNPC

const MANUAL_SAVE_PATH := "user://cronicas_promessa_manual_save.json"
const AUTOSAVE_PATH := "user://cronicas_promessa_autosave.json"
const PORTABLE_SAVE_FORMAT := "cronicas-da-promessa-save"
const PORTABLE_FORMAT_VERSION := 1
const PORTABLE_EXTENSION := ".cdpsave"
const PORTABLE_DEFAULT_FILENAME := "cronicas-da-promessa.cdpsave"
const RESOURCE_CAP := 20
const PLAYER_RESOURCE_CAP := 8
const WELL_POSITION := Vector2(640, 500)
const WOOD_GATHER_POSITION := Vector2(900, 650)
const FIRST_QUEST_ID := "water_kitchen"
const SECOND_QUEST_ID := "wood_workshop"

const QUEST_DEFINITIONS := {
	"water_kitchen": {
		"title": "Água para a Cozinha",
		"giver": "Hanan",
		"requirements": {"agua": 2},
		"start_text": "A Cozinha precisa de água. Vá até o Poço, recolha 2 unidades de Água e traga-as para mim.",
		"complete_text": "Muito bem. A Água foi entregue à Cozinha. A missão está concluída."
	},
	"wood_workshop": {
		"title": "Lenha para a Oficina",
		"giver": "Eliabe",
		"requirements": {"lenha": 3},
		"start_text": "Precisamos reforçar o trabalho da Oficina. Vá até a área de coleta e traga 3 unidades de Lenha.",
		"complete_text": "Excelente. Essa Lenha manterá a Oficina funcionando. A missão está concluída."
	}
}

var player_inventory: Dictionary = {
	"agua": 0,
	"lenha": 0,
	"materiais": 0,
	"refeicoes": 0
}
var camp_resources: Dictionary = {
	"agua": 4,
	"lenha": 4,
	"materiais": 0,
	"refeicoes": 0
}

const GAME_MINUTES_PER_REAL_SECOND := 2.0
var game_minutes := 6.0 * 60.0

const NAV_CELL_SIZE := 24.0
const NAV_AGENT_PADDING := 22.0
var navigation_grid := AStarGrid2D.new()
var navigation_ready := false

var active_quest_id := ""
var completed_quest_ids: Dictionary = {}

func _ready() -> void:
	game_state = GameStateScript.new()
	game_state.name = "GameState"
	add_child(game_state)
	inventory_manager = InventoryManagerScript.new()
	inventory_manager.name = "InventoryManager"
	add_child(inventory_manager)
	quest_manager = QuestManagerScript.new()
	quest_manager.name = "QuestManager"
	add_child(quest_manager)
	save_manager = SaveManagerScript.new()
	save_manager.name = "SaveManager"
	add_child(save_manager)
	player_inventory = inventory_manager.bag
	camp_resources = inventory_manager.camp
	completed_quest_ids = quest_manager.completed
	game_minutes = game_state.minutes
	_build_world()
	_build_navigation_grid()
	_run_navigation_self_tests()
	_run_routine_self_tests()
	_run_behavior_self_tests()
	_run_economy_self_tests()
	_run_player_quest_self_tests()
	_run_save_self_tests()
	_run_portable_self_tests()
	_build_ui()
	_setup_transfer_dialogs()
	_spawn_player()
	_spawn_hanan()
	_spawn_additional_npcs()
	_apply_all_npc_routines(true)
	_create_destination_marker()
	_create_navigation_debug_line()

func _process(delta: float) -> void:
	_advance_game_clock(delta)

	if player == null or hanan == null:
		return

	_apply_all_npc_routines(false)
	_update_clock_ui()
	_update_resource_ui()

	var hanan_nearby := player.global_position.distance_to(hanan.global_position) <= 82.0
	var eliabe_nearby := eliabe != null and player.global_position.distance_to(eliabe.global_position) <= 82.0
	var well_nearby := player.global_position.distance_to(WELL_POSITION) <= 92.0
	var wood_nearby := player.global_position.distance_to(WOOD_GATHER_POSITION) <= 92.0

	active_interaction_target = ""
	if hanan_nearby:
		active_interaction_target = "hanan"
		prompt_label.text = "CLIQUE / E — Falar com Hanan"
	elif eliabe_nearby:
		active_interaction_target = "eliabe"
		prompt_label.text = "CLIQUE / E — Falar com Eliabe"
	elif well_nearby:
		active_interaction_target = "well"
		prompt_label.text = "CLIQUE / E — Recolher água do Poço"
	elif wood_nearby:
		active_interaction_target = "wood"
		prompt_label.text = "CLIQUE / E — Recolher Lenha"

	prompt_panel.visible = active_interaction_target != "" and not dialogue_panel.visible


func _unhandled_input(event: InputEvent) -> void:
	if dialogue_panel.visible:
		if event is InputEventKey and event.pressed:
			_close_dialogue()
			return
		if event is InputEventMouseButton and event.pressed:
			_close_dialogue()
			return
		return

	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_F3:
			navigation_debug_visible = not navigation_debug_visible
			if navigation_debug_line != null:
				navigation_debug_line.visible = navigation_debug_visible and not navigation_debug_line.points.is_empty()
			if npc_navigation_debug_line != null:
				npc_navigation_debug_line.visible = navigation_debug_visible and not npc_navigation_debug_line.points.is_empty()
			if navigation_debug_label != null:
				navigation_debug_label.visible = navigation_debug_visible
			get_viewport().set_input_as_handled()
			return
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_F4:
			game_minutes = fmod(game_minutes + 360.0, 1440.0)
			game_state.minutes = game_minutes
			_apply_all_npc_routines(true)
			_update_clock_ui()
			get_viewport().set_input_as_handled()
			return
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_F5:
			_save_game("manual", MANUAL_SAVE_PATH)
			get_viewport().set_input_as_handled()
			return
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_F6:
			_open_export_dialog()
			get_viewport().set_input_as_handled()
			return
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_F9:
			_load_game(MANUAL_SAVE_PATH, "manual")
			get_viewport().set_input_as_handled()
			return
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_F10:
			_open_import_dialog()
			get_viewport().set_input_as_handled()
			return
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_E:
			if active_interaction_target != "":
				_interact_current_target()
				get_viewport().set_input_as_handled()
				return

	if prompt_panel.visible and event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			var prompt_rect := prompt_panel.get_global_rect()
			if prompt_rect.has_point(mouse_event.position):
				_interact_current_target()
				get_viewport().set_input_as_handled()

func _on_prompt_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			if active_interaction_target != "":
				_interact_current_target()
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
	_create_resource_pile(WOOD_GATHER_POSITION, "Coleta de Lenha")
	_create_campfire(Vector2(640, 360))
	_create_world_bounds()

	var title := Label.new()
	title.text = "CRÔNICAS DA PROMESSA — PROTÓTIPO SUMMER"
	title.position = Vector2(24, 18)
	title.add_theme_font_size_override("font_size", 18)
	title.add_theme_color_override("font_color", Color("#3a271a"))
	add_child(title)

func _advance_game_clock(delta: float) -> void:
	game_state.tick(delta, player != null and player.velocity.length() > 0.1)
	game_minutes = game_state.minutes

func _format_game_time() -> String:
	var total: int = int(floor(game_minutes))
	var hours: int = int(float(total) / 60.0)
	var minutes: int = total % 60
	return "%02d:%02d" % [hours, minutes]

func _get_npc_routine_id(npc_name: String, total_minutes: int) -> String:
	match npc_name:
		"Hanan":
			if total_minutes >= 360 and total_minutes < 720:
				return "cozinha_manha"
			if total_minutes >= 720 and total_minutes < 1080:
				return "servico_tarde"
			if total_minutes >= 1080 and total_minutes < 1260:
				return "preparar_noite"
			return "repouso"
		"Eliabe":
			if total_minutes >= 360 and total_minutes < 720:
				return "oficina_manha"
			if total_minutes >= 720 and total_minutes < 1080:
				return "coleta_tarde"
			if total_minutes >= 1080 and total_minutes < 1260:
				return "fogueira_entardecer"
			return "repouso"
		"Miriã":
			if total_minutes >= 360 and total_minutes < 720:
				return "tendas_manha"
			if total_minutes >= 720 and total_minutes < 1080:
				return "agua_tarde"
			if total_minutes >= 1080 and total_minutes < 1260:
				return "fogueira_entardecer"
			return "repouso"
	return "repouso"

func _npc_route_for(npc_name: String, routine_id: String) -> Array[Vector2]:
	match npc_name:
		"Hanan":
			match routine_id:
				"cozinha_manha":
					return [Vector2(465, 145), Vector2(165, 145), Vector2(165, 360), Vector2(465, 360)]
				"servico_tarde":
					return [Vector2(520, 300), Vector2(760, 300), Vector2(760, 430), Vector2(520, 430)]
				"preparar_noite":
					return [Vector2(465, 360), Vector2(520, 430), Vector2(430, 430)]
				_:
					return [Vector2(520, 620)]
		"Eliabe":
			match routine_id:
				"oficina_manha":
					return [Vector2(1090, 350), Vector2(1170, 350), Vector2(1170, 590), Vector2(1090, 590)]
				"coleta_tarde":
					return [Vector2(1040, 620), Vector2(1180, 620), Vector2(1180, 300), Vector2(1040, 300)]
				"fogueira_entardecer":
					return [Vector2(820, 330), Vector2(780, 360), Vector2(820, 390)]
				_:
					return [Vector2(1120, 650)]
		"Miriã":
			match routine_id:
				"tendas_manha":
					return [Vector2(760, 120), Vector2(980, 120), Vector2(980, 260), Vector2(760, 260)]
				"agua_tarde":
					return [Vector2(760, 520), Vector2(720, 560), Vector2(760, 600)]
				"fogueira_entardecer":
					return [Vector2(720, 330), Vector2(760, 360), Vector2(720, 390)]
				_:
					return [Vector2(1040, 150)]
	return [Vector2(640, 600)]

func _routine_short_name(npc_name: String, routine_id: String) -> String:
	match npc_name:
		"Hanan":
			match routine_id:
				"cozinha_manha": return "Cozinha"
				"servico_tarde": return "Centro"
				"preparar_noite": return "Entardecer"
				_: return "Repouso"
		"Eliabe":
			match routine_id:
				"oficina_manha": return "Oficina"
				"coleta_tarde": return "Coleta"
				"fogueira_entardecer": return "Fogueira"
				_: return "Repouso"
		"Miriã":
			match routine_id:
				"tendas_manha": return "Tendas"
				"agua_tarde": return "Água"
				"fogueira_entardecer": return "Fogueira"
				_: return "Repouso"
	return routine_id

func _npc_routine_display_name(npc_name: String, routine_id: String) -> String:
	match npc_name:
		"Hanan":
			match routine_id:
				"cozinha_manha": return "Hanan: serviço na Cozinha"
				"servico_tarde": return "Hanan: serviço no centro"
				"preparar_noite": return "Hanan: preparativos do entardecer"
				_: return "Hanan: repouso"
		"Eliabe":
			match routine_id:
				"oficina_manha": return "Eliabe: serviço na Oficina"
				"coleta_tarde": return "Eliabe: coleta e transporte"
				"fogueira_entardecer": return "Eliabe: reunião junto à fogueira"
				_: return "Eliabe: repouso"
		"Miriã":
			match routine_id:
				"tendas_manha": return "Miriã: tendas familiares"
				"agua_tarde": return "Miriã: busca de água"
				"fogueira_entardecer": return "Miriã: reunião junto à fogueira"
				_: return "Miriã: repouso"
	return "%s: rotina" % npc_name

func _npc_activity_for(npc_name: String, routine_id: String) -> String:
	match npc_name:
		"Hanan":
			match routine_id:
				"cozinha_manha", "servico_tarde":
					return "work"
				"preparar_noite":
					return "socialize"
				_:
					return "rest"
		"Eliabe":
			match routine_id:
				"oficina_manha":
					return "work"
				"coleta_tarde":
					return "travel"
				"fogueira_entardecer":
					return "socialize"
				_:
					return "rest"
		"Miriã":
			match routine_id:
				"tendas_manha":
					return "work"
				"agua_tarde":
					return "travel"
				"fogueira_entardecer":
					return "socialize"
				_:
					return "rest"
	return "wait"

func _activity_display_name(activity_id: String) -> String:
	match activity_id:
		"work": return "trabalho"
		"travel": return "deslocamento"
		"wait": return "espera"
		"meal": return "refeição"
		"socialize": return "socialização"
		"rest": return "repouso"
	return activity_id

func _npc_pause_for(activity_id: String) -> float:
	match activity_id:
		"rest": return 4.0
		"socialize": return 1.8
		"meal": return 3.0
		"wait": return 2.0
		"travel": return 0.15
		_: return 0.8

func _apply_all_npc_routines(force: bool) -> void:
	for npc_key in registered_npcs.keys():
		_apply_npc_routine(String(npc_key), force)

func _apply_npc_routine(npc_name: String, force: bool) -> void:
	if not registered_npcs.has(npc_name):
		return

	var npc: PrototypeNPC = registered_npcs[npc_name]
	var routine_id: String = _get_npc_routine_id(npc_name, int(floor(game_minutes)))
	var current_id: String = String(current_npc_routines.get(npc_name, ""))
	if not force and routine_id == current_id:
		return

	current_npc_routines[npc_name] = routine_id
	var activity_id: String = _npc_activity_for(npc_name, routine_id)
	current_npc_activities[npc_name] = activity_id
	npc.apply_routine(routine_id, _npc_route_for(npc_name, routine_id), activity_id, _npc_pause_for(activity_id))
	print("[ROUTINE] ", npc_name, " -> ", routine_id, " [", activity_id, "] às ", _format_game_time())

func _update_clock_ui() -> void:
	if clock_label != null:
		clock_label.text = "Hora %s" % _format_game_time()
	if routine_label != null:
		var h_id: String = String(current_npc_routines.get("Hanan", ""))
		var e_id: String = String(current_npc_routines.get("Eliabe", ""))
		var m_id: String = String(current_npc_routines.get("Miriã", ""))
		var h_activity: String = String(current_npc_activities.get("Hanan", "wait"))
		var e_activity: String = String(current_npc_activities.get("Eliabe", "wait"))
		var m_activity: String = String(current_npc_activities.get("Miriã", "wait"))
		routine_label.text = "Hanan • %s • %s\nEliabe • %s • %s\nMiriã • %s • %s" % [
			_routine_short_name("Hanan", h_id), _activity_display_name(h_activity),
			_routine_short_name("Eliabe", e_id), _activity_display_name(e_activity),
			_routine_short_name("Miriã", m_id), _activity_display_name(m_activity)
		]

func _run_routine_self_tests() -> void:
	var checks: Array[bool] = [
		_get_npc_routine_id("Hanan", 360) == "cozinha_manha",
		_get_npc_routine_id("Hanan", 720) == "servico_tarde",
		_get_npc_routine_id("Hanan", 1080) == "preparar_noite",
		_get_npc_routine_id("Hanan", 1260) == "repouso",
		_get_npc_routine_id("Eliabe", 360) == "oficina_manha",
		_get_npc_routine_id("Eliabe", 720) == "coleta_tarde",
		_get_npc_routine_id("Eliabe", 1080) == "fogueira_entardecer",
		_get_npc_routine_id("Eliabe", 1260) == "repouso",
		_get_npc_routine_id("Miriã", 360) == "tendas_manha",
		_get_npc_routine_id("Miriã", 720) == "agua_tarde",
		_get_npc_routine_id("Miriã", 1080) == "fogueira_entardecer",
		_get_npc_routine_id("Miriã", 1260) == "repouso"
	]
	var passed := 0
	for check in checks:
		if check:
			passed += 1
	routine_self_test_summary = "ROTINA %d/%d" % [passed, checks.size()]
	print("[ROUTINETEST] ", routine_self_test_summary)

func _run_behavior_self_tests() -> void:
	var checks: Array[bool] = [
		_npc_activity_for("Hanan", "cozinha_manha") == "work",
		_npc_activity_for("Hanan", "servico_tarde") == "work",
		_npc_activity_for("Hanan", "preparar_noite") == "socialize",
		_npc_activity_for("Hanan", "repouso") == "rest",
		_npc_activity_for("Eliabe", "oficina_manha") == "work",
		_npc_activity_for("Eliabe", "coleta_tarde") == "travel",
		_npc_activity_for("Eliabe", "fogueira_entardecer") == "socialize",
		_npc_activity_for("Eliabe", "repouso") == "rest",
		_npc_activity_for("Miriã", "tendas_manha") == "work",
		_npc_activity_for("Miriã", "agua_tarde") == "travel",
		_npc_activity_for("Miriã", "fogueira_entardecer") == "socialize",
		_npc_activity_for("Miriã", "repouso") == "rest"
	]
	var passed := 0
	for check in checks:
		if check:
			passed += 1
	behavior_self_test_summary = "ESTADOS %d/%d" % [passed, checks.size()]
	print("[BEHAVIORTEST] ", behavior_self_test_summary)

func _resource_effect_for(npc_name: String, routine_id: String, point_index: int) -> Dictionary:
	if point_index != 0:
		return {}

	match npc_name:
		"Hanan":
			if routine_id == "cozinha_manha":
				return {"agua": -1, "lenha": -1, "refeicoes": 1}
		"Eliabe":
			if routine_id == "oficina_manha":
				return {"materiais": 1}
			if routine_id == "coleta_tarde":
				return {"lenha": 1}
		"Miriã":
			if routine_id == "agua_tarde":
				return {"agua": 1}

	return {}

func _can_apply_resource_effect(effect: Dictionary) -> bool:
	for resource_key in effect.keys():
		var resource_id := String(resource_key)
		var delta := int(effect[resource_key])
		if delta < 0 and int(camp_resources.get(resource_id, 0)) + delta < 0:
			return false
	return true

func _apply_resource_effect(npc_name: String, routine_id: String, point_index: int) -> void:
	var effect := _resource_effect_for(npc_name, routine_id, point_index)
	if effect.is_empty():
		return

	if not _can_apply_resource_effect(effect):
		print("[RESOURCE] ", npc_name, " bloqueado em ", routine_id, ": recursos insuficientes")
		return

	var parts: Array[String] = []
	for resource_key in effect.keys():
		var resource_id := String(resource_key)
		var delta := int(effect[resource_key])
		var current := int(camp_resources.get(resource_id, 0))
		var updated := clampi(current + delta, 0, RESOURCE_CAP)
		camp_resources[resource_id] = updated
		parts.append("%s %+d" % [resource_id, delta])

	print("[RESOURCE] ", npc_name, " / ", routine_id, " -> ", ", ".join(PackedStringArray(parts)))
	_update_resource_ui()
	_save_game("camp_economy", AUTOSAVE_PATH)

func _update_resource_ui() -> void:
	if resource_label == null:
		return
	resource_label.text = "Acampamento  Água %d/%d  •  Lenha %d/%d  •  Materiais %d/%d  •  Refeições %d/%d" % [
		int(camp_resources.get("agua", 0)), RESOURCE_CAP,
		int(camp_resources.get("lenha", 0)), RESOURCE_CAP,
		int(camp_resources.get("materiais", 0)), RESOURCE_CAP,
		int(camp_resources.get("refeicoes", 0)), RESOURCE_CAP
	]

func _run_economy_self_tests() -> void:
	var hanan_effect := _resource_effect_for("Hanan", "cozinha_manha", 0)
	var eliabe_workshop := _resource_effect_for("Eliabe", "oficina_manha", 0)
	var eliabe_collect := _resource_effect_for("Eliabe", "coleta_tarde", 0)
	var miria_water := _resource_effect_for("Miriã", "agua_tarde", 0)
	var non_productive := _resource_effect_for("Miriã", "agua_tarde", 1)

	var checks: Array[bool] = [
		int(hanan_effect.get("agua", 0)) == -1 and int(hanan_effect.get("lenha", 0)) == -1 and int(hanan_effect.get("refeicoes", 0)) == 1,
		int(eliabe_workshop.get("materiais", 0)) == 1,
		int(eliabe_collect.get("lenha", 0)) == 1,
		int(miria_water.get("agua", 0)) == 1,
		non_productive.is_empty()
	]

	var passed := 0
	for check in checks:
		if check:
			passed += 1

	economy_self_test_summary = "ECONOMIA %d/%d" % [passed, checks.size()]
	print("[ECONOMYTEST] ", economy_self_test_summary)

func _inventory_has_requirements(inventory: Dictionary, requirements: Dictionary) -> bool:
	for resource_key in requirements.keys():
		var resource_id := String(resource_key)
		var required := int(requirements[resource_key])
		if int(inventory.get(resource_id, 0)) < required:
			return false
	return true

func _player_add_resource(resource_id: String, amount: int) -> int:
	var current := int(player_inventory.get(resource_id, 0))
	var updated := clampi(current + amount, 0, PLAYER_RESOURCE_CAP)
	player_inventory[resource_id] = updated
	_update_inventory_ui()
	return updated - current

func _get_quest_definition(quest_id: String) -> Dictionary:
	if not QUEST_DEFINITIONS.has(quest_id):
		return {}
	return QUEST_DEFINITIONS[quest_id]

func _quest_title(quest_id: String) -> String:
	var definition := _get_quest_definition(quest_id)
	return String(definition.get("title", quest_id))

func _quest_requirements(quest_id: String) -> Dictionary:
	var definition := _get_quest_definition(quest_id)
	return definition.get("requirements", {})

func _quest_is_completed(quest_id: String) -> bool:
	return bool(completed_quest_ids.get(quest_id, false))

func _start_quest(quest_id: String) -> bool:
	if _get_quest_definition(quest_id).is_empty():
		return false
	if _quest_is_completed(quest_id):
		return false
	if active_quest_id != "" and active_quest_id != quest_id:
		return false
	active_quest_id = quest_id
	print("[QUEST] Iniciada: ", _quest_title(quest_id))
	_update_inventory_ui()
	_save_game("quest_start", AUTOSAVE_PATH)
	return true

func _delivery_split(current_stock: int, amount: int) -> Vector2i:
	var free_space := maxi(0, RESOURCE_CAP - current_stock)
	var stored := mini(amount, free_space)
	var consumed_by_quest := maxi(0, amount - stored)
	return Vector2i(stored, consumed_by_quest)

func _deliver_quest_resources(quest_id: String) -> bool:
	var requirements := _quest_requirements(quest_id)
	if requirements.is_empty() or not _inventory_has_requirements(player_inventory, requirements):
		return false

	for resource_key in requirements.keys():
		var resource_id := String(resource_key)
		var amount := int(requirements[resource_key])
		var current_stock := int(camp_resources.get(resource_id, 0))
		var split := _delivery_split(current_stock, amount)
		var stored := split.x
		var consumed := split.y

		player_inventory[resource_id] = int(player_inventory.get(resource_id, 0)) - amount
		camp_resources[resource_id] = current_stock + stored

		print("[QUESTRESOURCE] ", resource_id, " entregue=", amount, " armazenado=", stored, " consumido_na_missao=", consumed)

	completed_quest_ids[quest_id] = true
	if active_quest_id == quest_id:
		active_quest_id = ""

	print("[QUEST] Concluída: ", _quest_title(quest_id))
	_update_inventory_ui()
	_update_resource_ui()
	_save_game("quest_complete", AUTOSAVE_PATH)
	return true

func _next_available_quest_for_giver(giver_name: String) -> String:
	if giver_name == "Hanan":
		if not _quest_is_completed(FIRST_QUEST_ID) and (active_quest_id == "" or active_quest_id == FIRST_QUEST_ID):
			return FIRST_QUEST_ID
	if giver_name == "Eliabe":
		if not _quest_is_completed(FIRST_QUEST_ID):
			return ""
		if not _quest_is_completed(SECOND_QUEST_ID) and (active_quest_id == "" or active_quest_id == SECOND_QUEST_ID):
			return SECOND_QUEST_ID
	return ""

func _quest_progress_text() -> String:
	if active_quest_id == "":
		if _quest_is_completed(SECOND_QUEST_ID):
			return "Quests concluídas: %s • %s" % [_quest_title(FIRST_QUEST_ID), _quest_title(SECOND_QUEST_ID)]
		if _quest_is_completed(FIRST_QUEST_ID):
			return "Quest concluída: %s • fale com Eliabe" % _quest_title(FIRST_QUEST_ID)
		return "Quest: fale com Hanan"

	var requirements := _quest_requirements(active_quest_id)
	var pieces: Array[String] = []
	for resource_key in requirements.keys():
		var resource_id := String(resource_key)
		var current := int(player_inventory.get(resource_id, 0))
		var required := int(requirements[resource_key])
		pieces.append("%s %d/%d" % [resource_id.capitalize(), current, required])

	return "Quest: %s • %s" % [_quest_title(active_quest_id), " • ".join(PackedStringArray(pieces))]

func _update_inventory_ui() -> void:
	if inventory_label != null:
		inventory_label.text = "Bolsa  Água %d/%d • Lenha %d/%d • Materiais %d/%d • Refeições %d/%d" % [
			int(player_inventory.get("agua", 0)), PLAYER_RESOURCE_CAP,
			int(player_inventory.get("lenha", 0)), PLAYER_RESOURCE_CAP,
			int(player_inventory.get("materiais", 0)), PLAYER_RESOURCE_CAP,
			int(player_inventory.get("refeicoes", 0)), PLAYER_RESOURCE_CAP
		]
	if quest_label != null:
		quest_label.text = _quest_progress_text()

func _interact_current_target() -> void:
	match active_interaction_target:
		"hanan":
			_interact_with_hanan()
		"eliabe":
			_interact_with_eliabe()
		"well":
			_collect_water_from_well()
		"wood":
			_collect_wood()

func _collect_water_from_well() -> void:
	if int(player_inventory.get("agua", 0)) >= PLAYER_RESOURCE_CAP:
		_show_system_dialogue("Poço", "Sua Bolsa já está no limite de Água.")
		return

	var added := _player_add_resource("agua", 1)
	print("[PLAYERRESOURCE] Água +", added, " • Bolsa=", player_inventory["agua"])
	_save_game("resource_collect", AUTOSAVE_PATH)
	_show_system_dialogue("Poço", "Você recolheu 1 unidade de Água. %s" % _quest_progress_text())

func _collect_wood() -> void:
	if int(player_inventory.get("lenha", 0)) >= PLAYER_RESOURCE_CAP:
		_show_system_dialogue("Área de Coleta", "Sua Bolsa já está no limite de Lenha.")
		return

	var added := _player_add_resource("lenha", 1)
	print("[PLAYERRESOURCE] Lenha +", added, " • Bolsa=", player_inventory["lenha"])
	_save_game("resource_collect", AUTOSAVE_PATH)
	_show_system_dialogue("Área de Coleta", "Você recolheu 1 unidade de Lenha. %s" % _quest_progress_text())

func _open_npc_dialogue(npc: PrototypeNPC, title: String) -> void:
	active_dialogue_npc = npc
	if active_dialogue_npc != null:
		active_dialogue_npc.paused = true
	dialogue_panel.visible = true
	prompt_panel.visible = false
	dialogue_title.text = title

func _close_dialogue() -> void:
	dialogue_panel.visible = false
	if active_dialogue_npc != null:
		active_dialogue_npc.paused = false
	active_dialogue_npc = null

func _show_system_dialogue(title: String, text: String) -> void:
	active_dialogue_npc = null
	dialogue_title.text = title
	dialogue_text.text = text
	dialogue_panel.visible = true
	prompt_panel.visible = false

func _run_player_quest_self_tests() -> void:
	var empty_inventory := {"agua": 0}
	var one_water := {"agua": 1}
	var enough_water := {"agua": 2}
	var requirements := _quest_requirements(FIRST_QUEST_ID)
	var wood_requirements := _quest_requirements(SECOND_QUEST_ID)
	var overflow_split := _delivery_split(20, 2)
	var partial_split := _delivery_split(19, 2)
	var definition := _get_quest_definition(FIRST_QUEST_ID)
	var wood_definition := _get_quest_definition(SECOND_QUEST_ID)

	var checks: Array[bool] = [
		not definition.is_empty(),
		String(definition.get("giver", "")) == "Hanan",
		int(requirements.get("agua", 0)) == 2,
		not wood_definition.is_empty(),
		String(wood_definition.get("giver", "")) == "Eliabe",
		int(wood_requirements.get("lenha", 0)) == 3,
		not _inventory_has_requirements(empty_inventory, requirements),
		not _inventory_has_requirements(one_water, requirements),
		_inventory_has_requirements(enough_water, requirements),
		clampi(7 + 2, 0, PLAYER_RESOURCE_CAP) == PLAYER_RESOURCE_CAP,
		overflow_split == Vector2i(0, 2),
		partial_split == Vector2i(1, 1)
	]
	var passed := 0
	for check in checks:
		if check:
			passed += 1
	quest_self_test_summary = "QUESTSYS %d/%d" % [passed, checks.size()]
	print("[QUESTTEST] ", quest_self_test_summary)

func _build_save_payload() -> Dictionary:
	var player_position := Vector2(640, 595)
	if player != null:
		player_position = player.global_position
	var payload: Dictionary = {"version": 2, "player_position": {"x": player_position.x, "y": player_position.y}}
	payload.merge(game_state.snapshot())
	payload.merge(inventory_manager.snapshot())
	payload.merge(quest_manager.snapshot())
	return payload

func _save_game(reason: String = "auto", save_path: String = AUTOSAVE_PATH) -> bool:
	var slot: String = "manual" if save_path == MANUAL_SAVE_PATH else "autosave"
	var succeeded: bool = save_manager.write_local(slot, _build_save_payload(), reason)
	_set_save_status(save_manager.last_status)
	return succeeded

func _load_game(save_path: String = MANUAL_SAVE_PATH, slot_name: String = "manual") -> bool:
	var slot: String = "manual" if save_path == MANUAL_SAVE_PATH else "autosave"
	var result: Dictionary = save_manager.read_local(slot)
	if not bool(result.get("ok", false)):
		_set_save_status(save_manager.last_status)
		return false
	if not _apply_save_payload(result["payload"]):
		_set_save_status("Save %s incompatível" % slot_name)
		return false
	save_manager.loaded(slot)
	_set_save_status(save_manager.last_status)
	return true

func _apply_save_payload(payload: Dictionary) -> bool:
	if not _is_save_payload_compatible(payload):
		return false
	var next_scene: String = String(payload.get("current_scene", "camp"))
	var next_quest: String = String(payload.get("active_quest_id", ""))
	if not next_scene in ["camp", "tent", "kitchen", "workshop", "council"]:
		return false
	if next_quest != "" and quest_manager.definition(next_quest).is_empty():
		return false
	if not inventory_manager.restore(payload) or not game_state.restore(payload) or not quest_manager.restore(payload):
		return false
	game_minutes = game_state.minutes
	active_quest_id = quest_manager.active_id
	completed_quest_ids = quest_manager.completed

	var position_data = payload.get("player_position", {})
	if player != null and position_data is Dictionary:
		player.cancel_navigation()
		player.global_position = Vector2(
			float(position_data.get("x", player.global_position.x)),
			float(position_data.get("y", player.global_position.y))
		)

	_apply_all_npc_routines(true)
	_update_clock_ui()
	_update_resource_ui()
	_update_inventory_ui()
	return true

func _set_save_status(text_value: String) -> void:
	if save_status_label != null:
		save_status_label.text = text_value

func _run_save_self_tests() -> void:
	var sample := {
		"version": 1,
		"game_minutes": 735.0,
		"player_position": {"x": 321.0, "y": 456.0},
		"player_inventory": {"agua": 2, "lenha": 3, "materiais": 1, "refeicoes": 0},
		"camp_resources": {"agua": 10, "lenha": 8, "materiais": 4, "refeicoes": 2},
		"active_quest_id": SECOND_QUEST_ID,
		"completed_quest_ids": {FIRST_QUEST_ID: true}
	}
	var encoded := JSON.stringify(sample)
	var decoded_variant = JSON.parse_string(encoded)
	var decoded: Dictionary = decoded_variant if decoded_variant is Dictionary else {}
	var decoded_inventory: Dictionary = decoded.get("player_inventory", {})
	var decoded_camp: Dictionary = decoded.get("camp_resources", {})
	var decoded_completed: Dictionary = decoded.get("completed_quest_ids", {})

	var checks: Array[bool] = [
		not decoded.is_empty(),
		int(decoded.get("version", 0)) == 1,
		int(decoded.get("game_minutes", 0)) == 735,
		int(decoded_inventory.get("lenha", 0)) == 3,
		int(decoded_camp.get("materiais", 0)) == 4,
		String(decoded.get("active_quest_id", "")) == SECOND_QUEST_ID,
		bool(decoded_completed.get(FIRST_QUEST_ID, false)),
		MANUAL_SAVE_PATH != AUTOSAVE_PATH,
		MANUAL_SAVE_PATH.ends_with("manual_save.json"),
		AUTOSAVE_PATH.ends_with("autosave.json")
	]

	var passed := 0
	for check in checks:
		if check:
			passed += 1
	save_self_test_summary = "SAVESYS %d/%d" % [passed, checks.size()]
	print("[SAVETEST] ", save_self_test_summary)

func _setup_transfer_dialogs() -> void:
	export_dialog = FileDialog.new()
	export_dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
	export_dialog.title = "Exportar save portátil"
	export_dialog.access = FileDialog.ACCESS_FILESYSTEM
	export_dialog.filters = PackedStringArray(["*%s ; Crônicas da Promessa Save" % PORTABLE_EXTENSION])
	export_dialog.current_file = PORTABLE_DEFAULT_FILENAME
	export_dialog.file_selected.connect(_on_export_file_selected)
	add_child(export_dialog)

	import_dialog = FileDialog.new()
	import_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	import_dialog.title = "Importar save portátil"
	import_dialog.access = FileDialog.ACCESS_FILESYSTEM
	import_dialog.filters = PackedStringArray(["*%s ; Crônicas da Promessa Save" % PORTABLE_EXTENSION])
	import_dialog.file_selected.connect(_on_import_file_selected)
	add_child(import_dialog)

func _open_export_dialog() -> void:
	if export_dialog == null:
		return
	export_dialog.current_file = PORTABLE_DEFAULT_FILENAME
	export_dialog.popup_centered_ratio(0.72)

func _open_import_dialog() -> void:
	if import_dialog == null:
		return
	import_dialog.popup_centered_ratio(0.72)

func _on_export_file_selected(path: String) -> void:
	_export_portable_save(path)

func _on_import_file_selected(path: String) -> void:
	_import_portable_save(path)

func _build_portable_package(payload: Dictionary) -> Dictionary:
	return save_manager.package_portable(payload)

func _validate_portable_package(package: Dictionary) -> Dictionary:
	return save_manager.validate_portable(package)

func _is_save_payload_compatible(payload: Dictionary) -> bool:
	return save_manager.validate_payload(payload)

func _export_portable_save(path: String) -> bool:
	var succeeded: bool = save_manager.export_portable(path, _build_save_payload())
	_set_save_status(save_manager.last_status)
	return succeeded

func _import_portable_save(path: String) -> bool:
	var validation: Dictionary = save_manager.read_portable(path)
	if not bool(validation.get("ok", false)):
		_set_save_status(save_manager.last_status)
		return false
	if not _apply_save_payload(validation["payload"]):
		_set_save_status("Importação recusada: estado incompatível")
		return false
	_save_game("imported", MANUAL_SAVE_PATH)
	_save_game("imported", AUTOSAVE_PATH)
	save_manager.imported(path)
	_set_save_status(save_manager.last_status)
	return true

func _run_portable_self_tests() -> void:
	var sample := {
		"version": 1,
		"game_minutes": 480.0,
		"player_position": {"x": 444.0, "y": 333.0},
		"player_inventory": {"agua": 2, "lenha": 1, "materiais": 0, "refeicoes": 0},
		"camp_resources": {"agua": 5, "lenha": 6, "materiais": 2, "refeicoes": 1},
		"active_quest_id": FIRST_QUEST_ID,
		"completed_quest_ids": {}
	}
	var package := _build_portable_package(sample)
	var validation := _validate_portable_package(package)

	var corrupted := package.duplicate(true)
	corrupted["checksum"] = "checksum-invalido"
	var corrupted_validation := _validate_portable_package(corrupted)

	var wrong_format := package.duplicate(true)
	wrong_format["format"] = "outro-jogo"
	var wrong_format_validation := _validate_portable_package(wrong_format)

	var checks: Array[bool] = [
		String(package.get("format", "")) == PORTABLE_SAVE_FORMAT,
		int(package.get("format_version", 0)) == PORTABLE_FORMAT_VERSION,
		not String(package.get("payload_json", "")).is_empty(),
		String(package.get("checksum", "")).length() == 64,
		bool(validation.get("ok", false)),
		validation.get("payload", {}) is Dictionary,
		not bool(corrupted_validation.get("ok", true)),
		not bool(wrong_format_validation.get("ok", true))
	]

	var passed := 0
	for check in checks:
		if check:
			passed += 1
	portable_self_test_summary = "PORTABLE %d/%d" % [passed, checks.size()]
	print("[PORTABLETEST] ", portable_self_test_summary)

func _build_navigation_grid() -> void:
	navigation_grid.region = Rect2i(0, 0, int(ceil(1280.0 / NAV_CELL_SIZE)), int(ceil(720.0 / NAV_CELL_SIZE)))
	navigation_grid.cell_size = Vector2(NAV_CELL_SIZE, NAV_CELL_SIZE)
	navigation_grid.offset = Vector2(NAV_CELL_SIZE * 0.5, NAV_CELL_SIZE * 0.5)
	navigation_grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	navigation_grid.update()

	_mark_rect_blocked(Vector2(315, 245), Vector2(210, 105), NAV_AGENT_PADDING)
	_mark_rect_blocked(Vector2(920, 455), Vector2(220, 120), NAV_AGENT_PADDING)
	_mark_rect_blocked(Vector2(520, 65), Vector2(250, 125), NAV_AGENT_PADDING)
	_mark_rect_blocked(Vector2(165, 455), Vector2(300, 150), NAV_AGENT_PADDING)
	_mark_circle_blocked(Vector2(640, 500), 38.0 + NAV_AGENT_PADDING)

	navigation_ready = true

func _mark_rect_blocked(center: Vector2, size: Vector2, padding: float) -> void:
	var blocked_rect := Rect2(center - size * 0.5, size).grow(padding)
	for y in range(navigation_grid.region.position.y, navigation_grid.region.end.y):
		for x in range(navigation_grid.region.position.x, navigation_grid.region.end.x):
			var cell := Vector2i(x, y)
			if blocked_rect.has_point(navigation_grid.get_point_position(cell)):
				navigation_grid.set_point_solid(cell, true)

func _mark_circle_blocked(center: Vector2, radius: float) -> void:
	for y in range(navigation_grid.region.position.y, navigation_grid.region.end.y):
		for x in range(navigation_grid.region.position.x, navigation_grid.region.end.x):
			var cell := Vector2i(x, y)
			if navigation_grid.get_point_position(cell).distance_to(center) <= radius:
				navigation_grid.set_point_solid(cell, true)

func _world_to_grid(world_position: Vector2) -> Vector2i:
	var x := int(floor(world_position.x / NAV_CELL_SIZE))
	var y := int(floor(world_position.y / NAV_CELL_SIZE))
	x = clampi(x, navigation_grid.region.position.x, navigation_grid.region.end.x - 1)
	y = clampi(y, navigation_grid.region.position.y, navigation_grid.region.end.y - 1)
	return Vector2i(x, y)

func _nearest_walkable_cell(origin: Vector2i) -> Vector2i:
	if navigation_grid.is_in_boundsv(origin) and not navigation_grid.is_point_solid(origin):
		return origin

	for radius in range(1, 7):
		for y_offset in range(-radius, radius + 1):
			for x_offset in range(-radius, radius + 1):
				if abs(x_offset) != radius and abs(y_offset) != radius:
					continue
				var candidate := origin + Vector2i(x_offset, y_offset)
				if navigation_grid.is_in_boundsv(candidate) and not navigation_grid.is_point_solid(candidate):
					return candidate

	return Vector2i(-1, -1)

func _compute_navigation_path(start_world: Vector2, requested_world: Vector2) -> Dictionary:
	if not navigation_ready:
		return {"path": PackedVector2Array(), "resolved_target": requested_world, "ok": false}

	var start_cell := _nearest_walkable_cell(_world_to_grid(start_world))
	var destination_cell := _nearest_walkable_cell(_world_to_grid(requested_world))
	if start_cell == Vector2i(-1, -1) or destination_cell == Vector2i(-1, -1):
		return {"path": PackedVector2Array(), "resolved_target": requested_world, "ok": false}

	var cell_path := navigation_grid.get_id_path(start_cell, destination_cell, true)
	if cell_path.is_empty():
		return {"path": PackedVector2Array(), "resolved_target": requested_world, "ok": false}

	var point_path := PackedVector2Array()
	for cell in cell_path:
		point_path.append(navigation_grid.get_point_position(cell))

	return {
		"path": point_path,
		"resolved_target": navigation_grid.get_point_position(destination_cell),
		"ok": true
	}

func _path_world_length(path: PackedVector2Array) -> float:
	var total := 0.0
	for i in range(1, path.size()):
		total += path[i - 1].distance_to(path[i])
	return total

func _run_navigation_self_tests() -> void:
	var passed := 0
	var total := 3
	var lines: Array[String] = []

	var kitchen := _compute_navigation_path(Vector2(315, 430), Vector2(315, 105))
	var kitchen_path: PackedVector2Array = kitchen["path"]
	var kitchen_detours: bool = kitchen["ok"] == true and _path_world_length(kitchen_path) > Vector2(315, 430).distance_to(Vector2(315, 105)) * 1.08
	if kitchen_detours:
		passed += 1
	lines.append("Cozinha:%s" % ("OK" if kitchen_detours else "FALHA"))

	var workshop := _compute_navigation_path(Vector2(920, 650), Vector2(920, 285))
	var workshop_path: PackedVector2Array = workshop["path"]
	var workshop_detours: bool = workshop["ok"] == true and _path_world_length(workshop_path) > Vector2(920, 650).distance_to(Vector2(920, 285)) * 1.08
	if workshop_detours:
		passed += 1
	lines.append("Oficina:%s" % ("OK" if workshop_detours else "FALHA"))

	var well := _compute_navigation_path(Vector2(640, 620), Vector2(640, 500))
	var well_path: PackedVector2Array = well["path"]
	var resolved_well: Vector2 = well["resolved_target"]
	var well_resolves: bool = well["ok"] == true and not navigation_grid.is_point_solid(_world_to_grid(resolved_well)) and resolved_well.distance_to(Vector2(640, 500)) > 20.0
	if well_resolves and not well_path.is_empty():
		passed += 1
	lines.append("Poço:%s" % ("OK" if well_resolves else "FALHA"))

	navigation_self_test_summary = "NAV %d/%d • %s" % [passed, total, " • ".join(PackedStringArray(lines))]
	print("[NAVTEST] ", navigation_self_test_summary)

func _create_navigation_debug_line() -> void:
	navigation_debug_line = Line2D.new()
	navigation_debug_line.width = 3.0
	navigation_debug_line.default_color = Color("#58d6ff")
	navigation_debug_line.visible = false
	navigation_debug_line.z_index = 20
	add_child(navigation_debug_line)

	npc_navigation_debug_line = Line2D.new()
	npc_navigation_debug_line.width = 2.0
	npc_navigation_debug_line.default_color = Color("#ffb454")
	npc_navigation_debug_line.visible = false
	npc_navigation_debug_line.z_index = 19
	add_child(npc_navigation_debug_line)

func _on_navigation_path_updated(path: PackedVector2Array, _resolved_target: Vector2) -> void:
	if navigation_debug_line == null:
		return
	navigation_debug_line.points = path
	navigation_debug_line.visible = navigation_debug_visible and not path.is_empty()

func _on_hanan_navigation_requested(world_position: Vector2) -> void:
	if hanan == null or not navigation_ready:
		return

	var result := _compute_navigation_path(hanan.global_position, world_position)
	var path: PackedVector2Array = result["path"]
	var resolved_target: Vector2 = result["resolved_target"]
	hanan.set_navigation_path(path, resolved_target)

func _on_hanan_navigation_path_updated(path: PackedVector2Array, _resolved_target: Vector2) -> void:
	if npc_navigation_debug_line == null:
		return
	npc_navigation_debug_line.points = path
	npc_navigation_debug_line.visible = navigation_debug_visible and not path.is_empty()

func _on_hanan_patrol_point_reached(index: int, world_position: Vector2) -> void:
	print("[NPCNAV] Hanan ponto ", index, " alcançado em ", world_position)

func _on_hanan_routine_changed(routine_id: String) -> void:
	print("[NPCRoutine] Hanan rotina ativa: ", routine_id)

func _on_hanan_activity_changed(activity_id: String) -> void:
	print("[ACTIVITY] Hanan estado: ", activity_id)

func _on_hanan_action_started(activity_id: String, routine_id: String, point_index: int, world_position: Vector2) -> void:
	print("[ACTION] Hanan iniciou ", activity_id, " / ", routine_id, " ponto ", point_index, " em ", world_position)

func _on_hanan_action_completed(activity_id: String, routine_id: String, point_index: int, world_position: Vector2) -> void:
	print("[ACTION] Hanan concluiu ", activity_id, " / ", routine_id, " ponto ", point_index, " em ", world_position)
	_apply_resource_effect("Hanan", routine_id, point_index)

func _build_ui() -> void:
	var canvas := CanvasLayer.new()
	add_child(canvas)

	var instructions := Label.new()
	instructions.text = "Clique: pathfinding • WASD/setas • E interagir • F3 rotas • F4 +6h • F5 salvar • F6 exportar • F9 carregar • F10 importar"
	instructions.position = Vector2(24, 675)
	instructions.add_theme_font_size_override("font_size", 14)
	instructions.add_theme_color_override("font_color", Color.WHITE)
	canvas.add_child(instructions)

	resource_label = Label.new()
	resource_label.position = Vector2(380, 18)
	resource_label.size = Vector2(690, 24)
	resource_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	resource_label.add_theme_font_size_override("font_size", 13)
	resource_label.add_theme_color_override("font_color", Color("#e8f0c4"))
	canvas.add_child(resource_label)
	_update_resource_ui()

	inventory_label = Label.new()
	inventory_label.position = Vector2(24, 48)
	inventory_label.size = Vector2(650, 22)
	inventory_label.add_theme_font_size_override("font_size", 12)
	inventory_label.add_theme_color_override("font_color", Color("#d9f4ff"))
	canvas.add_child(inventory_label)

	quest_label = Label.new()
	quest_label.position = Vector2(24, 72)
	quest_label.size = Vector2(650, 22)
	quest_label.add_theme_font_size_override("font_size", 12)
	quest_label.add_theme_color_override("font_color", Color("#f6dc86"))
	canvas.add_child(quest_label)
	_update_inventory_ui()

	save_status_label = Label.new()
	save_status_label.position = Vector2(24, 96)
	save_status_label.size = Vector2(650, 20)
	save_status_label.add_theme_font_size_override("font_size", 11)
	save_status_label.add_theme_color_override("font_color", Color("#b9d7a6"))
	save_status_label.text = "Save: Manual F5/F9 • Autosave independente"
	canvas.add_child(save_status_label)

	clock_label = Label.new()
	clock_label.position = Vector2(1090, 18)
	clock_label.add_theme_font_size_override("font_size", 17)
	clock_label.add_theme_color_override("font_color", Color("#f4df9c"))
	canvas.add_child(clock_label)

	routine_label = Label.new()
	routine_label.position = Vector2(865, 46)
	routine_label.size = Vector2(385, 70)
	routine_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	routine_label.add_theme_font_size_override("font_size", 12)
	routine_label.add_theme_color_override("font_color", Color("#f0c97a"))
	canvas.add_child(routine_label)

	navigation_debug_label = Label.new()
	navigation_debug_label.text = "%s • %s • %s • %s • %s • %s • %s" % [navigation_self_test_summary, routine_self_test_summary, behavior_self_test_summary, economy_self_test_summary, quest_self_test_summary, save_self_test_summary, portable_self_test_summary]
	navigation_debug_label.position = Vector2(24, 642)
	navigation_debug_label.add_theme_font_size_override("font_size", 13)
	navigation_debug_label.add_theme_color_override("font_color", Color("#7ee0ff"))
	navigation_debug_label.visible = navigation_debug_visible
	canvas.add_child(navigation_debug_label)

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
	player.navigation_requested.connect(_on_navigation_requested)
	player.navigation_path_updated.connect(_on_navigation_path_updated)
	player.destination_changed.connect(_on_destination_changed)
	player.destination_reached.connect(_on_destination_reached)
	player.destination_failed.connect(_on_destination_failed)
	add_child(player)

func _spawn_hanan() -> void:
	hanan = NpcScript.new()
	hanan.name = "Hanan"
	hanan.npc_name = "Hanan"
	hanan.global_position = Vector2(465, 360)
	hanan.navigation_requested.connect(_on_hanan_navigation_requested)
	hanan.navigation_path_updated.connect(_on_hanan_navigation_path_updated)
	hanan.patrol_point_reached.connect(_on_hanan_patrol_point_reached)
	hanan.routine_changed.connect(_on_hanan_routine_changed)
	hanan.activity_changed.connect(_on_hanan_activity_changed)
	hanan.action_started.connect(_on_hanan_action_started)
	hanan.action_completed.connect(_on_hanan_action_completed)
	add_child(hanan)
	registered_npcs["Hanan"] = hanan

	var label := Label.new()
	label.text = "Hanan"
	label.position = Vector2(-23, 45)
	label.add_theme_font_size_override("font_size", 12)
	hanan.add_child(label)

func _spawn_additional_npcs() -> void:
	eliabe = _spawn_scheduled_npc("Eliabe", Vector2(1120, 590))
	miria = _spawn_scheduled_npc("Miriã", Vector2(900, 220))

func _spawn_scheduled_npc(npc_name: String, start_position: Vector2) -> PrototypeNPC:
	var npc: PrototypeNPC = NpcScript.new()
	npc.name = npc_name
	npc.npc_name = npc_name
	npc.global_position = start_position
	npc.navigation_requested.connect(_on_registered_npc_navigation_requested.bind(npc_name))
	npc.patrol_point_reached.connect(_on_registered_npc_patrol_point_reached.bind(npc_name))
	npc.routine_changed.connect(_on_registered_npc_routine_changed.bind(npc_name))
	npc.activity_changed.connect(_on_registered_npc_activity_changed.bind(npc_name))
	npc.action_started.connect(_on_registered_npc_action_started.bind(npc_name))
	npc.action_completed.connect(_on_registered_npc_action_completed.bind(npc_name))
	add_child(npc)
	registered_npcs[npc_name] = npc

	var label := Label.new()
	label.text = npc_name
	label.position = Vector2(-26, 45)
	label.add_theme_font_size_override("font_size", 12)
	npc.add_child(label)
	return npc

func _on_registered_npc_navigation_requested(world_position: Vector2, npc_name: String) -> void:
	if not navigation_ready or not registered_npcs.has(npc_name):
		return
	var npc: PrototypeNPC = registered_npcs[npc_name]
	var result := _compute_navigation_path(npc.global_position, world_position)
	var path: PackedVector2Array = result["path"]
	var resolved_target: Vector2 = result["resolved_target"]
	npc.set_navigation_path(path, resolved_target)

func _on_registered_npc_patrol_point_reached(index: int, world_position: Vector2, npc_name: String) -> void:
	print("[NPCNAV] ", npc_name, " ponto ", index, " alcançado em ", world_position)

func _on_registered_npc_routine_changed(routine_id: String, npc_name: String) -> void:
	print("[NPCRoutine] ", npc_name, " rotina ativa: ", routine_id)

func _on_registered_npc_activity_changed(activity_id: String, npc_name: String) -> void:
	print("[ACTIVITY] ", npc_name, " estado: ", activity_id)

func _on_registered_npc_action_started(activity_id: String, routine_id: String, point_index: int, world_position: Vector2, npc_name: String) -> void:
	print("[ACTION] ", npc_name, " iniciou ", activity_id, " / ", routine_id, " ponto ", point_index, " em ", world_position)

func _on_registered_npc_action_completed(activity_id: String, routine_id: String, point_index: int, world_position: Vector2, npc_name: String) -> void:
	print("[ACTION] ", npc_name, " concluiu ", activity_id, " / ", routine_id, " ponto ", point_index, " em ", world_position)
	_apply_resource_effect(npc_name, routine_id, point_index)

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

func _on_navigation_requested(world_position: Vector2) -> void:
	if not navigation_ready or player == null:
		return

	var result := _compute_navigation_path(player.global_position, world_position)
	var path: PackedVector2Array = result["path"]
	var resolved_target: Vector2 = result["resolved_target"]
	player.set_navigation_path(path, resolved_target)

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
	_open_npc_dialogue(hanan, "Hanan — %s — %s" % [_format_game_time(), _activity_display_name(String(current_npc_activities.get("Hanan", "wait")))])

	if not _quest_is_completed(FIRST_QUEST_ID) and active_quest_id == "":
		var definition := _get_quest_definition(FIRST_QUEST_ID)
		if _start_quest(FIRST_QUEST_ID):
			dialogue_text.text = String(definition.get("start_text", "Uma nova missão foi iniciada."))
	elif active_quest_id == FIRST_QUEST_ID:
		var requirements := _quest_requirements(FIRST_QUEST_ID)
		if _inventory_has_requirements(player_inventory, requirements):
			if _deliver_quest_resources(FIRST_QUEST_ID):
				var definition := _get_quest_definition(FIRST_QUEST_ID)
				dialogue_text.text = String(definition.get("complete_text", "Missão concluída."))
		else:
			dialogue_text.text = "Ainda precisamos dos recursos. %s" % _quest_progress_text()
	elif _quest_is_completed(FIRST_QUEST_ID):
		dialogue_text.text = "A Água já foi entregue. Continue ajudando o acampamento conforme as necessidades surgirem."
	else:
		dialogue_text.text = "Conclua a missão ativa antes de iniciar outra tarefa."

func _interact_with_eliabe() -> void:
	_open_npc_dialogue(eliabe, "Eliabe — %s — %s" % [_format_game_time(), _activity_display_name(String(current_npc_activities.get("Eliabe", "wait")))])

	var quest_id := _next_available_quest_for_giver("Eliabe")
	if quest_id == SECOND_QUEST_ID and active_quest_id == "":
		var definition := _get_quest_definition(SECOND_QUEST_ID)
		if _start_quest(SECOND_QUEST_ID):
			dialogue_text.text = String(definition.get("start_text", "Uma nova missão foi iniciada."))
	elif active_quest_id == SECOND_QUEST_ID:
		var requirements := _quest_requirements(SECOND_QUEST_ID)
		if _inventory_has_requirements(player_inventory, requirements):
			if _deliver_quest_resources(SECOND_QUEST_ID):
				var definition := _get_quest_definition(SECOND_QUEST_ID)
				dialogue_text.text = String(definition.get("complete_text", "Missão concluída."))
		else:
			dialogue_text.text = "Ainda precisamos dos recursos. %s" % _quest_progress_text()
	elif not _quest_is_completed(FIRST_QUEST_ID):
		dialogue_text.text = "Hanan ainda precisa de sua ajuda na Cozinha. Conclua essa tarefa primeiro."
	elif _quest_is_completed(SECOND_QUEST_ID):
		dialogue_text.text = "A Lenha já foi entregue. A Oficina está abastecida."
	else:
		dialogue_text.text = "Conclua a missão ativa antes de iniciar outra tarefa."

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

func _create_resource_pile(center: Vector2, label_text: String) -> void:
	var visual := Polygon2D.new()
	visual.position = center
	visual.polygon = PackedVector2Array([
		Vector2(-34, 18), Vector2(-22, -12), Vector2(0, -22),
		Vector2(24, -10), Vector2(36, 18)
	])
	visual.color = Color("#7a4c2c")
	add_child(visual)

	var label := Label.new()
	label.text = label_text
	label.position = center + Vector2(-46, -50)
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", Color("#3c2a1b"))
	add_child(label)

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
