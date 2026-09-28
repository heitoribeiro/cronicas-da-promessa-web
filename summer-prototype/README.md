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
