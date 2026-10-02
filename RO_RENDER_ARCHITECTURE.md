# Arquitetura visual 2.5D — direção Ragnarok-like

A análise do protótipo atual mostrou que o maior afastamento visual em relação a Ragnarok Online **não está apenas nos sprites**. O principal fator é o renderer.

## 1. Diferença estrutural

O protótipo Web atual usa essencialmente:

- mundo 2D em DOM/CSS;
- coordenadas X/Y de tela;
- props desenhados como imagens frontais;
- câmera top-down;
- profundidade simulada por z-index.

A arquitetura clássica de Ragnarok usa:

- **terreno 3D** derivado do GND, inclusive alturas por canto de célula;
- **modelos 3D** do mundo (RSM/objetos RSW);
- **personagens 2D billboard** sempre orientados ao plano da câmera;
- câmera inclinada com yaw/zoom;
- direção visual do sprite calculada em função da direção do personagem **e da câmera**;
- luz, shadow map, água, fog e efeitos separados do sprite.

Por isso apenas converter os NPCs para 8 direções não torna a cena parecida com Ragnarok.

## 2. Renderer-alvo de Crônicas da Promessa

A nova arquitetura visual será dividida em cinco estágios:

### Stage A — Terrain
Equivalente conceitual ao GND:
- grid de terreno;
- altura por vértice;
- textura/atlas;
- lightmap;
- faces laterais quando houver diferença de altura.

### Stage B — World models
Equivalente conceitual ao RSW/RSM:
- tendas;
- portões;
- torres;
- bancadas;
- poços;
- cercas;
- pedras grandes;
- árvores e estruturas.

Objetos podem ser low-poly/pixel-textured em vez de sprites frontais.

### Stage C — Billboard entities
Jogadores, NPCs, animais, itens e efeitos permanecem 2D, mas são projetados no mundo 3D pelo ponto dos pés.

### Stage D — Effects
- sombras no solo;
- fog;
- iluminação ambiente/direcional;
- água;
- partículas;
- efeitos de missão.

### Stage E — UI
HUD permanece em screen space e não sofre projeção da câmera.

## 3. Regra de direção

O frame mostrado depende de:

```
direção_visual = direção_do_personagem - octante_da_câmera
```

normalizado para 0..7.

Assim, ao girar a câmera 45°, o personagem pode permanecer parado no mundo e mudar automaticamente para a linha correta do atlas.

## 4. Protótipo

`ro-visual-lab.html` implementa uma prova de conceito isolada:

- terreno com altura;
- projeção 2.5D;
- câmera giratória em incrementos de 45°;
- zoom;
- modelos volumétricos simples;
- personagens/NPCs billboards;
- atlas de 8 direções;
- composição de layers do jogador;
- sombra ancorada ao solo.

Ele não substitui a gameplay atual. Serve para validar a direção de renderer antes da migração.

## 5. Migração segura

1. Validar aparência no laboratório.
2. Extrair camera/projection em módulo estável.
3. Migrar um mapa pequeno de teste.
4. Migrar props principais para modelos/meshes simples.
5. Conectar a grade GAT-like de 8 px ao terreno projetado.
6. Conectar movimento do jogador.
7. Só depois migrar Judá completo.

Essa ordem evita reescrever simultaneamente renderer, colisão, quests e gameplay.


## 6. Mundo data-driven RSW-like

O laboratório deixou de manter o cenário hardcoded no renderer. O arquivo:

`assets/maps/judah/ro25d_world.json`

passa a funcionar como uma descrição de mundo inspirada conceitualmente no papel do RSW.

Ele contém:

- configuração de câmera;
- terreno e funções de altura;
- estradas;
- iluminação global;
- fog;
- água;
- modelos do cenário;
- palisadas;
- atores;
- spawn do jogador.

O renderer consome esse arquivo através de `src/ro-world-system.js`.

## 7. Lições incorporadas do BrowEdit3

A análise do BrowEdit3 reforçou quatro decisões:

1. **altura deve pertencer ao terreno**, e não ser simulada por z-index;
2. o terreno precisa aceitar quatro vértices com alturas independentes, mesmo quando o protótipo atual usa uma função contínua;
3. modelos de mundo precisam ter transformação própria e participar da profundidade;
4. iluminação do chão deve ser tratada como dado próprio, separada da textura base.

A Fase 15B já implementa uma aproximação dessas ideias:

- normal de terreno calculada por gradiente;
- iluminação direcional por latitude/longitude;
- ambient + diffuse;
- fog por profundidade;
- espessura visual nas bordas do terreno;
- props volumétricos;
- personagens billboard;
- fila única de profundidade para modelos + atores;
- seletor de célula GAT-like.

## 8. Próxima migração técnica

O próximo passo é substituir progressivamente os sólidos paramétricos do laboratório por meshes low-poly/texturizados originais do projeto, preservando:

`position + rotation + scale + material + collision`

como dados independentes do gameplay.


## 9. Modelo RSM-like reutilizável

O renderer passa a separar também a geometria de sua instância no mundo.

Biblioteca:

`assets/art/ro25d/model_library.json`

Runtime:

`src/ro-mesh-system.js`

Cada mesh possui:

- vértices locais;
- faces;
- slots de material.

Cada instância no mundo fornece:

- posição;
- largura/altura/profundidade;
- rotação Y;
- escala opcional;
- override de materiais.

Isso permite, por exemplo, utilizar a mesma geometria de tenda nas 12 tribos e alterar somente tecido, acabamento e proporção.

## 10. Materiais pixelados

O modelo não contém iluminação baked. As texturas são pequenas e nearest-neighbor, enquanto o renderer acrescenta:

- luz solar;
- ambient;
- diffuse;
- point lights;
- fog;
- sombra no terreno.

Esse pipeline preserva pixel art e, ao mesmo tempo, faz o objeto responder à câmera e à iluminação do mundo.

## 11. Point lights

O manifesto RSW-like aceita uma coleção `lights`.

O recorte de Judá 0.33 contém luzes locais para:

- fogueira central;
- oficina;
- duas tochas do portão.

O efeito usa atenuação por distância e mistura cromática sobre terreno e faces dos modelos.

## 12. Sombras direcionais

As sombras deixaram de ter offset fixo de tela. O deslocamento é calculado a partir da direção solar e depois projetado pela câmera.

Dessa forma, personagem, NPC e cenário compartilham uma leitura luminosa coerente.


## 13. Arquitetura tribal por especialização

A geometria genérica permanece disponível, mas estruturas narrativamente importantes podem possuir meshes especializados.

Exemplo:

`tent` → tenda genérica reutilizável.

`judah_standard_tent` → versão arquitetônica específica da Tenda do Estandarte de Judá.

A especialização não muda o formato de instância RSW-like. O mapa continua fornecendo:

`position + dimensions + rotationY + materials + meshId`

Isso permite que cada tribo ganhe identidade sem abandonar a arquitetura compartilhada.

## 14. Detalhamento sem duplicar gameplay

Elementos como:

- cordas;
- mastros;
- dosséis;
- placas;
- emblemas;
- bandeiras;
- cerâmica;
- tapetes;
- suportes de armas;

são puramente visuais. Eles não alteram automaticamente o GAT-like, colisão, quests ou interação.

## 15. Billboard acoplado à câmera

A Fase 17 corrige uma diferença importante do protótipo inicial: sprites agora escalam proporcionalmente ao zoom do mundo.

O fluxo passa a ser:

`world position -> project -> camera zoom -> billboard scale -> direction relative to camera`

O fog também influencia a opacidade do billboard, melhorando a integração com o cenário.
