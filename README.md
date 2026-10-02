# Crônicas da Promessa — Web

Jogo 2D/2.5D para navegador, ambientado no acampamento dos israelitas no deserto.

## Web Alpha 0.1
- menu inicial
- criação de personagem
- 12 tribos e 4 vocações
- primeiro mapa jogável de Judá
- movimentação WASD/setas
- câmera seguindo o personagem
- primeira interação contextual
- inventário/reputação iniciais
- save local no navegador

A arquitetura inicial é deliberadamente estática e compatível com GitHub Pages. Supabase/Railway não são necessários nesta fase.


## Web Alpha 0.16
- bolsa funcional acessível pelo botão BOLSA ou tecla `I`
- ferramenta específica da vocação entregue por Eliabe
- ferramenta equipada reduz o consumo de energia durante o trabalho
- produção das vocações pode ser entregue no Armazém de Judá
- cada entrega gera uma ração de viagem utilizável fora do horário da cozinha
- mapa e marcador orientam a entrega quando houver produção disponível
- save anterior continua compatível por normalização automática do estado


## Web Alpha 0.17
- interface refinada com HUD agrupado e painel de tarefas sem informações duplicadas
- clique com o mouse no cenário para caminhar até o destino
- cálculo de rota em grade para contornar obstáculos básicos
- WASD/setas continuam disponíveis e cancelam a rota do mouse
- marcador visual de destino no chão
- autosave periódico, por eventos e ao ocultar/fechar a página
- menu do jogo com Salvar agora, Exportar save e Importar save
- saves exportados em JSON podem ser transferidos entre computador e celular
- botão ☰ agora abre o menu do jogo em vez de sair imediatamente


## Web Alpha 0.18
- prompt de interação agora é clicável com o mouse, mantendo a tecla `E`
- texto do prompt no desktop indica `CLIQUE / E`
- clique em NPC aproxima o personagem; a confirmação ocorre no prompt para evitar interações ambíguas
- HUD superior esquerdo redesenhado como uma janela compacta de MMORPG, com retrato, identidade, reputação, horário, energia, fome e bolsa
- mensagens de alimentação só aparecem quando são relevantes
- botão `DIÁRIO` e atalho `J`
- Diário de Quests com abas `Em andamento` e `Concluídas`
- a missão principal concluída é movida para o histórico
- rotinas diárias concluídas aparecem no histórico com o dia de conclusão
- quests e trabalhos concluídos deixam de ocupar permanentemente a HUD principal


## Web Alpha 0.18.1
- Hanan reposicionado para trabalhar e circular fora da área física da Cozinha
- Eliabe reposicionado para circular em frente e nas laterais externas da Oficina
- rotas de Hanan desenhadas como um arco de circulação externo, sem atravessar o edifício
- rotas de Eliabe desenhadas ao redor da fachada da Oficina, sem cruzar sua caixa de colisão
- marcador da missão de Eliabe atualizado para a área externa da Oficina
- proteção de zona impede que os dois NPCs derivem para dentro da construção durante suas rotinas de trabalho
- deslocamentos de Eliabe entre Oficina e Armazém continuam livres e independentes da proteção da zona de trabalho


## Web Alpha 0.18.2
- Hanan passa a contornar a pilha de caixas e suprimentos, sem atravessar esses objetos
- opção `Exibir FPS` adicionada ao Menu do jogo e persistida no save
- contador mostra FPS e tempo médio por quadro em milissegundos
- indicador visual muda de estado abaixo de 50 FPS e abaixo de 30 FPS
- iluminação noturna deixou de usar `mix-blend-mode: multiply`, reduzindo custo de composição
- animação da fogueira deixou de animar `filter: drop-shadow` e passou a usar pulso de opacidade mais leve
- assets estáticos não usam mais `will-change` desnecessariamente
- câmera usa `translate3d` para aproveitar melhor a composição do navegador
- atualização da classe de iluminação ocorre somente quando muda o período do dia


