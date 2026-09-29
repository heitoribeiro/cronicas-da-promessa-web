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

func _init() -> void:
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
	var updated: int = clampi(previous + amount, 0, BAG_CAP)
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
		var stored: int = mini(amount, maxi(0, CAMP_CAP - int(camp.get(resource_id, 0))))
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
		camp[resource_id] = clampi(int(camp.get(resource_id, 0)) + int(effect[resource_key]), 0, CAMP_CAP)
	return true

func transfer(resource_id: String, to_chest: bool) -> bool:
	if not resource_id in RESOURCE_IDS:
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
		bag[resource_id] = clampi(int(loaded_bag.get(resource_id, 0)), 0, BAG_CAP)
		camp[resource_id] = clampi(int(loaded_camp.get(resource_id, 0)), 0, CAMP_CAP)
		chest[resource_id] = clampi(int(loaded_chest.get(resource_id, 0)), 0, CHEST_CAP)
	mission_items = Dictionary(data.get("mission_items", {})).duplicate(true)
	return true
