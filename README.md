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
