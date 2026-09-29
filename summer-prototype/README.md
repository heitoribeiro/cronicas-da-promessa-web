# Crônicas da Promessa — Summer Prototype

Protótipo técnico paralelo da versão web de **Crônicas da Promessa**.

## Objetivo

Validar no Summer Engine / Godot 4 a arquitetura mecânica definitiva do jogo sem substituir a Web Alpha existente.

Primeira vertical slice:

- movimento por clique;
- movimento por WASD/setas;
- CharacterBody2D com colisão;
- NPC Hanan com patrulha externa;
- estruturas com StaticBody2D;
- interação por tecla E ou clique no prompt;
- diálogo simples;
- base para importar inventário, quests, ciclo dia/noite e saves.

## Abrir no Summer Engine

Abra diretamente o arquivo:

`summer-prototype/project.godot`

A versão atual evita recursos específicos de Godot 4.7 para permanecer compatível com a linha Godot 4 acompanhada pelo Summer.

## Conectar Codex CLI ao Summer Engine

No PowerShell:

```powershell
npx -y summer-engine@latest login
npx -y summer-engine@latest setup codex --yes
npx -y summer-engine@latest doctor
```

Depois:

1. mantenha o Summer Engine aberto;
2. abra `summer-prototype/project.godot`;
3. reinicie o Codex CLI após o setup;
4. confirme que o MCP `summer-engine` aparece conectado;
5. peça ao Codex para executar a cena principal e verificar erros.

## Linha de desenvolvimento

A versão web continua sendo a build jogável de referência. O protótipo Summer deve receber somente sistemas que já tenham valor mecânico comprovado ou que precisem do engine para serem testados melhor.


## MCP validado

O protótipo foi executado pelo Summer Engine via MCP e a cena principal iniciou com 0 erros de execução e 0 erros de GDScript.

Correções posteriores ao primeiro diagnóstico:

- fluxo de entrada corrigido para remover código inalcançável em `_unhandled_input()`
- parâmetros que ocultavam `Node2D.position` foram renomeados
- limites físicos invisíveis foram adicionados aos quatro lados do mapa
- clique em destino bloqueado é cancelado quando o personagem permanece preso
- marcador de destino fica vermelho brevemente quando o ponto não pode ser alcançado
- destino alcançado remove o marcador normalmente

Próxima etapa mecânica: substituir o deslocamento direto por clique por navegação 2D com pathfinding real.


## Pathfinding por clique

O protótipo agora usa `AStarGrid2D` para movimentação por clique.

Comportamento esperado:

- o clique é convertido em uma célula navegável do mapa
- Cozinha, Oficina, Tenda do Estandarte, Curral e Poço são tratados como obstáculos
- a área bloqueada é expandida para considerar o raio físico do personagem
- se o clique cair dentro de um obstáculo, o sistema procura a célula navegável mais próxima
- o personagem percorre os waypoints calculados em vez de andar em linha reta
- WASD/setas cancelam imediatamente a rota automática
- o mecanismo de detecção de personagem preso permanece como fallback de segurança
- limites físicos continuam ativos nos quatro lados do mapa

Objetivo desta etapa: aproximar o controle por mouse do comportamento de MMORPGs como Ragnarok Online, em que o personagem contorna obstáculos para alcançar o ponto clicado.


## Debug de navegação

- o jogo executa três autotestes internos de pathfinding ao iniciar
- os testes validam desvio da Cozinha, desvio da Oficina e resolução de clique dentro do Poço
- o resultado aparece no canto inferior esquerdo como `NAV 3/3` quando todos passam
- pressione `F3` para mostrar ou ocultar o debug
- a rota calculada para o clique é desenhada em azul durante o deslocamento
- essa validação usa coordenadas do mundo do próprio jogo e não depende de cliques sintéticos externos do Summer/Codex


## Rotinas diárias por horário

O protótipo agora possui um relógio de jogo e troca de rotina de NPC por faixa horária.

Hanan:
- 06:00–11:59: serviço ao redor da Cozinha
- 12:00–17:59: serviço no centro do acampamento
- 18:00–20:59: preparativos do entardecer
- 21:00–05:59: repouso

Controles e debug:
- F4 avança 6 horas para testar transições de rotina
- o HUD mostra a hora atual e a rotina ativa de Hanan
- o console registra `[ROUTINE]`, `[NPCRoutine]` e `[NPCNAV]`
- o autoteste `[ROUTINETEST] ROTINA 4/4` confirma os quatro limites de horário
- a troca de rotina reutiliza o mesmo AStarGrid2D já validado para jogador e NPC


