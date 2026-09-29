extends Node
class_name RelationshipManager

signal changed(reason: String)

const MIN_AFFINITY: int = -100
const MAX_AFFINITY: int = 100

var content_db: Node
var affinity: Dictionary = {}
var reputation: Dictionary = {}

func configure(database: Node) -> void:
	content_db = database
	new_game()

func new_game() -> void:
	affinity.clear()
	reputation.clear()
	for relationship in content_db.all("relationship"):
		var tribe_id := String(relationship.get("tribe_id", ""))
		reputation[tribe_id] = int(relationship.get("initial_reputation", 0))
		for npc_id in relationship.get("npc_ids", []):
			affinity[String(npc_id)] = int(relationship.get("initial_affinity", 0))
	changed.emit("new_game")

func add_affinity(npc_id: String, amount: int, reason: String = "reward") -> int:
	if not content_db.has("npc", npc_id):
		return 0
	var before := int(affinity.get(npc_id, 0))
	var after := clampi(before + amount, MIN_AFFINITY, MAX_AFFINITY)
	affinity[npc_id] = after
	if after != before:
		print("[RELATIONSHIP] ", npc_id, " ", "%+d" % (after - before), " • ", reason)
		changed.emit("affinity")
	return after - before

func add_reputation(tribe_id: String, amount: int, reason: String = "reward") -> int:
	var before := int(reputation.get(tribe_id, 0))
	var after := clampi(before + amount, MIN_AFFINITY, MAX_AFFINITY)
	reputation[tribe_id] = after
	if after != before:
		print("[REPUTATION] ", tribe_id, " ", "%+d" % (after - before), " • ", reason)
		changed.emit("reputation")
	return after - before

func apply_rewards(rewards: Dictionary, reason: String) -> void:
	for npc_id in Dictionary(rewards.get("affinity", {})).keys():
		add_affinity(String(npc_id), int(rewards["affinity"][npc_id]), reason)
	for tribe_id in Dictionary(rewards.get("reputation", {})).keys():
		add_reputation(String(tribe_id), int(rewards["reputation"][tribe_id]), reason)

func affinity_for(npc_id: String) -> int:
	return int(affinity.get(npc_id, 0))

func level_for(npc_id: String) -> String:
	var value := affinity_for(npc_id)
	if value >= 25: return "confiança"
	if value >= 10: return "amizade"
	if value >= 1: return "simpatia"
	if value <= -10: return "tensão"
	return "conhecido"

func snapshot() -> Dictionary:
	return {"relationships": affinity.duplicate(true), "reputation": reputation.duplicate(true)}

func restore(data: Dictionary) -> bool:
	if not (data.get("relationships", {}) is Dictionary) or not (data.get("reputation", {}) is Dictionary):
		return false
	for npc_id in affinity.keys():
		affinity[npc_id] = clampi(int(data.get("relationships", {}).get(npc_id, 0)), MIN_AFFINITY, MAX_AFFINITY)
	for tribe_id in reputation.keys():
		reputation[tribe_id] = clampi(int(data.get("reputation", {}).get(tribe_id, 0)), MIN_AFFINITY, MAX_AFFINITY)
	changed.emit("load")
	return true
