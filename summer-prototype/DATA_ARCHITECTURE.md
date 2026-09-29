# Arquitetura orientada a dados — Crônicas da Promessa

## Objetivo

A partir do M2, o jogo deve crescer principalmente pela criação de dados, mapas, diálogos e assets, e não por novos blocos de lógica específicos para cada conteúdo.

A referência conceitual é a arquitetura de RPGs de rotina e mundo persistente, como Stardew Valley: mundo dividido em locais, NPCs com agendas, quests condicionais, eventos, inventário, relações, passagem do tempo e saves robustos. Crônicas da Promessa deve implementar tudo de forma própria em Godot/GDScript.

## Regra de referência externa

Permitido: estudar comportamentos, padrões de UX, documentação e projetos open source legitimamente licenciados.
Não permitido no repositório: copiar código proprietário/decompilado, sprites, mapas, áudio, textos, nomes internos ou assets de Stardew Valley.

## Princípio central

Conteúdo novo deve preferencialmente ser uma definição.

Exemplo de NPC:
    {
      "id": "hanan",
      "name": "Hanan",
      "tribe": "juda",
      "role": "cozinheiro",
      "home": "juda_camp",
      "schedule_id": "hanan_default",
      "dialogue_set": "hanan_dialogues",
      "quest_giver": true
    }

Exemplo de agenda:
    {
      "id": "hanan_default",
      "entries": [
        {"time": "06:00", "location": "kitchen", "activity": "work"},
        {"time": "18:00", "location": "campfire", "activity": "socialize"},
        {"time": "22:00", "location": "home", "activity": "rest"}
      ]
    }

Exemplo de quest:
    {
      "id": "water_for_kitchen",
      "giver": "hanan",
      "objectives": [
        {"type": "collect", "item": "water", "amount": 2},
        {"type": "deliver", "target": "hanan", "item": "water", "amount": 2}
      ]
    }

## Estrutura alvo

    summer-prototype/
      data/
        items/
        npcs/
        schedules/
        quests/
        dialogues/
        locations/
        recipes/
        events/
        relationships/
        chapters/
      scripts/
        core/
        systems/
        ui/
        actors/
      scenes/
        world/
        interiors/
        ui/

## ContentDatabase

Um carregador central deve carregar definições, validar IDs duplicados e referências quebradas, expor acesso por ID, emitir erros legíveis e suportar versão de schema.

APIs conceituais:
    ContentDB.get_npc("hanan")
    ContentDB.get_item("water")
    ContentDB.get_quest("water_for_kitchen")
    ContentDB.get_location("juda_camp")

## Identidade por ID

Nunca persistir referências diretas a Node no save. Persistir IDs estáveis de NPC, item, quest, local, evento e relacionamento.

## Sistemas obrigatórios

Item System: id, nome, categoria, descrição, stack_max, valor, ícone, transferable, quest_item, consumable, effects e tags.

Quest Engine: estados locked, available, active, ready_to_turn_in e completed. Objetivos mínimos: talk, visit, collect, deliver, inspect, interact, wait_until_time, sleep, use_item, produce, relationship e event_trigger.

NPC System: definição, actor runtime, schedule, current activity, current location, dialogue context, relationship, quest markers e persistence state.

Relationship System: afinidade por NPC e reputação por tribo. Deve influenciar diálogos, quests, recompensas e eventos.

Event Engine: ações de dialogue, move_player, move_npc, wait, camera_focus, give_item, remove_item, set_flag, set_time, set_location, start_quest, complete_objective, fade e play_animation.

Time/Calendar: minute, hour, day, week e dayparts manhã, tarde, entardecer e noite.

Locations: id, scene, display_name, map_position, exits, spawn points, services e tags.

Dialogue: resolução por NPC, relação, horário, atividade, quest, capítulo, flags e local.

Save: schema_version, content_version, IDs estáveis e migrations. Persistir estado, inventário, baú, quests, relações, flags, economia, local atual, capítulo e eventos vistos.

## Visual pipeline

A lógica não deve depender de um asset visual específico. Definições apontam para sprite_set, portrait, icon, tileset e animation profile. Assim, placeholders podem ser substituídos pelos assets pixel art aprovados sem reescrever sistemas.

## Regra de escala

Antes de adicionar dezenas de NPCs, quests ou regiões, deve ser possível criá-los por definição + assets. Essa é a principal meta do M2.