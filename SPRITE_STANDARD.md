# Padrão de Sprite — Crônicas da Promessa

Este documento define a arquitetura visual oficial de personagens e NPCs do projeto. A referência estrutural é a arquitetura de sprites do Ragnarok Online, sem reutilizar artes proprietárias da Gravity.

## 1. Princípio

Ragnarok separa **imagem** e **animação**:

- `.spr`: imagens dos frames, com dimensões variáveis, paleta e transparência.
- `.act`: ações, frames, camadas, posição, espelhamento, cor, escala, rotação, índice do sprite, largura/altura, âncoras, som e velocidade.

Em Crônicas da Promessa não precisamos usar `.spr/.act` diretamente. Vamos reproduzir o conceito com PNGs próprios + metadados compatíveis com Godot/Web.

## 2. Direções oficiais

A arquitetura fica pronta para 8 direções, na mesma ordem lógica usada pelo modelo estudado:

0. Sul / frente
1. Sudoeste
2. Oeste
3. Noroeste
4. Norte / costas
5. Nordeste
6. Leste
7. Sudeste

Na fase atual, as quatro direções cardinais são obrigatórias: Sul, Oeste, Norte e Leste. As diagonais podem ser adicionadas sem mudar o padrão.

## 3. Ações

Os arquivos ACT analisados no repositório ROResourceCollection possuem **104 ações = 13 blocos × 8 direções**.

Padrão de referência observado nos corpos estudados:

| Bloco | Ação | Frames observados |
|---:|---|---:|
| 0 | Idle / parado | 3 |
| 1 | Caminhada | 8 |
| 2 | Sentar | 3 |
| 3 | Coletar / pegar | 3 |
| 4 | Prontidão | 6 |
| 5 | Ataque | 5 |
| 6 | Dano | 3 |
| 7 | Atordoado | 1 |
| 8 | Caído / morto | 1 |
| 9 | Estado especial | 1 |
| 10 | Ação especial A | 9 |
| 11 | Ação especial B | 8 |
| 12 | Ação especial C | 6 |

### MVP de Crônicas da Promessa

Personagem jogável:
- idle: 3 frames por direção;
- walk: 8 frames por direção;
- interact: 3 frames;
- work: 6 frames;
- hurt: 3 frames;
- optional attack/action: 5 frames.

NPC comum:
- idle: 3;
- walk: 8;
- talk/interact: 3.

NPC de profissão:
- idle: 3;
- walk: 8;
- work: 6;
- talk: 3.

## 4. Proporções aprovadas

A aparência aprovada no projeto continua sendo a referência.

### Adulto
- envelope corporal lógico: **64 × 88 px**;
- linha-base dos pés: y = 84 px;
- origem visual: centro dos pés;
- corpo deve ocupar aproximadamente 44–56 px de largura e 70–82 px de altura;
- acessórios não alteram a escala corporal.

### Criança
- 75–80% da altura visual de um adulto;
- mesma linha-base lógica quando posicionada no mapa.

### Acessórios grandes
Lanças, cajados, mantos e efeitos podem ultrapassar o envelope corporal. Nestes casos:
- canvas expandido permitido: até **96 × 112 px**;
- o corpo continua com a mesma escala do adulto;
- o pivot continua preso aos pés;
- nunca reduzir/aumentar o corpo para fazer o acessório caber.

Isto resolve o problema observado anteriormente em que guardas pareciam maiores por causa da lança.

## 5. Camadas do personagem personalizável

Ordem lógica:

1. shadow
2. body
3. outfit
4. garment_back
5. weapon_back
6. head
7. hair
8. headgear_back
9. headgear_middle
10. headgear_front
11. weapon_front
12. shield
13. effect

Todas as camadas devem compartilhar a mesma:
- direção;
- ação;
- frame;
- origem dos pés;
- escala.

NPCs fixos podem ser exportados já compostos para reduzir draw calls.

## 6. Estrutura recomendada

```
assets/art/pixel/
  characters/
    male/
      body/
      hair/
      outfits/
      equipment/
    female/
      body/
      hair/
      outfits/
      equipment/
  npcs/
    eliabe/
    elder/
    miria/
    hanan/
    guard/
  metadata/
    characters.json
    npcs.json
```

## 7. Nome dos arquivos

Formato:

```
<id>_<action>_<direction>_<frame>.png
```

Exemplos:

```
eliabe_idle_s_00.png
eliabe_idle_s_01.png
eliabe_walk_w_00.png
eliabe_walk_w_01.png
eliabe_walk_n_07.png
```

Direções:
- s
- sw
- w
- nw
- n
- ne
- e
- se

## 8. Importação Godot

- Texture Filter: Nearest
- Mipmaps: Off
- Repeat: Disabled
- compressão sem suavização perceptível
- AnimatedSprite2D ou AnimationPlayer
- pivot/origin sempre nos pés
- Y-sort baseado na posição dos pés, não no centro da imagem

## 9. Regra de consistência

Nenhum NPC adulto pode receber escala diferente apenas para corrigir um PNG mal enquadrado. A correção deve ocorrer no canvas, margem transparente ou offset do frame.

A escala no mundo deve permanecer uniforme.

## 10. Referências técnicas

- `bgamez23/ROResourceCollection`: pares reais `.SPR/.ACT` e documentação da organização original.
- `L1nkZ/raglib`: especificações Kaitai de SPR e ACT; MIT.
- `adsonpleal/ragassets`: implementação moderna de composição/renderização de sprites; MIT; não distribui assets de Ragnarok.
- `zhad3/zrenderer`: renderizador de sprites; MIT.
- `Tokeiburu/GRFEditor`: editor/leitor detalhado de SPR/ACT; referência técnica.
- `vthibault/roBrowser`: cliente web histórico; GPLv3; referência de arquitetura.

**Importante:** os assets gráficos oficiais de Ragnarok não são incorporados ao projeto. As artes de Crônicas da Promessa devem permanecer originais.


## 11. Ordem de camadas dependente da direção

A ordem de desenho não é fixa. O runtime deve resolver a prioridade conforme a direção do personagem.

Padrão adotado:

- `shadow` sempre abaixo;
- acessórios marcados como `behind` abaixo do corpo;
- `body`, `head`, `weapon` e `shield` podem trocar a ordem relativa entre frente/costas;
- `garment`/capa fica atrás nas direções frontais e pode passar à frente quando o personagem vira de costas;
- efeitos especiais ficam acima das camadas normais.

A implementação está em `src/character-layers.js` e o catálogo de papéis em `assets/art/pixel/metadata/character_view.json`.

## 12. Canvas lógico x canvas de produção

O envelope corporal adulto continua sendo **64×88 px**, mas o arquivo de produção pode usar **96×112 px** com fundo transparente e origem nos pés em **(48,108)**. Isso permite lança, cajado, ferramentas, véu e capa sem reduzir o corpo.

O primeiro pacote que adota formalmente esse padrão é `assets/art/pixel/npcs/eliabe/eliabe.sprite.json`.
