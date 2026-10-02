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


## Aplicação — Fase 9

A arquitetura de mapas inspirada em GND/GAT/RSW passa a ser usada pelo runtime Web:

- `assets/maps/judah/map_manifest.json` centraliza dimensões, grade, layers, distritos, spawn points e transições;
- `src/map-system.js` converte coordenadas e fornece limites/y-sort orientados pela linha dos pés;
- `src/pathfinding.js` substitui a busca em grade grossa por A* de 8 px em oito direções;
- o protótipo continua em 1800×1200 para não quebrar a mecânica atual, enquanto 3072×1536 permanece como alvo dos mapas definitivos.

Essa etapa aproxima a engenharia do jogo da separação clássica `terreno / navegação / mundo`, mantendo toda a arte original de Crônicas da Promessa.


## Aplicação — Fase 10

A camada visual passa a usar uma arquitetura de personagem modular inspirada na separação clássica de sprites de Ragnarok Online, mantendo arte 100% original.

- definida ordem de camadas dependente da direção;
- separados `shadow`, corpo, cabeça, cabelo, acessórios, garment, arma, escudo e efeitos;
- estabelecido canvas de produção 96×112 com corpo lógico 64×88;
- Eliabe passa a ser o primeiro NPC-modelo para 8 direções e ações `idle`, `walk`, `talk` e `work`;
- criado validador automático de pacote de sprites;
- referências GPL continuam apenas como estudo, sem incorporar código ao runtime principal.

Esta fase é deliberadamente aditiva para não interferir nas mecânicas estabilizadas no outro fluxo de desenvolvimento.


## Aplicação — Fase 11

Eliabe torna-se o primeiro NPC realmente migrado do modo estático para o novo runtime inspirado em SPR/ACT.

- quatro atlas SVG originais: `idle`, `walk`, `talk` e `work`;
- 8 direções por ação: S, SW, W, NW, N, NE, E, SE;
- canvas por frame: **96×112 px**;
- pivô dos pés: **(48,108)**;
- `walk`: 8 frames por direção;
- `idle`: 3 frames;
- `talk`: 3 frames;
- `work`: 6 frames;
- o runtime recorta o atlas por metadados, sem redimensionar o corpo;
- o sprite pode exceder o envelope corporal sem alterar colisão ou Y-sort.

Os atlas são arte original do projeto e não reutilizam sprites do Ragnarok Online. A arquitetura, não a arte, é a referência.


## Aplicação — Fase 11B

Foi criado um laboratório visual separado da gameplay para validar os novos sprites antes de replicá-los para outros NPCs:

- `sprite-lab.html`;
- comparação simultânea das 8 direções;
- seleção entre `idle`, `walk`, `talk` e `work`;
- grade de referência do canvas;
- pausa da animação;
- indicação de frame, pivô e dimensões.

Eliabe também passa a usar a animação `work` quando aparece dentro da Oficina, mantendo uma instância visual independente do NPC externo.


## Aplicação — Fase 12

A migração do sistema de NPCs adultos para atlas 8-way foi ampliada.

NPCs agora em modo `atlas`:

- Ancião — `idle`, `walk`, `talk`;
- Eliabe — `idle`, `walk`, `talk`, `work`;
- Miriã — `idle`, `walk`, `talk`;
- Hanan — `idle`, `walk`, `talk`, `work`;
- Guarda de Judá — `idle`, `walk`, `talk`, `ready`.

Todos usam:

- 8 direções;
- canvas 96×112;
- pivô dos pés em (48,108);
- escala corporal adulta 1.0;
- Y-sort e colisão independentes do tamanho total do atlas.

O Ancião também passa a usar seu atlas quando aparece no interior da Tenda do Estandarte.

O laboratório `sprite-lab.html` agora permite selecionar qualquer NPC já migrado e comparar suas oito direções e ações disponíveis.

Versão visual: **Web Alpha 0.28**.


## Aplicação — Fase 13

A Criança do Rebanho deixa o modo `static_legacy` e completa a migração dos NPCs atuais para a arquitetura de atlas.

- canvas infantil: **80×96 px**;
- envelope corporal: aproximadamente **48×66 px**;
- pivô dos pés: **(40,92)**;
- proporção visual aproximada: 78% da altura adulta;
- 8 direções;
- `idle`: 3 frames;
- `walk`: 8 frames;
- `talk`: 3 frames;
- cajado de pastoreio ocupa a margem do canvas sem aumentar o corpo.

Todos os NPCs atualmente presentes no mapa de Judá passam a usar a mesma arquitetura de direção/ação/pivô, com escala corporal adequada à idade.

Versão visual: **Web Alpha 0.29**.


## Aplicação — Fase 14

Os personagens jogáveis masculino e feminino passam para a arquitetura visual em camadas inspirada no modelo clássico de MMORPGs como Ragnarok Online, mantendo toda a arte original do projeto.

### Runtime do jogador

- 8 direções: S, SW, W, NW, N, NE, E e SE;
- `idle`: 3 frames;
- `walk`: 8 frames;
- canvas: **96×112 px**;
- pivô dos pés: **(48,108)**;
- layers independentes:
  - `garment`;
  - `body`;
  - `outfit`;
  - `hair/accessory`;
- ordem de desenho resolvida conforme a direção;
- o retrato do HUD usa as mesmas camadas do personagem no mundo.

O personagem masculino mantém túnica desértica, cabelo castanho e garment vermelho. O personagem feminino mantém roupa laranja, cabelo escuro e véu azul, preservando a identidade visual previamente aprovada.

Foi criado `character-lab.html` para validar cada layer separadamente e comparar as oito direções antes de adicionar armas, escudos, capas e headgears.

Versão visual: **Web Alpha 0.30**.