## Web Alpha 0.19
- baú pessoal da tenda agora é um armazenamento funcional
- recursos podem ser movidos entre Bolsa e Baú individualmente
- Bolsa passa a ter capacidade de 16 unidades de carga
- Baú possui capacidade de 80 unidades de carga
- cada recurso possui custo de carga próprio
- itens de missão não podem ser guardados no baú
- ferramentas equipáveis permanecem fora do cálculo de carga nesta fase
- HUD da bolsa mostra a carga atual e a capacidade máxima
- o trabalho não pode ser concluído quando não houver espaço para receber a produção
- o Armazém não entrega ração quando a bolsa estiver sem espaço
- itens de missão obtidos no cenário respeitam a capacidade da bolsa
- armazenamento é persistido no autosave e também nos saves exportados em JSON
- saves anteriores são migrados automaticamente com baú vazio, sem perda de progresso


## Direção visual oficial

O projeto adota agora o **estilo Pixel RPG bíblico-desértico**, com HUD escura/dourada e interfaces inspiradas nos mockups aprovados. Consulte [VISUAL_STYLE.md](VISUAL_STYLE.md) para a especificação.


## Web Alpha 0.19.1
- corrige falha que ocultava a janela do baú imediatamente após a interação
- o prompt `CLIQUE / E — Abrir baú` agora abre corretamente o armazenamento pessoal
- mantém intactos o sistema de capacidade, transferências e compatibilidade de saves da 0.19


## Web Alpha 0.21 — mecânica
- mantém a direção visual Pixel RPG aplicada na série 0.20.x
- inventário passa a classificar itens como Materiais, Consumíveis e Itens de missão
- ferramenta da vocação fica em seção própria de Equipamento
- progressão independente por vocação adicionada ao save
- cinco níveis de proficiência: Aprendiz, Praticante, Experiente, Hábil e Mestre
- cada turno completo concede 10 XP da vocação
- Nível 2 reduz em 1 o custo de energia por etapa de trabalho
- Nível 3 acrescenta 1 unidade à produção de cada turno
- Nível 4 acrescenta 1 ponto de reputação por turno
- Nível 5 amplia redução de energia e bônus de produção
- Bolsa exibe nível, XP, turnos concluídos, barra de progresso e benefícios desbloqueados
- HUD compacto exibe o nível atual da vocação
- saves anteriores são migrados automaticamente com progressão iniciada no Nível 1


## Arquitetura visual

A direção visual Pixel RPG bíblico-desértico agora possui documentação e runtime próprios:

- `SPRITE_STANDARD.md` — ações, direções, frames, layers, pivôs e personalização.
- `MAP_STANDARD.md` — terreno, colisão, objetos, profundidade e estrutura de mapas.
- `REFERENCE_REPOS.md` — referências externas e política de uso.
- `assets/art/pixel/metadata/sprite_manifest.json` — metadados consumidos pelo jogo.
- `src/sprite-system.js` — controlador de direção/animação preparado para 4/8 direções.


### Runtime de mapas

- `assets/maps/tribes_manifest.json` — registro central das 12 tribos e seus mapas.
- `assets/maps/judah/map_manifest.json` — estado atual do mapa jogável de Judá.
- `src/map-system.js` — limites, conversão de coordenadas e Y-sort pela linha dos pés.
- `src/pathfinding.js` — A* em oito direções sobre a grade de navegação de 8 px.


### Pipeline visual modular

- `VISUAL_PIPELINE.md` — fluxo de produção e validação de personagens/NPCs.
- `assets/art/pixel/metadata/character_view.json` — papéis e camadas do personagem.
- `src/character-layers.js` — resolução de profundidade por direção.
- `assets/art/pixel/npcs/eliabe/eliabe.sprite.json` — primeiro pacote-modelo de NPC.
- `tools/validate-sprite-pack.mjs` — valida pacotes de sequência PNG e atlas SVG, incluindo dimensões, ações e quantidade de frames.


### Laboratório visual

Abra `sprite-lab.html` no GitHub Pages para validar NPCs sem entrar na gameplay. O laboratório permite selecionar Ancião, Eliabe, Miriã, Hanan ou Guarda, alternar as ações disponíveis, pausar a animação, ligar/desligar a grade e comparar as oito direções.
