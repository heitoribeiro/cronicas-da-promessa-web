# M3 — Mundo Vivo de Judá / Semana 1

## Objetivo

Transformar a base orientada a dados do M2 em uma experiência de RPG persistentemente jogável, com uma semana completa no acampamento de Judá, múltiplos NPCs, agendas variáveis, relações, vocação, produção, eventos contextuais e progressão narrativa.

O M3 deve parecer um capítulo real do jogo, e não uma demonstração técnica.

Meta de primeira jogada: 60–90 minutos sem rush.

## Princípios

- usar a arquitetura data-driven do M2;
- preservar todo o M1/M2;
- evitar lógica específica por NPC/quest em main.gd;
- manter arte como placeholder funcional, pronta para substituição pixel art;
- comportamento e UX podem se inspirar em RPGs de rotina e mundo persistente, especialmente Stardew Valley, sem copiar código ou assets;
- o jogo deve continuar funcional a cada checkpoint.

## Resultado macro

Ao final do M3 o jogador deve poder:
1. iniciar novo jogo ou continuar save;
2. viver 7 dias completos no acampamento de Judá;
3. acompanhar calendário, hora e períodos do dia;
4. observar NPCs com agendas diferentes por dia/período;
5. trabalhar em uma vocação;
6. coletar, produzir, armazenar, comer e descansar;
7. desenvolver relações com NPCs e reputação de Judá;
8. receber quests principais, secundárias e tarefas diárias;
9. participar de eventos contextuais;
10. desbloquear novas interações e cenas;
11. encerrar a Semana 1 com um evento narrativo de conclusão;
12. salvar, recarregar e portar o progresso sem perda.

## A — Calendar / Time 2

Expandir o sistema de tempo para:
- dia da campanha;
- dia da semana;
- semana;
- hora/minuto;
- daypart: madrugada, manhã, meio-dia, tarde, entardecer, noite;
- eventos de mudança de período;
- avanço de tempo por ações;
- pausa do tempo em diálogos/cutscenes quando apropriado;
- horário especial de refeições, serviço, descanso e atividades.

Definir uma Semana 1 de sete dias. Os nomes internos podem ser neutros (day_1 ... day_7) para não fixar ainda um calendário histórico definitivo.

## B — Schedule Engine 2

Rotinas devem variar por:
- dia;
- horário;
- atividade;
- quest/evento;
- relação;
- estado do capítulo.

Adicionar suporte a:
- schedule default;
- schedule por dia;
- override por evento;
- fallback seguro;
- interior/exterior;
- destino alternativo se área estiver bloqueada.

Nenhum NPC deve atravessar construções ou ficar preso indefinidamente.

## C — População de Judá

Manter os NPCs existentes e expandir o elenco para pelo menos 12 NPCs de Judá, todos dirigidos por dados.

Obrigatórios no elenco funcional:
- Ancião;
- Hanan;
- Eliabe;
- Miriã;
- Pastor/Rebanho;
- Urias;
- Noemi;
- Jael;
- mais 4 NPCs novos coerentes com o acampamento.

Cada NPC deve possuir:
- nome;
- função;
- local de origem/casa;
- agenda;
- conjunto de diálogos;
- relação;
- ao menos uma preferência/tag social;
- disponibilidade para eventos/quests quando aplicável.

## D — Vocação do jogador

Implementar um sistema genérico de vocação/profissão.

Para M3, o jogador permanece com a vocação inicial de Pastor, mas o framework deve suportar outras no futuro.

Pastor deve possuir:
- nível de vocação;
- XP;
- atividades que concedem XP;
- pelo menos 3 níveis funcionais;
- benefícios simples por nível;
- ferramenta associada;
- tarefas diárias ligadas ao rebanho;
- tela/área de progresso.

Exemplo de benefícios:
- nível 1: custo de energia padrão;
- nível 2: menor gasto de energia no cuidado do rebanho;
- nível 3: chance/produção maior ou tarefa mais eficiente.

Não hardcodar a vocação em main.gd.

## E — Needs 2

Expandir energia e fome:
- gasto por movimento leve;
- gasto por trabalho;
- fome ao longo do tempo;
- refeição com efeitos definidos por item;
- descanso curto;
- sono completo;
- feedback visual;
- penalidade leve por fome/energia baixa;
- proteção contra soft-lock.

Adicionar estado de exaustão leve: se energia chegar ao mínimo, impedir trabalho pesado, mas permitir andar até cozinha/tenda e usar refeição.

## F — Gathering / Production / Crafting

Implementar sistema genérico de ações produtivas orientadas por dados.

Tipos mínimos:
- collect;
- produce;
- process;
- craft.

Recursos iniciais:
- Água;
- Lenha;
- Materiais;
- Refeição;
- Fibra;
- Couro ou Lã, conforme coerência com o rebanho;
- um recurso de construção/manutenção.

Receitas iniciais:
- Refeição simples;
- Feixe de lenha preparado;
- Kit de reparo simples;
- Ração do rebanho.

