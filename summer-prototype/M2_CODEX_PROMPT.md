# Prompt Codex — M2 Data-Driven Game Framework

Antes de editar:
1. leia AGENTS.md;
2. leia DATA_ARCHITECTURE.md;
3. leia M2_DATA_DRIVEN.md;
4. leia M1_VERTICAL_SLICE.md;
5. inspecione git status e git log;
6. preserve integralmente commits e alterações locais válidas do M1.

IMPORTANTE: o projeto local pode estar à frente de origin/main devido aos commits do M1 realizados pelo Codex. Não descarte esses commits. Se origin/main tiver apenas documentação nova, integre-a preservando a história local.

Objetivo: entregar integralmente M2_DATA_DRIVEN.md como um grande milestone funcional.

Modo de trabalho:
- use Summer Engine MCP durante todo o processo;
- faça checkpoints internos grandes;
- implemente, execute, diagnostique, corrija, faça commit e prossiga;
- não peça aprovação depois de cada pequena mudança.

Referência Stardew-like:
Use padrões de arquitetura e UX de RPGs de rotina e mundo persistente, mas escreva implementação original para Godot. Não copie código decompilado, assets, mapas ou conteúdo proprietário de Stardew Valley.

Prioridades:
1. manter M1 jogável;
2. migrar conteúdo para dados;
3. reduzir acoplamento de main.gd;
4. criar ContentDatabase;
5. tornar NPC, quest, item, location e event extensíveis por definição;
6. preservar saves existentes com migração segura;
7. preparar asset references para futura substituição pixel art;
8. adicionar conteúdo do Dia 2 para provar a arquitetura.

Não faça uma refatoração gigantesca sem executar o jogo no meio. O jogo deve permanecer rodável a cada checkpoint.

Use commits coesos por checkpoint.

No final:
- execute o playthrough M1 completo;
- continue no Dia 2;
- valide novas quests/NPCs/relações/evento;
- faça save/load;
- faça portable export/import;
- consulte diagnostics e debugger;
- execute git diff --check;
- produza resumo M2TEST;
- informe commits e limitações.

Só pare antes da conclusão se houver conflito destrutivo sem resolução segura, falha não contornável do Summer/MCP ou decisão indispensável impossível de inferir. Caso contrário, prossiga autonomamente até concluir o M2.