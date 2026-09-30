# Direção visual oficial — Pixel RPG bíblico-desértico

A partir desta atualização, **Crônicas da Promessa** adota como direção de arte oficial o visual aprovado na opção 2 dos mockups:

- pixel art RPG bíblico-desértico;
- HUD escura em azul-preto/grafite com molduras douradas;
- menus e painéis com alto contraste, cantos discretos e aparência de interface de RPG;
- textos principais em creme/dourado;
- vermelho e azul como cores de destaque das tribos e da narrativa;
- mapas em areia quente, caminhos legíveis e vegetação/estruturas com contornos fortes;
- diálogos com retrato do NPC, nome destacado e caixa larga na parte inferior;
- missões, inventário, mapa e menu interno seguindo a mesma linguagem visual;
- renderização de sprites e assets configurada para aparência mais nítida/pixelada.

## Escopo desta aplicação

Esta etapa aplica a nova linguagem visual na interface web existente sem alterar a lógica principal do jogo. O sistema de movimentação, NPCs, rotinas, missões, inventário, mapa, save e demais mecânicas permanecem funcionando sobre a nova camada visual.

Os assets SVG existentes continuam temporariamente como base funcional, com tratamento de contraste, saturação, sombras e renderização nítida. Eles podem ser substituídos gradualmente pelos novos sprites/tilesets pixel art sem necessidade de refazer a interface.

## Referência visual

Prioridade de implementação:
1. Gameplay em visão superior com acampamento bíblico-desértico.
2. HUD escura/dourada semelhante ao mockup aprovado.
3. Diálogos com retrato.
4. Diário de missões, inventário e mapa em painel escuro.
5. Menu principal com cenário de acampamento e moldura RPG.

Esta documentação deve ser usada como referência para manter o chat de desenvolvimento mecânico e o chat de direção visual alinhados.


## Aplicação — Fase 2

A segunda etapa de integração aproxima o gameplay diretamente do mockup aprovado:

- painel de personagem compacto no canto superior esquerdo;
- painel de missões abaixo do personagem;
- minimapa permanente no canto superior direito com posição do jogador e objetivo;
- hotbar de seis slots no canto inferior esquerdo;
- atalhos de diário, inventário, mapa e menu no canto inferior direito;
- layout responsivo específico para 1280x720 e celular horizontal;
- atualização da interface para Web Alpha 0.20.

A estrutura continua usando os sistemas mecânicos já existentes. A próxima fase visual é a substituição progressiva dos SVGs temporários do cenário por sprites/tiles pixel art definitivos.


## Aplicação — Fase 3

A terceira etapa substitui os principais assets vetoriais de aparência suave por versões de **pixel art de paleta limitada e bordas duras**, preservando as mesmas dimensões lógicas usadas pela gameplay:

- Tenda do Estandarte;
- Tendas familiares;
- Torres de vigia;
- Portão;
- Fogueira;
- Poço;
- Oficina;
- Armazém;
- Acácia;
- Arbustos;
- Rochas;
- Pilhas de suprimentos.

Os novos SVGs usam `shape-rendering="crispEdges"`, formas geométricas em grade e ausência de gradientes/blur, reduzindo a aparência de paper art. A mecânica, posições, colisões e dimensões do mapa permanecem inalteradas.


## Aplicação — Fase 4

Foram integrados os sprites pixel art aprovados para personagens e NPCs, preservando a proporção definida pelo mockup oficial.

### Grade de personagem
- frame lógico: **64 × 88 px**;
- sheet jogável: **128 × 352 px**;
- 2 frames por direção;
- ordem das direções: frente, esquerda, direita e costas;
- renderização por nearest/pixelated;
- proporção de gameplay calibrada para o viewport 1280 × 720.

### Assets integrados
- personagem masculino;
- personagem feminino;
- Ancião;
- Guarda;
- Miriã;
- Eliabe;
- Hanan.

