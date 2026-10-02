# Padrão de Modelos 2.5D — Crônicas da Promessa

Este documento define o formato visual dos modelos low-poly usados pelo renderer 2.5D.

A referência arquitetural é a separação clássica encontrada em mapas de Ragnarok Online: terreno, mundo, modelos e sprites são recursos independentes. A arte e os modelos de Crônicas da Promessa são originais.

## 1. Sistema de coordenadas

Modelo local:

- X: esquerda/direita;
- Y: altura;
- Z: profundidade;
- origem: centro da base no solo;
- Y=0: plano de apoio.

O modelo deve ser criado em proporção normalizada. A instância no mapa fornece:

- `x`;
- `z`;
- `w`;
- `h`;
- `d`;
- `rotationY`;
- `scale` opcional.

Isso equivale conceitualmente a manter geometria e transformação separadas.

## 2. Estrutura de mesh

A biblioteca está em:

`assets/art/ro25d/model_library.json`

Cada mesh contém:

```json
{
  "vertices": [[-0.5,0,-0.5], [0.5,0,-0.5]],
  "faces": [
    {"v":[0,1,2,3], "m":"wall"}
  ]
}
```

`v` contém índices de vértices e `m` é um slot de material.

## 3. Material slots

O mesh não precisa conhecer a cor final da tribo.

Exemplo de Tenda:

- `wall`;
- `roof`;
- `trim`.

Uma instância de Judá pode resolver esses slots como:

- wall → `cloth_cream`;
- roof → `cloth_red`;
- trim → `gold`.

Outra tribo pode reutilizar a mesma geometria mudando somente materiais.

## 4. Texturas

As texturas devem:

- ser originais do projeto;
- usar dimensões pequenas, normalmente 8×8, 12×12, 16×16 ou 24×24;
- usar `shape-rendering="crispEdges"` quando SVG;
- evitar blur;
- evitar gradientes fotográficos;
- manter contraste adequado à pixel art;
- funcionar com nearest-neighbor.

Texturas atuais:

- tecido creme;
- tecido vermelho;
- tecido verde;
- tecido azul;
- tecido ocre;
- madeira;
- madeira escura;
- pedra;
- folhagem;
- corda;
- dourado;
- areia;
- caminho.

## 5. Iluminação

A textura não deve possuir iluminação forte já pintada.

O renderer aplica:

- ambient;
- diffuse;
- direção solar;
- normal da face;
- fog.

Assim, o mesmo modelo responde corretamente à rotação e à iluminação do mapa.

## 6. Colisão

A geometria visual não define automaticamente a colisão.

Colisão e navegação continuam em dados próprios GAT-like. Isso evita que detalhes decorativos impeçam movimento indevidamente.

## 7. Escala e proporção

Objetos equivalentes devem reutilizar o mesmo mesh.

Exemplo:

`tent` + materiais + `w/h/d`

em vez de criar arquivos separados para cada cor de tenda.

Essa regra reduz duplicação e garante consistência entre as 12 tribos.

## 8. Modelos atuais

A biblioteca 0.34 inclui:

- `tent`;
- `workshop`;
- `gate`;
- `watchtower`;
- `well`;
- `crate`;
- `bench`;
- `rock`;
- `acacia`;
- `judah_standard_tent`;
- `judah_gate`;
- `judah_watchtower`;
- `judah_banner`;
- `amphora_cluster`;
- `rug`;
- `weapon_rack`.

## 9. Validação

Use:

```
node tools/validate-model-library.mjs assets/art/ro25d/model_library.json assets/maps/judah/ro25d_world.json
```

A validação verifica:

- vértices;
- faces;
- índices;
- materiais;
- texturas;
- referências de meshes no mundo.

## 10. Laboratório

Abra:

`model-lab.html`

para:

- selecionar um mesh;
- girar modelo;
- girar câmera;
- alternar wireframe;
- alternar textura;
- testar variações de material da tenda.

O modelo somente deve ser promovido para o mapa principal depois de aprovado neste laboratório.


## 11. Especialização por tribo

A biblioteca diferencia:

- **mesh-base**: forma genérica reutilizável;
- **mesh tribal**: forma com arquitetura ou ornamentos próprios de uma tribo.

A Tenda do Estandarte utiliza `judah_standard_tent`, enquanto tendas familiares podem continuar usando `tent`.

Esta regra deve ser aplicada somente quando a silhueta ou função narrativa justificar geometria própria.

## 12. Ornamentação

Ornamentos devem preferir slots de material e pequenas geometrias independentes a texturas gigantes.

Exemplo de slots usados em Judá:

- `stripe`;
- `curtain`;
- `banner`;
- `emblem`;
- `pole`;
- `rope`;
- `bronze`.

Assim, o mesmo mesh continua editável e modular.