## Múltiplos NPCs com agendas independentes

A mesma infraestrutura de relógio e AStarGrid2D agora controla múltiplos NPCs simultaneamente.

NPCs atuais:
- Hanan: Cozinha -> centro do acampamento -> preparativos -> repouso
- Eliabe: Oficina -> coleta/transporte -> fogueira -> repouso
- Miriã: tendas familiares -> busca de água -> fogueira -> repouso

Validação:
- `[ROUTINETEST] ROTINA 12/12` cobre as quatro faixas de horário dos três NPCs
- F4 continua avançando 6 horas por teste
- cada NPC recebe uma rota A* própria quando sua rotina muda
- logs `[ROUTINE]`, `[NPCRoutine]` e `[NPCNAV]` identificam o NPC pelo nome
- a interação de diálogo com Hanan permanece independente das agendas dos demais


## Estados de comportamento dos NPCs

As agendas por horário agora também definem um estado de comportamento reutilizável.

Estados suportados:
- `work`: trabalho normal
- `travel`: deslocamento mais rápido
- `wait`: espera estacionária
- `meal`: refeição com pausa prolongada
- `socialize`: socialização com deslocamento mais lento e pausas maiores
- `rest`: repouso; ao alcançar um único destino o NPC permanece no local

Mapeamento atual:
- Hanan: trabalho -> trabalho -> socialização -> repouso
- Eliabe: trabalho -> deslocamento -> socialização -> repouso
- Miriã: trabalho -> deslocamento -> socialização -> repouso

Validação:
- `[BEHAVIORTEST] ESTADOS 12/12` confirma o mapeamento dos estados
- logs `[ACTIVITY]` registram mudanças de comportamento
- o HUD mostra rotina + estado ativo
- o diálogo de Hanan também exibe o estado atual


## Ações concretas de rotina

Os estados de comportamento agora produzem ações temporizadas quando o NPC alcança um ponto da agenda.

- `work`: executa uma ação de trabalho a cada ponto
- `travel`: faz apenas uma pausa mínima de transição
- `socialize`: permanece mais tempo socializando em cada ponto
- `rest`: ao chegar ao destino único, executa a entrada em repouso e permanece assentado no local lógico
- `meal` e `wait`: já possuem suporte genérico para próximas rotinas

Logs:
- `[ACTION] <NPC> iniciou ...`
- `[ACTION] <NPC> concluiu ...`

O diálogo pausa o contador da ação de Hanan e a ação continua normalmente quando a conversa termina.

O HUD de rotinas foi compactado em três linhas para evitar corte na lateral direita.


## Economia inicial do acampamento

A primeira economia interna foi ligada às ações concretas dos NPCs.

Recursos:
- água
- lenha
- materiais
- refeições
- capacidade inicial de 20 unidades por recurso

Fluxos atuais:
- Hanan / Cozinha: consome 1 água + 1 lenha e produz 1 refeição
- Eliabe / Oficina: produz 1 material
- Eliabe / Coleta: produz 1 lenha
- Miriã / Água: produz 1 água

Regras:
- o efeito econômico só ocorre no ponto 0 da rota, uma vez por volta
- produção e consumo acontecem apenas após a conclusão da ação
- Hanan não produz refeição se faltar água ou lenha
- o HUD mostra os estoques do acampamento
- logs `[RESOURCE]` registram produção, consumo e bloqueios
- `[ECONOMYTEST] ECONOMIA 5/5` valida o mapeamento básico de recursos


## Bolsa do jogador e primeira quest econômica

A economia do acampamento agora está conectada ao jogador.

Bolsa:
- água
- lenha
- materiais
- refeições
- capacidade de 8 unidades por recurso

Primeira quest real:
- fale com Hanan para iniciar **Água para a Cozinha**
- requisito: 2 unidades de água
- aproxime-se do Poço e use E ou clique no prompt para recolher água
- cada coleta adiciona 1 água à Bolsa
- volte a Hanan com 2 águas
- ao entregar, 2 águas saem da Bolsa e entram no estoque do acampamento
- a quest só é concluída após a entrega real dos recursos

