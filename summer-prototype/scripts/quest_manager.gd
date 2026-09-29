extends Node
class_name M1QuestManager

signal changed(reason: String)

const ORDER := ["camp_intro", "water_kitchen", "wood_workshop", "meal_prep", "flock_care", "center_service", "dusk_return", "earned_rest", "new_day"]
const DEFINITIONS := {
	"camp_intro": {"title": "Conhecendo o Acampamento de Judá", "giver": "Ancião", "location": "Centro", "objectives": [
		{"type": "visit", "target": "kitchen", "count": 1, "text": "Visite a Cozinha"},
		{"type": "visit", "target": "workshop", "count": 1, "text": "Visite a Oficina"},
		{"type": "visit", "target": "well", "count": 1, "text": "Visite o Poço"},
		{"type": "visit", "target": "tent", "count": 1, "text": "Visite sua Tenda"}
	]},
	"water_kitchen": {"title": "Água para a Cozinha", "giver": "Hanan", "location": "Poço / Cozinha", "objectives": [
		{"type": "collect", "target": "agua", "count": 2, "text": "Recolha 2 Águas no Poço"},
		{"type": "deliver", "target": "agua", "count": 2, "text": "Entregue 2 Águas a Hanan"}
	]},
	"wood_workshop": {"title": "Lenha para a Oficina", "giver": "Eliabe", "location": "Coleta / Oficina", "objectives": [
		{"type": "collect", "target": "lenha", "count": 3, "text": "Recolha 3 Lenhas"},
		{"type": "deliver", "target": "lenha", "count": 3, "text": "Entregue 3 Lenhas a Eliabe"}
	]},
	"meal_prep": {"title": "Preparativos da Refeição", "giver": "Miriã", "location": "Cozinha", "objectives": [
		{"type": "inspect", "target": "kitchen", "count": 1, "text": "Inspecione a Cozinha"},
		{"type": "stock", "target": "kitchen", "count": 1, "text": "Garanta Água e Lenha no estoque"},
		{"type": "eat", "target": "meal", "count": 1, "text": "Receba e coma uma refeição"}
	]},
	"flock_care": {"title": "Cuidado do Rebanho", "giver": "Pastor", "location": "Curral", "objectives": [
		{"type": "inspect", "target": "flock_a", "count": 1, "text": "Conte o primeiro grupo do rebanho"},
		{"type": "inspect", "target": "flock_b", "count": 1, "text": "Conte o segundo grupo do rebanho"},
		{"type": "inspect", "target": "flock_c", "count": 1, "text": "Conte o terceiro grupo do rebanho"}
	]},
	"center_service": {"title": "Serviço no Centro", "giver": "Ancião", "location": "Centro / Tenda do Estandarte", "objectives": [
		{"type": "visit", "target": "service_center", "count": 1, "text": "Visite o Centro entre 12:00 e 18:00"},
		{"type": "talk", "target": "Hanan", "count": 1, "text": "Fale com Hanan"},
		{"type": "talk", "target": "Miriã", "count": 1, "text": "Fale com Miriã"}
	]},
	"dusk_return": {"title": "Recolher ao Entardecer", "giver": "Pastor", "location": "Curral", "objectives": [
		{"type": "inspect", "target": "corral", "count": 1, "text": "Inspecione o Curral"},
		{"type": "inspect", "target": "flock_a", "count": 1, "text": "Confira o rebanho"}
	]},
	"earned_rest": {"title": "Descanso Merecido", "giver": "Tenda", "location": "Tenda do Jogador", "objectives": [
		{"type": "visit", "target": "tent", "count": 1, "text": "Volte à sua Tenda"},
		{"type": "sleep", "target": "bed", "count": 1, "text": "Durma até a manhã"}
	]},
	"new_day": {"title": "Um Novo Dia", "giver": "Ancião", "location": "Centro", "objectives": [
		{"type": "talk", "target": "Ancião", "count": 1, "text": "Fale com o Ancião na nova manhã"}
	]}
}

