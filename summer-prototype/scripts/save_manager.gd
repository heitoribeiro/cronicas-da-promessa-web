extends Node
class_name M1SaveManager

const MANUAL_PATH: String = "user://cronicas_promessa_manual_save.json"
const AUTO_PATH: String = "user://cronicas_promessa_autosave.json"
const PORTABLE_FORMAT: String = "cronicas-da-promessa-save"
const PORTABLE_VERSION: int = 1
const EXTENSION: String = ".cdpsave"
const SCHEMA_VERSION: int = 2
const CONTENT_VERSION: String = "m2.0"

var last_status: String = ""

func has_local(slot: String = "manual") -> bool:
	return FileAccess.file_exists(_slot_path(slot))

func _slot_path(slot: String) -> String:
	return MANUAL_PATH if slot == "manual" else AUTO_PATH

func write_local(slot: String, payload: Dictionary, reason: String) -> bool:
	if not validate_payload(payload):
		last_status = "Save incompatível"
		return false
	var save_path: String = _slot_path(slot)
	var file: FileAccess = FileAccess.open(save_path, FileAccess.WRITE)
	if file == null:
		last_status = "Falha ao salvar"
		print("[SAVE] falha ao abrir arquivo: ", FileAccess.get_open_error(), " • ", save_path)
		return false
	file.store_string(JSON.stringify(payload))
	file.close()
	last_status = "%s salvo • %s" % ["Manual" if slot == "manual" else "Autosave", reason]
	print("[SAVE] sucesso • ", slot, " • ", reason, " • ", save_path)
	return true

func read_local(slot: String = "manual") -> Dictionary:
	var save_path: String = _slot_path(slot)
	if not FileAccess.file_exists(save_path):
		last_status = "Nenhum save %s encontrado" % slot
		return {"ok": false, "error": last_status}
	var file: FileAccess = FileAccess.open(save_path, FileAccess.READ)
	if file == null:
		last_status = "Falha ao carregar %s" % slot
		return {"ok": false, "error": last_status}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	file.close()
	if not (parsed is Dictionary):
		last_status = "Save %s incompatível" % slot
		return {"ok": false, "error": last_status}
	var migrated := migrate_payload(parsed)
	if not validate_payload(migrated):
		last_status = "Save %s incompatível" % slot
		return {"ok": false, "error": last_status}
	return {"ok": true, "payload": migrated}

func validate_payload(payload: Dictionary) -> bool:
	var version: int = int(payload.get("version", 0))
	if version != 1 and version != 2:
		return false
	var schema_version := int(payload.get("schema_version", 1))
	if schema_version < 1 or schema_version > SCHEMA_VERSION:
		return false
	if not (payload.get("player_position") is Dictionary):
		return false
	if not (payload.get("player_inventory") is Dictionary):
		return false
	if not (payload.get("camp_resources") is Dictionary):
		return false
	if not payload.has("game_minutes"):
		return false
	if version == 2:
		if not (payload.get("chest_storage") is Dictionary):
			return false
		if not (payload.get("quest_progress") is Dictionary):
			return false
		if not payload.has("current_scene") or not payload.has("day"):
			return false
	if schema_version == SCHEMA_VERSION:
		for dictionary_key in ["relationships", "reputation", "events_seen", "quest_objectives", "flags"]:
			if not (payload.get(dictionary_key) is Dictionary):
				return false
		if String(payload.get("current_location", "")).is_empty() or String(payload.get("content_version", "")).is_empty():
			return false
	return true

