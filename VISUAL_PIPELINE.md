# Pipeline Visual — Personagens e NPCs

Este pipeline transforma a referência visual aprovada em assets consistentes para Web/Godot sem acoplar arte e mecânica.

## 1. Princípio

A referência estrutural é o sistema de personagem em camadas observado em clientes e renderizadores de Ragnarok Online:

- corpo e imagem não determinam a posição do personagem;
- a origem lógica permanece nos pés;
- cabeça/equipamentos podem ser filhos de pontos de encaixe;
- a ordem de desenho muda conforme a direção;
- frames podem ter dimensões diferentes;
- sombra, corpo, cabeça, acessórios, garment, arma, escudo e efeitos são conceitos separados.

A arte final de Crônicas da Promessa é original.

## 2. Canvas de produção

Para NPC adulto padrão:

- envelope corporal: 64 × 88 px;
- canvas de produção recomendado: 96 × 112 px;
- origem/pés: x=48, y=108;
- corpo visível: aproximadamente 44–56 px de largura e 70–82 px de altura;
- acessórios podem ocupar a margem adicional sem alterar a escala do corpo.

A exportação 96×112 evita que lança, cajado, martelo, véu ou manto obriguem o corpo a ser reduzido.

## 3. Direções

Ordem oficial:

1. s
2. sw
3. w
4. nw
5. n
6. ne
7. e
8. se

Para protótipos de arte, as quatro cardinais podem ser produzidas primeiro. O pacote final de produção deverá usar oito direções.

## 4. Ações mínimas

NPC comum:
- idle: 3 frames;
- walk: 8 frames;
- talk: 3 frames.

NPC de profissão:
- idle: 3;
- walk: 8;
- talk: 3;
- work: 6.

Jogador:
- idle: 3;
- walk: 8;
- interact: 3;
- work: 6;
- hurt: 3;
- ações adicionais conforme gameplay.

## 5. Eliabe como personagem-padrão

O primeiro pacote completo será:

`assets/art/pixel/npcs/eliabe/`

com o manifesto:

`eliabe.sprite.json`

Estrutura futura:

```
eliabe/
  eliabe.sprite.json
  idle/
    s/00.png
    s/01.png
    ...
  walk/
    s/00.png
    ...
  talk/
  work/
```

O mesmo personagem deve conservar:
- altura corporal;
- largura dos ombros;
- posição dos pés;
- cor de pele;
- cabelo/barba;
- roupa;
- paleta;
- espessura de contorno.

## 6. Camadas de personagens jogáveis

O arquivo `character_view.json` define os papéis:

- shadow
- garment_back
- weapon_back
- shield_back
- body
- head
- hair
- headgear_back
- headgear_middle
- headgear_front
- garment_front
- weapon_front
- shield_front
- effect

A ordem efetiva é resolvida em runtime por `src/character-layers.js`.

## 7. Profundidade por direção

A mesma espada ou escudo não deve permanecer sempre na frente do corpo.

Exemplo:
- ao olhar para sul, o escudo pode ficar à frente;
- ao olhar para norte/oeste, o corpo pode passar à frente do escudo;
- capas/robes passam para a frente do corpo em direções de costas;
- acessórios especiais podem ser marcados como `behind`.

Isso reproduz a leitura espacial clássica de MMORPG 2.5D sem copiar os assets de Ragnarok.

## 8. Validação

Antes de um pacote ser aceito:
- PNG válido;
- transparência;
- canvas correto;
- quantidade de frames correta;
- nomes corretos;
- origem dos pés coerente;
- ausência de escala individual de correção.

Use:

```
node tools/validate-sprite-pack.mjs assets/art/pixel/npcs/eliabe/eliabe.sprite.json
```

## 9. Integração

O runtime Web continuará aceitando os sprites antigos durante a migração.

Novo asset:
1. gerar e validar;
2. mudar o personagem de `static_legacy` para `sequence`;
3. testar idle;
4. testar walk;
5. testar oito direções;
6. validar Y-sort e colisão;
7. só então remover a correção legacy.

Isso impede que a evolução visual quebre mecânicas estabilizadas.

## 10. Estado da migração

| NPC | Runtime | Direções | Ações |
|---|---|---:|---|
| Ancião | atlas | 8 | idle, walk, talk |
| Eliabe | atlas | 8 | idle, walk, talk, work |
| Miriã | atlas | 8 | idle, walk, talk |
| Hanan | atlas | 8 | idle, walk, talk, work |
| Guarda de Judá | atlas | 8 | idle, walk, talk, ready |
| Criança do Rebanho | atlas | 8 | idle, walk, talk |

Os cinco NPCs adultos compartilham canvas 96×112 e pivô (48,108). A Criança do Rebanho usa canvas 80×96 e pivô (40,92), preservando proporção infantil.
