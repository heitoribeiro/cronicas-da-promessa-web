# Prompt Codex — M3 Mundo Vivo de Judá / Semana 1

Objetivo: implementar integralmente o milestone M3 descrito em M3_LIVING_WORLD.md.

Antes de editar:
1. leia AGENTS.md;
2. leia DATA_ARCHITECTURE.md;
3. leia M2_DATA_DRIVEN.md;
4. leia M3_LIVING_WORLD.md;
5. leia ROADMAP.md;
6. inspecione git status --short --branch;
7. inspecione git log --oneline -n 20;
8. preserve todos os commits M1/M2;
9. preserve alterações locais válidas existentes.

Sincronização:
- compare local e origin/main antes de integrar;
- nunca use reset --hard;
- nunca use git clean;
- não descarte .tscn/.uid/project.godot locais sem determinar primeiro sua origem;
- se houver divergência, faça integração segura preservando o estado funcional do M2.

Modo de execução:
- use Summer Engine MCP durante todo o desenvolvimento;
- trabalhe autonomamente em checkpoints grandes;
- não peça aprovação após cada pequena alteração;
- implemente -> execute -> diagnostique -> corrija -> commit -> continue;
- mantenha o jogo rodável em cada checkpoint;
- use commits coesos.

Referência de design:
Pode usar Stardew Valley e outros RPGs persistentes como referência conceitual de calendário, rotinas, relações, UX, produção e progressão. A implementação deve ser original em Godot/GDScript. Não copie código decompilado, assets, mapas, áudio ou conteúdo proprietário.

Escopo obrigatório:
- calendário de 7 dias;
- schedules variáveis;
- 12+ NPCs por dados;
- vocação de Pastor com XP/níveis;
- energia/fome expandidas;
- coleta/produção/crafting;
- economia comunitária;
- Quest System 3;
- 20+ entradas de progressão;
- Dialogue System 2;
- Relationship 2;
- Event Engine 2;
- Locations/World 2;
- Diário e rastreamento;
- Map System 2;
- onboarding;
- Save Schema 3;
- anti-softlock;
- performance;
- mobile readiness;
- conclusão da Semana 1.

Conteúdo:
Construa uma semana coerente no acampamento de Judá. Não invente grandes eventos bíblicos canônicos ainda não especificados. O foco é vida no acampamento, serviço, provisões, rebanho, relações, responsabilidade comunitária e progressão do personagem.

Checkpoints:
A. Calendar + Time + WorldState.
B. Schedule 2 + população.
C. Vocation + Needs.
D. Production/Crafting + Economy.
E. Quest 3 + Dias 1–4.
F. Dialogue/Relationship + Dias 5–6.
G. Events + Dia 7.
H. Journal/Map/Tutorial.
I. Save Schema 3 + migrations.
J. Anti-softlock + performance + mobile readiness.
K. Regression M1/M2 + full M3 playthrough.

Após cada checkpoint:
- rode a cena;
- consulte diagnostics;
- consulte debugger;
- valide comportamento por runtime;
- corrija regressões;
- faça commit;
- prossiga automaticamente.

Não use alterações manuais temporárias de runtime como substituto de um playthrough final real. Probes/debug podem ser usados para testes unitários e diagnósticos, mas a validação final deve percorrer a Semana 1 sem cheats.

Critério de parada antes do fim:
Somente bloqueio destrutivo impossível de resolver com segurança, falha externa não contornável do Summer/MCP ou decisão indispensável ausente.

Relatório final obrigatório:
- commits de cada checkpoint;
- M3TEST completo;
- resultados da regressão M1/M2;
- playthrough Dia 1 -> Dia 7;
- quests concluídas;
- relações;
- vocação;
- crafting/economia;
- save/load;
- portable save;
- diagnostics;
- debugger;
- git diff --check;
- limitações remanescentes;
- recomendação técnica para M4.