Regras:
- não é possível exceder a capacidade da Bolsa
- a entrega não ocorre se o estoque do acampamento não comportar os recursos
- logs `[PLAYERRESOURCE]` registram coleta do jogador
- logs `[QUEST]` registram início e conclusão
- `[QUESTTEST] QUEST 5/5` valida requisitos e limite básico da Bolsa


## Sistema genérico de quests de entrega

A primeira missão deixou de usar flags específicas e passou a usar definições configuráveis.

Estrutura:
- cada quest possui `id`, título, NPC responsável, requisitos e textos de início/conclusão
- uma quest ativa é controlada por `active_quest_id`
- quests concluídas são registradas em `completed_quest_ids`
- requisitos são lidos genericamente da definição da quest

Proteção contra soft-lock:
- entregas de quest nunca são bloqueadas porque o estoque do acampamento está cheio
- a parte que couber é armazenada normalmente
- o excedente é considerado consumido pela própria missão
- logs `[QUESTRESOURCE]` mostram quantidade entregue, armazenada e consumida na missão

Validação:
- `[QUESTTEST] QUESTSYS 9/9` valida definição, requisitos, capacidade da Bolsa e entrega com estoque cheio
- a missão atual **Água para a Cozinha** continua exigindo 2 unidades de água


## Segunda quest genérica

A infraestrutura de quests agora é reutilizada por um segundo NPC.

Quest:
- **Lenha para a Oficina**
- NPC: Eliabe
- requisito: 3 unidades de Lenha
- pré-requisito: concluir **Água para a Cozinha**

Fluxo:
- fale com Eliabe após concluir a quest de Hanan
- vá até a área de **Coleta de Lenha**
- use E ou clique no prompt para recolher Lenha
- cada coleta adiciona 1 Lenha à Bolsa
- entregue 3 Lenhas a Eliabe
- a entrega usa o mesmo tratamento de estoque cheio já validado

Diálogos:
- o jogo agora pausa apenas o NPC com quem o jogador está conversando
- fechar o diálogo libera somente esse NPC
- Hanan, Eliabe e os demais continuam independentes

Validação:
- o autoteste de quests passa a ser `QUESTSYS 12/12`


## Salvamento persistente do protótipo

O protótipo Summer possui dois slots locais independentes:
- manual: `user://cronicas_promessa_manual_save.json`
- autosave: `user://cronicas_promessa_autosave.json`

Conteúdo salvo:
- horário do jogo
- posição do jogador
- Bolsa do jogador
- estoque do acampamento
- quest ativa
- histórico de quests concluídas

Controles:
- `F5`: grava somente o slot manual
- `F9`: carrega somente o slot manual

Autosave:
- ao iniciar uma quest
- ao concluir uma quest
- ao coletar recursos
- quando a economia dos NPCs altera o estoque do acampamento

Validação:
- `[SAVETEST] SAVESYS 7/7` valida a serialização básica do estado
- logs `[SAVE]` registram gravação, carregamento e falhas


### Separação entre manual e autosave

O autosave nunca sobrescreve o slot manual. Isso garante que um snapshot criado com F5 permaneça intacto mesmo que o jogador colete recursos, conclua quests ou a economia dos NPCs continue avançando depois.

- F5/F9 operam apenas no slot manual
- eventos automáticos escrevem apenas no slot autosave
- o HUD identifica qual tipo de save foi gravado ou carregado
- `[SAVETEST] SAVESYS 10/10` valida também a separação dos dois arquivos


## Save portátil entre dispositivos

O protótipo agora pode exportar e importar progresso por arquivo próprio do jogo.

Controles:
- `F6`: abre o diálogo **Exportar save portátil**
- `F10`: abre o diálogo **Importar save portátil**
- extensão: `.cdpsave`

O arquivo portátil contém:
- horário do jogo
- posição do jogador
- Bolsa
- estoque do acampamento
- quest ativa
- quests concluídas

Integridade:
- o pacote possui identificador de formato
- versão portátil independente
- payload JSON interno
- checksum SHA-256 do payload
- arquivos corrompidos, alterados ou de outro formato são recusados antes de aplicar qualquer estado

Após uma importação válida:
- o estado importado é aplicado
- o slot manual local passa a usar esse estado
- o autosave recebe a mesma base
- a partir daí o jogo continua normalmente no novo dispositivo

Validação:
- `[PORTABLETEST] PORTABLE 8/8`
- logs `[PORTABLE]` registram exportação, importação e recusas
