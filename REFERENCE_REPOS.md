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
