# Arquitetura de desempenho — Crônicas da Promessa

A Fase 0.35 introduz um caminho explícito de desempenho para que a evolução visual 2.5D não torne a gameplay inviável em navegador.

## 1. Gargalos identificados no renderer Canvas 2D

Antes da otimização, o laboratório 2.5D executava por quadro:

- projeção de todo o terreno, mesmo fora da tela;
- `Math.sin/cos` repetidos para praticamente cada vértice;
- reconstrução completa de meshes, normais e materiais;
- `createPattern()` repetido em muitas faces/t tiles;
- preenchimentos do tamanho da tela inteira dentro de clips pequenos;
- point lights recalculadas por face;
- palisada desenhada integralmente;
- DPR de até 2.0, quadruplicando a quantidade física de pixels.

Esses custos são aceitáveis para um laboratório pequeno, mas não para gameplay contínua.

## 2. Pipeline 0.35

### Pré-cálculo estático

São preparados apenas uma vez:

- alturas e normais do terreno;
- classificação de caminhos;
- iluminação solar por tile;
- contribuição das point lights por tile;
- vértices transformados dos meshes;
- normais de faces;
- materiais resolvidos;
- contribuição das point lights por face;
- posições da palisada.

A cada frame ficam principalmente:

- projeção de câmera;
- culling;
- depth sort do que está visível;
- rasterização.

### Culling em screen space

Tiles, modelos, NPCs, jogador e palisada podem ser ignorados quando sua projeção está fora do viewport.

O preset de desempenho usa uma margem menor.

### Pattern cache

Texturas passam a reutilizar `CanvasPattern`.

A criação do pattern deixa de ocorrer novamente para cada face/tile.

### Bounding-box fill

Uma face pequena não executa mais um `fillRect` do tamanho de toda a tela.

O preenchimento é restrito ao retângulo projetado da própria face.

### DPR adaptativo

- Alta: até 1.50;
- Equilibrada: até 1.15;
- Desempenho: 1.00.

Essa é uma das otimizações mais relevantes em telas com devicePixelRatio alto.

## 3. Qualidade adaptativa

O laboratório possui:

- Automático;
- Alta;
- Equilibrada;
- Desempenho.

Em Automático o sistema mede o custo médio de renderização e pode reduzir ou elevar o preset.

### Alta

Mantém:

- texturas de terreno;
- texturas de meshes;
- point lights;
- sombras;
- fog.

### Equilibrada

Desliga texturas por tile do terreno, mas mantém:

- texturas de meshes;
- point lights;
- sombras;
- fog.

### Desempenho

Prioriza resposta:

- DPR 1.0;
- sem textura de terreno por tile;
- sem textura dos meshes;
- sem point lights;
- sem sombras;
- sem fog;
- palisada em menor densidade.

## 4. Gameplay DOM

O jogo principal também foi otimizado.

Alterações:

- NPCs/animais atualizam posição aproximadamente a 30 Hz;
- personagem continua atualizado a cada frame;
- z-order dinâmico é recalculado a 20 Hz;
- minimapa/quest/UI ambiental atualiza a 10 Hz;
- interação é reavaliada a 12,5 Hz;
- relógio só altera DOM quando o minuto muda;
- classes de caminhada só são alteradas quando o estado muda.

Também foi criado o seletor:

- Automático;
- Alta;
- Equilibrada;
- Desempenho.

No modo Auto, FPS baixos removem progressivamente:

- backdrop blur;
- filtros/drop shadows caros;
- animações decorativas;
- efeitos não essenciais.

## 5. Estratégia GPU

Foram avaliados no GitHub:

### mrdoob/three.js

- licença MIT;
- renderer WebGL/WebGPU;
- adequado para terreno, meshes, materiais, sprites/billboards e câmera.

### pixijs/pixijs

- licença MIT;
- excelente para sprites 2D, batching e UI/gameplay 2D;
- menos natural para o terreno/modelos 3D que fazem parte da direção Ragnarok-like.

Para o renderer 2.5D completo, Three.js é a referência de GPU mais compatível com a arquitetura visual desejada. PixiJS permanece uma alternativa forte para camadas 2D e UI.

## 6. Estratégia adotada

A migração não será feita de uma vez.

Ordem:

1. otimizar o Canvas existente;
2. medir FPS/custo real nos navegadores do projeto;
3. preservar manifesto GND/RSW/RSM-like independente do renderer;
4. criar backend WebGL/GPU consumindo os mesmos manifests;
5. migrar a gameplay apenas depois de o backend GPU superar o Canvas em estabilidade.

Isso evita acoplar quests, colisão e save a uma tecnologia gráfica específica.

## 7. Telemetria

`ro-visual-lab.html` exibe:

- FPS médio do render;
- ms médios por frame;
- DPR efetivo;
- preset de qualidade.

Esses dados devem ser usados nas próximas validações.


## 8. Fase 0.36 — fluidez de gameplay

A otimização foi ampliada para os hot paths que ainda provocavam pausas perceptíveis.

### DOM e sprites

O personagem, NPCs e animais usam `CSS translate` individual quando disponível. Isso evita alterar `left/top` durante movimento contínuo e reduz invalidacões de layout.

Os controladores SPR/ACT-like agora são dirty-driven:
- não reescrevem width/height a cada RAF;
- não reescrevem classes/datasets quando a direção não mudou;
- só mudam o recorte do atlas quando o frame realmente avança.

### Navegação

O A* foi migrado de `Map/Set` para:
- `Int32Array`;
- `Float64Array`;
- `Uint8Array`.

A walkability é cacheada por consulta. Em Balanced/Performance a rota externa usa célula lógica de 16 px, reduzindo a malha pesquisada para aproximadamente 1/4 do número de células do modo High.

### Resolução e frame pacing

A análise do `AesirWorld/client` mostrou que o ROBrowser separa tamanho CSS e resolução interna do canvas conforme a qualidade. O mesmo princípio foi incorporado ao laboratório.

Presets:
- High: 60 Hz, scale 1.00;
- Balanced: 50 Hz, scale 0.85;
- Performance: 30 Hz, scale 0.70.

A simulação continua sendo atualizada pelo RAF; apenas a apresentação gráfica cara é limitada pelo frame pacing.

## 9. Backend GPU experimental

Foi criado `ro-gpu-lab.html` com Three.js/WebGL.

Ele consome os mesmos:
- `ro25d_world.json`;
- `model_library.json`;
- `sprite_manifest.json`.

Implementado:
- terreno em BufferGeometry;
- modelos estáticos agrupados por material;
- UVs gerados para materiais pixelados;
- iluminação ambiente/direcional/point lights;
- frustum culling da GPU;
- NPCs como sprites billboard;
- personagem em layers billboard;
- filtros nearest;
- presets de pixel ratio;
- telemetria de FPS/draw calls/triângulos.

O laboratório GPU é propositalmente separado da gameplay. Ele só deve substituir o backend Canvas quando os testes reais demonstrarem vantagem consistente.

## 10. Lições confirmadas no GitHub

O estudo de `AesirWorld/client` confirmou práticas importantes:
- resolução interna configurável;
- buffers estáticos na GPU;
- atlas de textura no terreno para reduzir draw calls;
- Web Worker para processamento/carregamento pesado do mapa.

Essas práticas orientam as próximas otimizações do Crônicas da Promessa sem incorporar código GPL do projeto de referência.