var active_id: String = ""
var completed: Dictionary = {}
var progress: Dictionary = {}

func new_game() -> void:
	active_id = ""
	completed.clear()
	progress.clear()
	changed.emit("new_game")

func definition(quest_id: String) -> Dictionary:
	return DEFINITIONS.get(quest_id, {})

func state(quest_id: String, day: int = 1, minutes: float = 360.0) -> String:
	if bool(completed.get(quest_id, false)):
		return "completed"
	if active_id == quest_id:
		return "ready_to_turn_in" if ready_to_turn_in() else "active"
	if active_id != "":
		return "locked"
	var index: int = ORDER.find(quest_id)
	if index < 0 or (index > 0 and not bool(completed.get(ORDER[index - 1], false))):
		return "locked"
	if quest_id == "dusk_return" and (minutes < 1020.0 or minutes >= 1260.0):
		return "locked"
	if quest_id == "new_day" and day < 2:
		return "locked"
	return "available"

func next_available(day: int, minutes: float) -> String:
	for quest_id in ORDER:
		if state(quest_id, day, minutes) == "available":
			return quest_id
	return ""

func start_for(giver: String, day: int, minutes: float) -> String:
	var quest_id: String = next_available(day, minutes)
	if quest_id == "" or String(definition(quest_id).get("giver", "")) != giver:
		return ""
	active_id = quest_id
	progress[quest_id] = {}
	print("[QUEST] Iniciada: ", definition(quest_id).get("title", quest_id))
	changed.emit("quest_start")
	return quest_id

func record_event(event_type: String, target: String, amount: int = 1, minutes: float = 360.0) -> bool:
	if active_id == "":
		return false
	if event_type == "visit" and target == "service_center" and (minutes < 720.0 or minutes >= 1080.0):
		return false
	var objectives: Array = definition(active_id).get("objectives", [])
	var counts: Dictionary = progress.get(active_id, {})
	var changed_any: bool = false
	for index in objectives.size():
		var objective: Dictionary = objectives[index]
		if String(objective.get("type", "")) != event_type or String(objective.get("target", "")) != target:
			continue
		var previous: int = int(counts.get(str(index), 0))
		var updated: int = mini(int(objective.get("count", 1)), previous + amount)
		if updated > previous:
			counts[str(index)] = updated
			changed_any = true
	if changed_any:
		progress[active_id] = counts
		changed.emit("quest_progress")
		if active_id == "earned_rest" and _all_objectives_done(active_id):
			complete_active()
	return changed_any

func ready_to_turn_in() -> bool:
	if active_id == "":
		return false
	var objectives: Array = definition(active_id).get("objectives", [])
	var counts: Dictionary = progress.get(active_id, {})
	for index in objectives.size():
		var objective: Dictionary = objectives[index]
		if String(objective.get("type", "")) == "deliver":
			continue
		if int(counts.get(str(index), 0)) < int(objective.get("count", 1)):
			return false
	return true

func _all_objectives_done(quest_id: String) -> bool:
	var objectives: Array = definition(quest_id).get("objectives", [])
	var counts: Dictionary = progress.get(quest_id, {})
	for index in objectives.size():
		if int(counts.get(str(index), 0)) < int(objectives[index].get("count", 1)):
			return false
	return true