Os personagens jogáveis agora utilizam o sprite sheet aprovado diretamente na animação de caminhada. Os NPCs e retratos de diálogo foram substituídos pelos novos PNGs pixel art. O personagem infantil permanece temporariamente no asset anterior até receber modelo próprio na mesma linguagem.


## Aplicação — Fase 5

### Normalização de personagens

A escala dos NPCs foi revisada a partir das capturas reais da gameplay. Todos os humanoides adultos agora compartilham a mesma caixa lógica `64×88 px` e a mesma linha-base dos pés. Ajustes ópticos individuais compensam acessórios e margens internas dos PNGs sem alterar colisão ou coordenadas.

- Ancião: correção leve de escala.
- Eliabe: escala-base.
- Miriã: ampliação óptica para igualar altura corporal.
- Hanan: escala-base.
- Guarda: redução óptica para que a lança não faça o personagem parecer maior que os demais.
- Criança do Rebanho: permanece propositalmente menor.

### Refinamento do mapa de Judá

- praça central reduzida;
- caminhos principais mais estreitos;
- solo com variação sutil de textura mantendo a grade de 16 px;
- novos agrupamentos ambientais de arbustos, rochas e suprimentos;
- redução das áreas visualmente vazias, sobretudo nas bordas sul e direita;
- setores permanecem legíveis, mas com marcação mais discreta.

Os elementos adicionados nesta fase são decorativos e não modificam colisões, rotinas, missões ou navegação.


## Aplicação — Fase 6

A linguagem pixel art aprovada passa a abranger os últimos elementos ainda visivelmente ligados ao estilo anterior:

- Criança do Rebanho redesenhada em pixel art, mantendo proporção infantil.
- Ovelhas e cabra convertidas para sprites com bordas rígidas, paleta limitada e escala compatível com os personagens.
- Interior da Tenda do Estandarte redesenhado em grade visual de 16 px.
- Interior da Oficina redesenhado, preservando a forja próxima da coordenada de interação existente.
- Interior da tenda do jogador redesenhado, preservando cama, baú e saída nas áreas usadas pela mecânica.

Os interiores permanecem em canvas lógico de **1000×700**, portanto câmera, colisões e coordenadas de interação existentes não precisam ser alteradas. A versão visual passa a **Web Alpha 0.24**.


## Aplicação — Fase 7

O projeto passa a adotar formalmente uma arquitetura visual inspirada na organização técnica de Ragnarok Online, sem reutilizar os assets proprietários do jogo.

Foram definidos dois padrões oficiais:

- [SPRITE_STANDARD.md](SPRITE_STANDARD.md): direções, ações, frames, pivô nos pés, proporções, camadas e organização dos personagens/NPCs.
- [MAP_STANDARD.md](MAP_STANDARD.md): separação entre terreno, navegação/colisão, objetos, efeitos, áudio e transições.
- [REFERENCE_REPOS.md](REFERENCE_REPOS.md): repositórios externos avaliados e política de uso.

A nova arquitetura mantém a aparência Pixel RPG bíblico-desértico aprovada e prepara o projeto para personagens personalizáveis, NPCs consistentes e mapas modulares.


## Aplicação — Fase 8

A arquitetura de sprites passa a existir também no runtime Web, não apenas na documentação.

- criado `assets/art/pixel/metadata/sprite_manifest.json`;
- criado `src/sprite-system.js`;
- NPCs agora recebem metadados de canvas, pivô, direção, ação e quantidade de frames;
- o controlador aceita 4 ou 8 direções;
- o modo atual `static_legacy` mantém os sprites existentes enquanto os novos sheets são produzidos;
- o modo `sequence` já está preparado para carregar arquivos `<npc>/<ação>/<direção>/<frame>.png`;
- Y-sort e colisão continuam independentes do tamanho total do canvas.

A correção de escala presente nos NPCs antigos foi movida para o manifesto como compatibilidade temporária. Os novos sprites deverão usar escala 1.0 e resolver diferenças por canvas, pivô e offset, seguindo o padrão documentado em `SPRITE_STANDARD.md`.

Versão visual: **Web Alpha 0.25**.
