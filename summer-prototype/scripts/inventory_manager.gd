extends Node
class_name M1InventoryManager

const BAG_CAP: int = 8
const CAMP_CAP: int = 20
const CHEST_CAP: int = 16
const RESOURCE_IDS: Array[String] = ["agua", "lenha", "materiais", "refeicoes"]

var bag: Dictionary = {}
var camp: Dictionary = {}
var chest: Dictionary = {}
var mission_items: Dictionary = {}
var content_db: Node

func _init() -> void:
	new_game()

func configure(database: Node) -> void:
	content_db = database
	new_game()

func new_game() -> void:
	bag.clear()
	camp.clear()
	chest.clear()
	mission_items.clear()
	for resource_id in RESOURCE_IDS:
		bag[resource_id] = 0
		chest[resource_id] = 0
		camp[resource_id] = 4 if resource_id in ["agua", "lenha"] else 0

func add_bag(resource_id: String, amount: int) -> int:
	if not resource_id in RESOURCE_IDS or amount < 0:
		return 0
	var previous: int = int(bag.get(resource_id, 0))
	var updated: int = clampi(previous + amount, 0, _bag_cap(resource_id))
	bag[resource_id] = updated
	return updated - previous

func can_pay(requirements: Dictionary) -> bool:
	for resource_key in requirements.keys():
		if int(bag.get(String(resource_key), 0)) < int(requirements[resource_key]):
			return false
	return true

func deliver(requirements: Dictionary) -> Dictionary:
	if not can_pay(requirements):
		return {"ok": false, "split": {}}
	var split: Dictionary = {}
	for resource_key in requirements.keys():
		var resource_id: String = String(resource_key)
		var amount: int = int(requirements[resource_key])
		var stored: int = mini(amount, maxi(0, _camp_cap(resource_id) - int(camp.get(resource_id, 0))))
		bag[resource_id] = int(bag[resource_id]) - amount
		camp[resource_id] = int(camp.get(resource_id, 0)) + stored
		split[resource_id] = {"delivered": amount, "stored": stored, "consumed": amount - stored}
	return {"ok": true, "split": split}

func apply_camp_effect(effect: Dictionary) -> bool:
	for resource_key in effect.keys():
		var resource_id: String = String(resource_key)
		if int(camp.get(resource_id, 0)) + int(effect[resource_key]) < 0:
			return false
	for resource_key in effect.keys():
		var resource_id: String = String(resource_key)
		camp[resource_id] = clampi(int(camp.get(resource_id, 0)) + int(effect[resource_key]), 0, _camp_cap(resource_id))
	return true

func transfer(resource_id: String, to_chest: bool) -> bool:
	if not resource_id in RESOURCE_IDS or not is_transferable(resource_id):
		return false
	var source: Dictionary = bag if to_chest else chest
	var destination: Dictionary = chest if to_chest else bag
	var cap: int = CHEST_CAP if to_chest else BAG_CAP
	if int(source.get(resource_id, 0)) <= 0 or int(destination.get(resource_id, 0)) >= cap:
		return false
	source[resource_id] = int(source[resource_id]) - 1
	destination[resource_id] = int(destination[resource_id]) + 1
	return true

func take_meal() -> bool:
	if int(bag.get("refeicoes", 0)) > 0:
		bag["refeicoes"] = int(bag["refeicoes"]) - 1
		return true
	if int(camp.get("refeicoes", 0)) > 0:
		camp["refeicoes"] = int(camp["refeicoes"]) - 1
		return true
	if int(camp.get("agua", 0)) > 0 and int(camp.get("lenha", 0)) > 0:
		camp["agua"] = int(camp["agua"]) - 1
		camp["lenha"] = int(camp["lenha"]) - 1
		return true
	return false

func item_definition(item_id: String) -> Dictionary:
	if content_db != null:
		return content_db.get_item(item_id)
	return {}

func is_transferable(item_id: String) -> bool:
	var definition := item_definition(item_id)
	return bool(definition.get("transferable", true))

func item_effects(item_id: String) -> Dictionary:
	return Dictionary(item_definition(item_id).get("effects", {})).duplicate(true)

func consume_bag(item_id: String) -> Dictionary:
	var definition := item_definition(item_id)
	if not bool(definition.get("consumable", false)) or int(bag.get(item_id, 0)) <= 0:
		return {}
	bag[item_id] = int(bag[item_id]) - 1
	return item_effects(item_id)

func _bag_cap(item_id: String) -> int:
	var definition := item_definition(item_id)
	return maxi(1, int(definition.get("stack_max", BAG_CAP)))

func _camp_cap(item_id: String) -> int:
	var definition := item_definition(item_id)
	return maxi(0, int(definition.get("camp_stack_max", CAMP_CAP)))

func snapshot() -> Dictionary:
	return {
		"player_inventory": bag.duplicate(true), "camp_resources": camp.duplicate(true),
		"chest_storage": chest.duplicate(true), "mission_items": mission_items.duplicate(true)
	}

func restore(data: Dictionary) -> bool:
	if not (data.get("player_inventory") is Dictionary) or not (data.get("camp_resources") is Dictionary):
		return false
	var loaded_bag: Dictionary = data["player_inventory"]
	var loaded_camp: Dictionary = data["camp_resources"]
	var loaded_chest: Dictionary = data.get("chest_storage", {})
	for resource_id in RESOURCE_IDS:
		bag[resource_id] = clampi(int(loaded_bag.get(resource_id, 0)), 0, _bag_cap(resource_id))
		camp[resource_id] = clampi(int(loaded_camp.get(resource_id, 0)), 0, _camp_cap(resource_id))
		chest[resource_id] = clampi(int(loaded_chest.get(resource_id, 0)), 0, CHEST_CAP)
	mission_items = Dictionary(data.get("mission_items", {})).duplicate(true)
	return true