Cada receita deve definir:
- inputs;
- outputs;
- tempo;
- energia;
- estação/local;
- requisito opcional.

## G — Economia do acampamento 2

O estoque do acampamento deve ter consumo/produção real ao longo da semana.

Suportar:
- capacidade;
- consumo diário;
- produção por NPC;
- contribuição do jogador;
- alertas de escassez;
- efeitos de escassez em quests/eventos;
- overflow seguro.

Não criar um mercado monetário moderno. Preferir lógica de provisões, troca e contribuição comunitária compatível com o cenário.

## H — Quest System 3

Adicionar categorias:
- main;
- side;
- daily;
- relationship;
- vocation.

Suportar:
- disponibilidade por dia/horário;
- expiração opcional de tarefas diárias;
- pré-requisitos;
- escolha simples de resposta quando necessário;
- recompensa múltipla;
- reputação;
- relação;
- item;
- XP de vocação;
- flag de história.

Conteúdo mínimo da Semana 1:
- 1 arco principal com 7–10 quests;
- 6+ side quests;
- 5+ tarefas diárias reutilizáveis/data-driven;
- 3 relationship quests/eventos;
- 3 vocation tasks.

O total funcional deve ser de pelo menos 20 entradas de quest/tarefa/evento de progressão.

## I — Dialogue System 2

Diálogos devem variar por:
- primeiro encontro;
- dia;
- horário;
- atividade atual;
- relação;
- quest;
- evento;
- capítulo;
- baixa energia/fome quando relevante.

Adicionar:
- opções simples de resposta;
- uma escolha social sem consequência grave;
- memória de uma escolha;
- fala pós-quest;
- fala pós-evento;
- saudação diária limitada para evitar repetição.

## J — Relationship 2

Implementar tiers legíveis de relação, derivados de pontos.

Exemplo:
- desconhecido;
- conhecido;
- confiança;
- amizade;
- vínculo.

Para M3 não precisa chegar ao tier máximo com todos.

Relação deve mudar por:
- conversar;
- completar quest;
- ajudar em evento;
- escolha de diálogo;
- presente simples opcional, se implementado de forma genérica.

Adicionar pelo menos 3 eventos de relação.

## K — Event Engine 2 / Cutscenes funcionais

Eventos devem poder:
- bloquear input temporariamente;
- mover NPCs;
- mover jogador;
- focar câmera;
- exibir diálogo;
- esperar;
- alterar tempo;
- alterar flag;
- iniciar/concluir quest;
- dar/remover item;
- fade;
- executar animação;
- trocar local;
- devolver controle de forma segura.

Eventos principais da Semana 1:
1. abertura da semana;
2. primeiro serviço comunitário;
3. problema de provisões;
4. evento social no entardecer;
5. evento de relação;
6. tarefa coletiva;
7. conclusão da Semana 1.

## L — Locations / World 2

Expandir o acampamento em áreas lógicas, mesmo que ainda use placeholders:
- Centro de Judá;
- Currais/Pastoreio;
- Cozinha;
- Oficina;
- Tendas familiares;
- Tenda do jogador;
- Conselho/Estadarte;
- área de coleta;
- poço;
- pelo menos uma subárea adicional do entorno.

Locations devem ter exits/spawns por dados.

Adicionar fast map/journal navigation apenas como informação, não teleport, salvo debug.

## M — Journal / UI funcional

O Diário deve conter:
- Principal;
- Secundárias;
- Diárias;
- Concluídas;
- Relações;
- Vocação;
- Histórico da semana.

HUD deve mostrar apenas:
- status do jogador;
- tempo/dia;
- objetivo rastreado;
- avisos contextuais;
- interação.

Quests concluídas não ficam permanentemente no HUD.

Adicionar rastreamento manual de uma quest.

## N — Map System 2

O mapa deve indicar:
- jogador;
- locais descobertos;
- objetivo rastreado;
- NPC essencial quando a quest exigir e isso fizer sentido;
- áreas de atividade.

Não usar teleporte como mecânica normal.

## O — Tutorial / Onboarding

Transformar o início em onboarding curto e não intrusivo.

Ensinar:
- movimento WASD/setas;
- clique para mover;
- interação E/clique;
- Diário;
- Bolsa;
- Mapa;
- comer;
- dormir;
- salvar.

Tutorial deve registrar flags e não repetir depois de concluído.

## P — Save Schema 3

Persistir:
- calendário;
- vocação/XP;
- necessidades;
- quests por categoria;
- tarefas diárias;
- relações;
- reputação;
- escolhas;
- eventos vistos;
- locais descobertos;
- economia;
- conteúdo da semana;
- objetivo rastreado.

Implementar migração schema 2 -> 3.

Manual/autosave/portable continuam obrigatórios.

## Q — Recovery / Anti-softlock

