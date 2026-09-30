# Referências técnicas externas

## Repositórios avaliados

### bgamez23/ROResourceCollection
Utilidade:
- organização oficial dos recursos;
- exemplos reais de `.spr/.act`;
- listas de classes, corpos, NPCs, monstros, acessórios e efeitos.

Observação:
- o repositório não possui licença explícita para os assets oficiais;
- usar apenas como referência estrutural;
- não incorporar sprites proprietários da Gravity.

### L1nkZ/raglib
Licença: MIT.

Formatos suportados:
- RSM
- GND
- GAT
- RSW
- SPR
- ACT

É a principal referência de especificação binária escolhida para o projeto.

### adsonpleal/ragassets
Licença: MIT.

Pontos úteis:
- parser/renderizador moderno de SPR/ACT;
- composição de corpo, cabeça, headgear, garment, arma e escudo;
- APNG;
- documentação clara da relação ação/direção;
- declara expressamente que não distribui assets de Ragnarok.

### zhad3/zrenderer
Licença: MIT.

Utilidade:
- composição e renderização de sprites Ragnarok;
- base técnica utilizada pelo ragassets.

### Tokeiburu/GRFEditor
Utilidade:
- parser/editor de SPR/ACT e GRF;
- referência para estrutura de layers e imagens.

Uso:
- consultar arquitetura;
- não copiar trechos sem verificar licença específica do código relevante.

### Tokeiburu/browedit
Utilidade:
- editor de mapas Ragnarok;
- demonstra separação GND/GAT/RSW;
- confirma criação de GAT em resolução 2× do GND.

Uso:
- referência estrutural.

### vthibault/roBrowser
Licença: GPLv3.

Utilidade:
- arquitetura de cliente Ragnarok no navegador.

Uso:
- referência conceitual; não incorporar código GPL no projeto sem decisão deliberada sobre compatibilidade de licença.

## Política do projeto

Crônicas da Promessa pode reproduzir **ideias de arquitetura, padrões de organização, pivôs, sistemas de layers, estrutura de ações e separação de mapa**, mas os gráficos, personagens, mapas, nomes visuais específicos e demais assets devem ser originais.


### adsonpleal/ragassets — observações adicionais

A análise do código confirmou dois conceitos importantes para nosso runtime:

- uma layer de ACT é posicionada pelo **centro da imagem**, portanto o canto superior esquerdo depende de `posição - metade do tamanho do frame`;
- sprites filhos, como cabeça e acessórios, podem usar **attach points** relativos ao corpo;
- o canvas final possui uma origem explícita independente do tamanho efetivo do frame;
- frames podem ter dimensões diferentes sem alterar a posição lógica do personagem.

Esses princípios fundamentam o novo `sprite_manifest.json` e o controlador de sprites do projeto.


### adsonpleal/latamvisuais

Licença: MIT.

Utilidade para Crônicas da Promessa:

- implementação Web moderna de navegação A* em oito direções sobre grade equivalente ao GAT;
- bloqueio de corte diagonal em quinas;
- agrupamento de passos diagonais para evitar animação serrilhada;
- separação entre posição lógica do agente e sprite exibido;
- uso de direção em oito sentidos para a caminhada;
- simulador de mapas que separa parsers de GAT/GND/RSW/RSM e renderização.

O projeto reforçou a decisão de usar uma **grade de navegação de 8 px** no protótipo Web e um controlador de direção independente da imagem visual.
