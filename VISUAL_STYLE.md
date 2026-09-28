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
