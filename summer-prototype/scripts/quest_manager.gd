extends Node
class_name M1QuestManager

signal changed(reason: String)

var active_id: String = ""
var completed: Dictionary = {}
var progress: Dictionary = {}
var last_completed_id: String = ""
var content_db: Node
var definitions: Dictionary = {}
var order: Array[String] = []

func configure(database: Node) -> void:
	content_db = database
	definitions.clear()
	order.clear()
	var ordered: Array[Dictionary] = content_db.all("quest")
	ordered.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return int(a.get("order", 0)) < int(b.get("order", 0)))
	for quest in ordered:
		var quest_id := String(quest.get("id", ""))
		definitions[quest_id] = quest
		order.append(quest_id)

func new_game() -> void:
	active_id = ""
	completed.clear()
	progress.clear()
	last_completed_id = ""
	changed.emit("new_game")

func definition(quest_id: String) -> Dictionary:
	return definitions.get(quest_id, {})

func state(quest_id: String, day: int = 1, minutes: float = 360.0) -> String:
	if bool(completed.get(quest_id, false)):
		return "completed"
	if active_id == quest_id:
		return "ready_to_turn_in" if ready_to_turn_in() else "active"
	if active_id != "":
		return "locked"
	var index: int = order.find(quest_id)
	if index < 0:
		return "locked"
	for prerequisite in definition(quest_id).get("prerequisites", []):
		if not bool(completed.get(String(prerequisite), false)):
			return "locked"
	var available_time: Dictionary = definition(quest_id).get("available_time", {})
	if not available_time.is_empty() and (minutes < float(available_time.get("start", 0)) or minutes >= float(available_time.get("end", 1440))):
		return "locked"
	if day < int(definition(quest_id).get("min_day", 1)):
		return "locked"
	return "available"

func next_available(day: int, minutes: float) -> String:
	for quest_id in order:
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
	var objectives: Array = definition(active_id).get("objectives", [])
	var counts: Dictionary = progress.get(active_id, {})
	var changed_any: bool = false
	for index in objectives.size():
		var objective: Dictionary = objectives[index]
		if String(objective.get("type", "")) != event_type or String(objective.get("target", "")) != target:
			continue
		if objective.has("time_start") and (minutes < float(objective.get("time_start", 0)) or minutes >= float(objective.get("time_end", 1440))):
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
	last_completed_id = quest_id
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
	for quest_id in order:
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
	return {"active_quest_id": active_id, "completed_quest_ids": completed.duplicate(true), "quest_progress": progress.duplicate(true), "quest_objectives": progress.duplicate(true)}

func restore(data: Dictionary) -> bool:
	var next_active: String = String(data.get("active_quest_id", ""))
	if next_active != "" and not definitions.has(next_active):
		return false
	var next_completed: Dictionary = data.get("completed_quest_ids", {})
	if not (next_completed is Dictionary):
		return false
	var next_progress: Dictionary = data.get("quest_objectives", data.get("quest_progress", {}))
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
