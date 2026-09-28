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
