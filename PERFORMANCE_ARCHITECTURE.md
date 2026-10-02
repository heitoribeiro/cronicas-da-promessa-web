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