func talk_to(giver: String, inventory: Node, day: int, minutes: float) -> String:
	if active_id == "":
		var started: String = start_for(giver, day, minutes)
		if started == "":
			return "%s não tem uma nova tarefa agora." % giver
		if started == "new_day":
			record_event("talk", "Ancião", 1, minutes)
			complete_active()
			return "Um Novo Dia. O primeiro capítulo foi concluído; o acampamento segue em frente."
		return "Nova missão: %s. %s" % [definition(started)["title"], current_objective_text()]

	var quest_id: String = active_id
	if giver != String(definition(quest_id).get("giver", "")):
		if record_event("talk", giver, 1, minutes):
			return "%s conversou com você. %s" % [giver, current_objective_text()]
		return "%s continua sua rotina. %s" % [giver, current_objective_text()]
	if not ready_to_turn_in():
		return "Ainda há tarefas pendentes. %s" % current_objective_text()
	if quest_id == "dusk_return" and minutes >= 1260.0:
		return "Já é noite. Confira o Curral no próximo entardecer."
	var requirements: Dictionary = {}
	for objective in definition(quest_id).get("objectives", []):
		if String(objective.get("type", "")) == "deliver":
			requirements[String(objective["target"])] = int(objective["count"])
	if not requirements.is_empty():
		var delivery: Dictionary = inventory.deliver(requirements)
		if not bool(delivery.get("ok", false)):
			return "A Bolsa ainda não contém os recursos necessários. %s" % current_objective_text()
		for resource_id in delivery["split"].keys():
			var part: Dictionary = delivery["split"][resource_id]
			print("[QUESTRESOURCE] ", resource_id, " entregue=", part["delivered"], " armazenado=", part["stored"], " consumido_na_missao=", part["consumed"])
		record_event("deliver", String(requirements.keys()[0]), int(requirements.values()[0]), minutes)
	complete_active()
	return "%s concluída." % definition(quest_id)["title"]

func complete_active() -> bool:
	if active_id == "":
		return false
	var quest_id: String = active_id
	completed[quest_id] = true
	active_id = ""
	print("[QUEST] Concluída: ", definition(quest_id).get("title", quest_id))
	changed.emit("quest_complete")
	return true

func current_objective_text() -> String:
	if active_id == "":
		var next_id: String = next_available(1, 720.0)
		return "Fale com %s" % String(definition(next_id).get("giver", "Ancião")) if next_id != "" else "Explore o acampamento"
	var objectives: Array = definition(active_id).get("objectives", [])
	var counts: Dictionary = progress.get(active_id, {})
	for index in objectives.size():
		var objective: Dictionary = objectives[index]
		var count: int = int(counts.get(str(index), 0))
		var required: int = int(objective.get("count", 1))
		if count < required:
			return "%s (%d/%d)" % [objective.get("text", "Objetivo"), count, required]
	return "Volte a %s" % definition(active_id).get("giver", "Ancião")

func journal_text(completed_tab: bool = false) -> String:
	var lines: Array[String] = []
	for quest_id in ORDER:
		var quest_state: String = state(quest_id)
		if completed_tab and quest_state == "completed":
			lines.append("✓ %s" % definition(quest_id)["title"])
		elif not completed_tab and quest_id == active_id:
			lines.append("%s — %s" % [definition(quest_id)["title"], definition(quest_id)["location"]])
			var objectives: Array = definition(quest_id)["objectives"]
			var counts: Dictionary = progress.get(quest_id, {})
			for index in objectives.size():
				var objective: Dictionary = objectives[index]
				lines.append("• %s %d/%d" % [objective["text"], int(counts.get(str(index), 0)), int(objective["count"])])
	if lines.is_empty():
		return "Nenhuma missão nesta aba."
	return "\n".join(PackedStringArray(lines))

func snapshot() -> Dictionary:
	return {"active_quest_id": active_id, "completed_quest_ids": completed.duplicate(true), "quest_progress": progress.duplicate(true)}

func restore(data: Dictionary) -> bool:
	var next_active: String = String(data.get("active_quest_id", ""))
	if next_active != "" and not DEFINITIONS.has(next_active):
		return false
	var next_completed: Dictionary = data.get("completed_quest_ids", {})
	if not (next_completed is Dictionary):
		return false
	var next_progress: Dictionary = data.get("quest_progress", {})
	if not (next_progress is Dictionary):
		return false
	active_id = next_active
	completed.clear()
	completed.merge(next_completed.duplicate(true))
	progress.clear()
	progress.merge(next_progress.duplicate(true))
	if not data.has("quest_progress") and (active_id in ["water_kitchen", "wood_workshop"] or not completed.is_empty()):
		completed["camp_intro"] = true
	changed.emit("load")
	return true
