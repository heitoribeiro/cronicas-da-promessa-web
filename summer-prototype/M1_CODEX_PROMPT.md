# Prompt de execução — M1 Vertical Slice

Leia primeiro:
- AGENTS.md
- M1_VERTICAL_SLICE.md
- README.md
- scripts atuais e a cena principal

Objetivo: entregar o M1 completo descrito em M1_VERTICAL_SLICE.md, não apenas uma microfeature.

Use o Summer Engine MCP como ferramenta de desenvolvimento e validação do projeto aberto. Trabalhe autonomamente em checkpoints internos, mas continue até cumprir os critérios de aceitação do M1.

Regras obrigatórias:
1. Faça git pull origin main antes de iniciar, preservando alterações locais existentes.
2. Inspecione a cena, scripts, runtime e diagnostics antes de editar.
3. Preserve todo o baseline que já funciona.
4. Refatore o monólito gradualmente, extraindo no mínimo:
   - quest_manager.gd
   - save_manager.gd
   - game_state.gd
   - inventory_manager.gd
5. Implemente o fluxo jogável completo do M1:
   - menu inicial / New Game / Continue / Import
   - energia e fome
   - interiores funcionais
   - sistema genérico de interação
   - diário de quests
   - nove quests descritas na especificação
   - Ancião e Pastor/Rebanho
   - refeições
   - rotina diária/noite
   - dormir e avançar para o dia seguinte
   - conclusão do capítulo
   - persistência completa
6. Não pare para pedir aprovação após cada recurso. Faça checkpoints internos, execute a cena, leia diagnostics/debugger, corrija e prossiga.
7. Use input/runtime probes/screenshots do Summer para testar comportamento real.
8. Faça commits coesos por checkpoint.
9. Não altere o estilo visual definitivo além do necessário para tornar os sistemas utilizáveis; o refinamento visual é outra frente.
10. Não descarte nem reverta modificações locais do usuário sem autorização explícita.
11. Se houver conflito Git, preserve a versão remota válida e qualquer modificação local substancial; pare somente se não houver forma segura de resolver.
12. No final, execute um playthrough controlado do início ao "Um Novo Dia", incluindo um save/load no meio da cadeia e um export/import portátil.

Critério de saída:
- M1 jogável do início ao fim;
- todas as nove quests concluíveis;
- interiores e transições funcionais;
- fome/energia/refeição/sono funcionais;
- NPCs seguem rotinas e colisões;
- save manual, autosave e portátil preservam o estado completo;
- 0 erros de diagnostics;
- 0 debugger errors;
- relatório final com commits, arquivos principais, testes e qualquer limitação restante.

Se um detalhe menor da especificação estiver ambíguo, escolha a solução mais simples e coerente com o jogo e continue. Só interrompa por bloqueio realmente destrutivo ou por falha externa do engine/ferramenta.
