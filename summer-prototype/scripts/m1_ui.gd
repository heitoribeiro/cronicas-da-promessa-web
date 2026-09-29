extends CanvasLayer
class_name M1UI

signal action_requested(action: String)
signal chest_requested(resource_id: String, to_chest: bool)

var overlay: Control
var shade: ColorRect
var panel: PanelContainer
var column: VBoxContainer
var hud_buttons: HBoxContainer
var current_page: String = ""

func _ready() -> void:
	overlay = Control.new()
	overlay.name = "Overlay"
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(overlay)
	shade = ColorRect.new()
	shade.color = Color(0.08, 0.07, 0.05, 0.83)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(center)
	panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(600, 300)
	center.add_child(panel)
	var margin := MarginContainer.new()
	for side in ["left", "top", "right", "bottom"]:
		margin.add_theme_constant_override("margin_%s" % side, 24)
	panel.add_child(margin)
	column = VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)
	overlay.visible = false

	hud_buttons = HBoxContainer.new()
	hud_buttons.name = "MenuButtons"
	hud_buttons.position = Vector2(918, 120)
	hud_buttons.add_theme_constant_override("separation", 4)
	add_child(hud_buttons)
	for item in [
		{"label": "Diário [J]", "action": "journal"},
		{"label": "Bolsa [I]", "action": "inventory"},
		{"label": "Mapa [M]", "action": "map"},
		{"label": "Menu [Esc]", "action": "pause"}
	]:
		var button := Button.new()
		button.text = String(item["label"])
		var action_id: String = String(item["action"])
		button.pressed.connect(func() -> void: action_requested.emit(action_id))
		hud_buttons.add_child(button)

func is_open() -> bool:
	return overlay.visible

func close() -> void:
	overlay.visible = false
	current_page = ""
	hud_buttons.visible = true

func _show_page(page_id: String, title: String, description: String, actions: Array) -> void:
	current_page = page_id
	overlay.visible = true
	hud_buttons.visible = page_id != "main_menu"
	for child in column.get_children():
		child.queue_free()
	var heading := Label.new()
	heading.text = title
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	heading.add_theme_font_size_override("font_size", 27)
	heading.add_theme_color_override("font_color", Color("#e9c981"))
	column.add_child(heading)
	var body := Label.new()
	body.text = description
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.custom_minimum_size = Vector2(550, 80)
	body.add_theme_font_size_override("font_size", 16)
	column.add_child(body)
	for item in actions:
		var button := Button.new()
		button.text = String(item.get("label", "Ação"))
		button.disabled = bool(item.get("disabled", false))
		var action_id: String = String(item.get("id", ""))
		button.pressed.connect(func() -> void: action_requested.emit(action_id))
		column.add_child(button)

func show_main_menu(has_save: bool) -> void:
	_show_page("main_menu", "CRÔNICAS DA PROMESSA", "Primeiro Dia em Judá\nTina chega ao acampamento. Escolha como começar.", [
		{"id": "new_game", "label": "Novo Jogo"},
		{"id": "continue", "label": "Continuar", "disabled": not has_save},
		{"id": "import", "label": "Importar Save"},
		{"id": "settings", "label": "Configurações"}
	])

func show_new_game_confirmation() -> void:
	_show_page("confirm_new", "Começar de novo?", "Há progresso salvo. Novo Jogo inicia uma jornada nova; o save manual só será substituído quando você salvar novamente.", [
		{"id": "confirm_new_game", "label": "Sim, começar"},
		{"id": "main_menu", "label": "Cancelar"}
	])

func show_briefing() -> void:
	_show_page("briefing", "Primeira manhã em Judá", "Tina chegou ao acampamento. Fale com o Ancião no centro para conhecer as tarefas. Caminhe com WASD/setas ou clique no terreno; E ou clique no aviso para interagir.", [
		{"id": "resume", "label": "Começar o dia"}
	])

func show_pause() -> void:
	_show_page("pause", "Pausa", "Dia e progresso permanecem seguros enquanto este menu estiver aberto.", [
		{"id": "resume", "label": "Retomar"},
		{"id": "journal", "label": "Diário"},
		{"id": "inventory", "label": "Bolsa / Baú"},
		{"id": "map", "label": "Mapa"},
		{"id": "save", "label": "Salvar Agora"},
		{"id": "export", "label": "Exportar Save"},
		{"id": "settings", "label": "Configurações"},
		{"id": "main_menu", "label": "Menu Principal"}
	])

func show_journal(active_text: String, completed_text: String, completed_tab: bool = false) -> void:
	var description: String = completed_text if completed_tab else active_text
	_show_page("journal", "Diário de Missões", description, [
		{"id": "journal_active", "label": "Ativas"},
		{"id": "journal_completed", "label": "Concluídas"},
		{"id": "resume", "label": "Fechar"}
	])

func show_inventory(bag: Dictionary, chest: Dictionary, chest_open: bool) -> void:
	var lines: Array[String] = []
	for resource_id in ["agua", "lenha", "materiais", "refeicoes"]:
		lines.append("%s — Bolsa %d/8 • Baú %d/16" % [resource_id.capitalize(), int(bag.get(resource_id, 0)), int(chest.get(resource_id, 0))])
	_show_page("inventory", "Bolsa e Baú", "\n".join(PackedStringArray(lines)) + "\nItens de missão ficam protegidos.", [
		{"id": "resume", "label": "Fechar"}
	])
	if chest_open:
		for resource_id in ["agua", "lenha", "materiais", "refeicoes"]:
			var row := HBoxContainer.new()
			var label := Label.new()
			label.text = resource_id.capitalize()
			label.custom_minimum_size = Vector2(130, 26)
			row.add_child(label)
			for to_chest in [true, false]:
				var button := Button.new()
				button.text = "Depositar 1" if to_chest else "Retirar 1"
				var resource_copy: String = resource_id
				var direction_copy: bool = to_chest
				button.pressed.connect(func() -> void: chest_requested.emit(resource_copy, direction_copy))
				row.add_child(button)
			column.add_child(row)

func show_map(scene_name: String) -> void:
	_show_page("map", "Mapa de Judá", "Local atual: %s\n\nCentro: Ancião e Tenda do Estandarte\nOeste: Curral e Rebanho\nNorte: Cozinha e Tenda do Jogador\nLeste: Oficina e Coleta de Lenha\nSul: Poço" % scene_name, [
		{"id": "resume", "label": "Fechar"}
	])

func show_settings(debug_visible: bool) -> void:
	_show_page("settings", "Configurações", "Controles: WASD/setas, clique, E, J, I, M, Esc.\nPainel técnico: %s" % ["visível" if debug_visible else "oculto"], [
		{"id": "toggle_debug", "label": "Alternar painel técnico"},
		{"id": "pause", "label": "Voltar"}
	])

func show_chapter_summary(day: int) -> void:
	_show_page("chapter", "CAPÍTULO 1 CONCLUÍDO", "Um Novo Dia — Tina despertou para o dia %d. As nove tarefas do primeiro capítulo foram concluídas. O modo livre está disponível; o próximo capítulo virá depois." % day, [
		{"id": "resume", "label": "Continuar em modo livre"},
		{"id": "save", "label": "Salvar Progresso"}
	])