func migrate_payload(source: Dictionary) -> Dictionary:
	var migrated := source.duplicate(true)
	var source_schema := int(migrated.get("schema_version", 1))
	if source_schema > SCHEMA_VERSION:
		return migrated
	if not migrated.has("version"):
		migrated["version"] = 2
	if not migrated.has("current_scene"):
		migrated["current_scene"] = "camp"
	if not migrated.has("day"):
		migrated["day"] = 1
	if not migrated.has("chest_storage"):
		migrated["chest_storage"] = {}
	if not migrated.has("quest_progress"):
		migrated["quest_progress"] = {}
	migrated["schema_version"] = SCHEMA_VERSION
	migrated["content_version"] = String(migrated.get("content_version", CONTENT_VERSION))
	migrated["current_location"] = String(migrated.get("current_location", migrated.get("current_scene", "camp")))
	migrated["quest_objectives"] = Dictionary(migrated.get("quest_objectives", migrated.get("quest_progress", {}))).duplicate(true)
	migrated["relationships"] = Dictionary(migrated.get("relationships", {})).duplicate(true)
	migrated["reputation"] = Dictionary(migrated.get("reputation", {})).duplicate(true)
	migrated["events_seen"] = Dictionary(migrated.get("events_seen", {})).duplicate(true)
	migrated["flags"] = Dictionary(migrated.get("flags", migrated.get("tutorial_flags", {}))).duplicate(true)
	migrated["version"] = 2
	return migrated

func package_portable(payload: Dictionary) -> Dictionary:
	var payload_json: String = JSON.stringify(payload)
	return {
		"format": PORTABLE_FORMAT, "format_version": PORTABLE_VERSION,
		"payload_json": payload_json, "checksum": payload_json.sha256_text()
	}

func validate_portable(package: Dictionary) -> Dictionary:
	if String(package.get("format", "")) != PORTABLE_FORMAT:
		return {"ok": false, "error": "formato desconhecido"}
	if int(package.get("format_version", 0)) != PORTABLE_VERSION:
		return {"ok": false, "error": "versão portátil incompatível"}
	var payload_json: String = String(package.get("payload_json", ""))
	if payload_json.is_empty():
		return {"ok": false, "error": "conteúdo ausente"}
	if payload_json.sha256_text() != String(package.get("checksum", "")):
		return {"ok": false, "error": "integridade inválida"}
	var parsed: Variant = JSON.parse_string(payload_json)
	if not (parsed is Dictionary):
		return {"ok": false, "error": "save incompatível"}
	var migrated := migrate_payload(parsed)
	if not validate_payload(migrated):
		return {"ok": false, "error": "save incompatível"}
	return {"ok": true, "payload": migrated}

func export_portable(path: String, payload: Dictionary) -> bool:
	if not validate_payload(payload):
		last_status = "Falha ao exportar: estado inválido"
		return false
	var export_path: String = path
	if not export_path.to_lower().ends_with(EXTENSION):
		export_path += EXTENSION
	var file: FileAccess = FileAccess.open(export_path, FileAccess.WRITE)
	if file == null:
		last_status = "Falha ao exportar"
		print("[PORTABLE] falha ao exportar • ", FileAccess.get_open_error(), " • ", export_path)
		return false
	file.store_string(JSON.stringify(package_portable(payload), "\t"))
	file.close()
	last_status = "Save exportado"
	print("[PORTABLE] exportado • ", export_path)
	return true

func read_portable(path: String) -> Dictionary:
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		last_status = "Falha ao importar"
		return {"ok": false, "error": last_status}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	file.close()
	if not (parsed is Dictionary):
		last_status = "Arquivo portátil inválido"
		print("[PORTABLE] pacote JSON inválido • ", path)
		return {"ok": false, "error": last_status}
	var validation: Dictionary = validate_portable(parsed)
	if not bool(validation.get("ok", false)):
		last_status = "Importação recusada: %s" % String(validation.get("error", "arquivo inválido"))
		print("[PORTABLE] importação recusada • ", validation.get("error", "arquivo inválido"), " • ", path)
	return validation

func imported(path: String) -> void:
	last_status = "Save importado e aplicado"
	print("[PORTABLE] importado • ", path)

func loaded(slot: String) -> void:
	last_status = "%s carregado" % slot.capitalize()
	print("[SAVE] carregado • ", slot, " • ", _slot_path(slot))