Implementar salvaguardas:
- NPC essencial inacessível -> fallback de agenda;
- item obrigatório perdido -> recuperação controlada;
- estoque cheio -> entrega de quest ainda resolve de forma segura;
- energia mínima -> jogador sempre consegue chegar a comida/sono;
- quest de tempo perdida -> nova janela ou tratamento coerente, nunca save condenado;
- destino de clique inacessível -> cancelar em tempo finito.

## R — Performance / Runtime

Manter FPS estável no mapa principal.

Regras:
- NPCs fora da região ativa podem atualizar agenda em baixa frequência;
- evitar pathfinding por frame;
- evitar recriação massiva de dados;
- cache de ContentDatabase;
- UI sem rebuild desnecessário.

Manter opção de FPS no menu.

## S — Mobile readiness

Sem criar APK ainda, garantir:
- UI escalável;
- botões clicáveis/touch-friendly;
- click-to-move compatível com touch;
- nenhuma mecânica essencial depende apenas de tecla física;
- diálogos e menus utilizáveis em 16:9 e telas menores.

## T — Conteúdo da Semana 1

Estrutura narrativa funcional, sem tentar finalizar toda a história bíblica:

Dia 1: chegada, conhecimento do acampamento, primeiras tarefas.
Dia 2: integração, recursos, novos NPCs.
Dia 3: rotina da vocação e primeira escassez.
Dia 4: tarefa coletiva / manutenção.
Dia 5: relações e responsabilidades.
Dia 6: preparação comunitária e evento social.
Dia 7: fechamento da semana e reconhecimento do progresso.

O conteúdo deve ser coerente com a vida no acampamento de Judá, sem inventar eventos bíblicos canônicos específicos que ainda não tenham sido definidos pelo projeto.

## Arquitetura

Preferir novos arquivos/sistemas como:
- time_manager.gd;
- vocation_manager.gd;
- needs_manager.gd;
- crafting_manager.gd;
- economy_manager.gd;
- tutorial_manager.gd;
- world_state.gd;
- quest_tracker.gd;
- map_manager.gd;
- choice_manager.gd.

Os nomes podem variar, mas responsabilidades devem permanecer desacopladas.

## Testes

Adicionar resumo consolidado:
    [M3TEST] CALENDAR ...
    [M3TEST] SCHEDULES ...
    [M3TEST] POPULATION ...
    [M3TEST] VOCATION ...
    [M3TEST] NEEDS ...
    [M3TEST] PRODUCTION ...
    [M3TEST] ECONOMY ...
    [M3TEST] QUESTS ...
    [M3TEST] DIALOGUES ...
    [M3TEST] RELATIONSHIPS ...
    [M3TEST] EVENTS ...
    [M3TEST] LOCATIONS ...
    [M3TEST] JOURNAL ...
    [M3TEST] SAVE ...
    [M3TEST] ANTISOFTLOCK ...
    [M3TEST] M1_M2_REGRESSION ...

## Playthrough final obrigatório

Executar no Summer, sem editar runtime manualmente para forçar sucesso:
1. New Game;
2. onboarding;
3. completar arco inicial;
4. jogar do Dia 1 ao Dia 7;
5. realizar pelo menos uma atividade de vocação por dia útil;
6. completar arco principal da semana;
7. completar pelo menos 4 side quests;
8. completar pelo menos 3 tarefas diárias;
9. elevar relação com pelo menos 2 NPCs;
10. disparar pelo menos 3 eventos contextuais;
11. produzir/craftar pelo menos 3 tipos de item;
12. enfrentar ao menos uma situação de recurso baixo sem soft-lock;
13. salvar/recarregar no meio da semana;
14. exportar/importar portable save;
15. alcançar a conclusão da Semana 1;
16. confirmar continuidade para Semana 2 / modo livre.

## Critérios de aceitação

- 0 diagnostics errors;
- 0 debugger errors;
- 0 warning relevante não explicado;
- regressão M1/M2 preservada;
- Semana 1 jogável sem cheats/debug;
- pelo menos 12 NPCs ativos por dados;
- pelo menos 20 quests/tarefas/eventos de progressão funcionais;
- 7 dias completos;
- vocação funcional;
- crafting/produção funcional;
- economia do acampamento funcional;
- relações e eventos funcionais;
- saves schema 3 funcionais;
- portable save funcional;
- sem soft-lock conhecido no fluxo principal;
- main.gd não volta a concentrar regras específicas de conteúdo.

## Estratégia de execução

Checkpoints internos grandes:
A. Calendar + Time + WorldState.
B. Schedule 2 + população.
C. Vocation + Needs.
D. Production/Crafting + Economy.
E. Quest 3 + conteúdo Dias 1–4.
F. Dialogue/Relationship + conteúdo Dias 5–6.
G. Events + Dia 7 + fechamento da semana.
H. Journal/Map/Tutorial.
I. Save Schema 3 + migrations.
J. Anti-softlock + performance + mobile readiness.
K. Regressão M1/M2 + playthrough integral M3.

Não parar para aprovação entre checkpoints, salvo bloqueio destrutivo real.