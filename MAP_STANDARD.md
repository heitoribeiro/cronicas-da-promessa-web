# Arquitetura de Mapas — Crônicas da Promessa

Este documento adapta para Godot a separação de responsabilidades usada pelos mapas de Ragnarok Online.

## 1. Arquitetura estudada

No formato Ragnarok:

- **GND**: terreno, texturas, lightmaps, tiles e alturas.
- **GAT**: grade de altitude e tipo de célula usada para navegação/colisão.
- **RSW**: mundo — modelos, luzes, sons, efeitos, água e metadados de objetos.
- **RSM**: modelos de objetos utilizados pelo mundo.

No BrowEdit, ao criar um mapa novo de largura × altura, o GAT é criado com **largura × 2 e altura × 2**. Ou seja, a grade de navegação é duas vezes mais fina do que a grade principal do terreno.

## 2. Adaptação oficial ao Godot

Para Crônicas da Promessa:

### Terreno visual
- TileMapLayer `TerrainBase`
- tile principal: **16 × 16 px**
- solo, areia, terra compactada

### Sobreposição de terreno
- TileMapLayer `TerrainOverlay`
- caminhos
- manchas
- pequenas pedras
- mato baixo
- transições

### Colisão / navegação
- resolução lógica: **8 × 8 px**
- equivalente ao princípio GAT 2× mais fino
- não precisa existir como arte visível
- usado para:
  - bloqueios
  - passagem
  - zonas lentas
  - água
  - áreas de interação

### Objetos
Separar por profundidade:

- `ObjectsBack`
- `ObjectsWorld`
- `ObjectsFront`

Personagens e NPCs ficam em YSort para que a linha dos pés determine quem passa na frente.

### Sistemas de mundo
Equivalente ao papel do RSW:

- `Interactions`: Area2D
- `Lights`: Light2D / PointLight2D
- `Audio`: AudioStreamPlayer2D
- `Effects`: partículas e animações
- `SpawnPoints`: NPCs/animais
- `Transitions`: saídas leste, oeste, sul etc.
- `Navigation`: NavigationRegion2D quando necessário

## Estado atual do protótipo Web

A cena Web atualmente jogável de Judá ainda usa um mundo lógico de **1800 × 1200 px**, com coordenadas, colisões e rotas já implementadas nessa base. Esse tamanho permanece durante a migração para evitar regressões mecânicas.

O padrão abaixo é o **alvo de produção para os mapas definitivos das tribos**. A migração será feita por etapas, com conversão de coordenadas, validação da câmera e preservação da jogabilidade.

## 3. Tamanho oficial dos mapas de tribo

Padrão aprovado anteriormente:

- mapa: **3072 × 1536 px**
- terreno: **192 × 96 tiles de 16 px**
- navegação fina: **384 × 192 células de 8 px**
- viewport base: **1280 × 720**
- orientação principal: horizontal

O mapa pode ser expandido posteriormente sem mudar a arquitetura.

## 4. Estrutura Godot recomendada

```
TribeMap
├── TerrainBase
├── TerrainOverlay
├── ObjectsBack
├── WorldYSort
│   ├── Player
│   ├── NPCs
│   ├── Animals
│   └── ObjectsWorld
├── ObjectsFront
├── Collision
├── Navigation
├── Interactions
├── Lights
├── Audio
├── Effects
├── SpawnPoints
└── Transitions
```

## 5. Layout das tribos

Cada acampamento deve ter:

- identidade cromática própria;
- tenda principal / estandarte;
- tendas familiares;
- conselho;
- armazéns;
- poço ou fonte;
- oficinas;
- currais quando aplicável;
- fogueira comunitária;
- torres/paliçadas quando aplicável;
- saídas ligadas ao mapa geral;
- caminhos principais largos;
- caminhos secundários;
- vegetação e rochas agrupadas, nunca distribuídas aleatoriamente.

A estrutura é comum, mas a composição de cada tribo não deve ser uma simples recoloração.

## 6. Profundidade

Regra obrigatória:
- colisão física usa a base do objeto;
- profundidade visual usa a linha dos pés;
- copa de árvore, teto, toldos e estruturas altas podem possuir uma camada frontal separada.

Exemplo:

```
tree_base.png
tree_front.png
```

O jogador passa:
- na frente do tronco quando está abaixo;
- atrás da copa quando está acima.

## 7. Performance Web/mobile

- tiles repetitivos devem permanecer em TileMapLayer;
- objetos grandes devem ser cenas reutilizáveis;
- evitar um PNG gigante como mapa;
- colisões simples;
- desligar processamento de NPCs fora da área relevante;
- atlas/texture pages devem ser agrupados por categoria;
- nearest-neighbor para pixel art.

## 8. Referências técnicas

- `L1nkZ/raglib/kaitai/gnd.ksy`
- `L1nkZ/raglib/kaitai/gat.ksy`
- `L1nkZ/raglib/kaitai/rsw.ksy`
- `Tokeiburu/browedit/brolib/BroLib/Map.cpp`

Estas fontes são usadas para compreender a arquitetura. Os mapas e assets de Crônicas da Promessa são originais.


## 9. Navegação A* no protótipo Web

A navegação por clique foi migrada para uma grade de **8 × 8 px**, coerente com a ideia de GAT em resolução 2× sobre tiles visuais de 16 px.

O módulo `src/pathfinding.js` implementa:

- A* em oito direções;
- heurística octile;
- bloqueio de diagonais que atravessariam quinas;
- limite de nós por busca para proteger o frame;
- reorganização de passos equivalentes para favorecer sequências diagonais e reduzir troca excessiva de direção do sprite.

O mapa de Judá passa a expor seus limites, resolução de navegação, layers, distritos, spawn points e saídas planejadas em `assets/maps/judah/map_manifest.json`. O runtime lê esse manifesto através de `src/map-system.js`.
