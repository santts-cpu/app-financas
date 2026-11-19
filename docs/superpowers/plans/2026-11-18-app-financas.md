# App de finanças do Junior — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o protótipo clicável num PWA Android offline, com dados no aparelho, para lançamento manual de finanças pessoais com subcontas ("porquinhos").

**Architecture:** JavaScript puro (módulos ES), sem build e sem dependências de runtime. A lógica de dinheiro fica em módulos puros (`src/core/*`) testáveis no Node; o armazenamento (IndexedDB) e a interface (`src/ui/*`) ficam em camadas finas por cima. A interface é a do protótipo, quebrada em telas. Uma só definição por número, usada em todas as telas.

**Tech Stack:** HTML/CSS/JS (ES modules), IndexedDB, Service Worker, Web App Manifest, testes com `node:test` (Node 20+), `jsdom` só como devDependency para testes de tela.

**Spec:** `docs/superpowers/specs/2026-11-18-app-financas-design.md` (versão 3, aprovada). Protótipo de referência visual e de comportamento: `/home/claude/prototipo/index.html` (artefato `NMQr9eLMtou5AcfMs8Tbva`). O protótipo é a fonte da aparência (cores, textos, espaçamentos); o doc é a fonte das regras.

## Global Constraints

- Android, só no celular; funciona offline; grátis; sem servidor; dados só no aparelho.
- Valores em reais, formato brasileiro (`R$ 1.234,56`); datas `dd/mm/aaaa`; dinheiro guardado em **centavos inteiros** (nunca float).
- Lançamento manual; sem Open Finance.
- Saldo só conta lançamento **pago**; pendente não mexe no saldo.
- Barra inferior: máximo 5 abas (`BAR_MAX = 5`), padrão `['inicio','lanc','contas','plano','capital']`; Início sempre na barra.
- Visual: tinta `#0F1B26`, fundo `#F1F3F6`, destaque `#2B4EFF`, menta `#7FE0B5`, rosa `#FF8FA8`, âmbar `#FFC24B`; fontes Bricolage Grotesque e Figtree (arquivos locais, não CDN, por causa do offline).
- Estado do grupo no Plano: `>= 90%` "Perto do limite", `> 100%` "Excedeu".
- Backup: arquivo `.json` com todos os dados; lembrete no Início após 7 dias sem backup; pedir `navigator.storage.persist()`.
- CSV: separador `;`, valores com vírgula, despesa negativa.
- Bloqueio: PIN de 4 dígitos, só esconde a tela (não criptografa) e o app diz isso. Apagar tudo exige digitar `APAGAR`.
- Fora desta versão: importação do Mobills/Despezzas (aguarda arquivos reais de exportação), relatórios, tags, calendário de gastos, "Economia mensal".

## Review Focus

1. Mês sem dados, conta sem subcontas, grupo com 0% ou renda 0: nenhuma tela quebra, nenhum `NaN`/`Infinity` aparece (divisão por zero em %, barras e estado do grupo).
2. Centavos: somas de muitos lançamentos (ex.: 0,10 + 0,20 repetido) fecham exato; `parseMoney("1.234,56")` e `parseMoney("1234.56")` não trocam vírgula por ponto de milhar.
3. Editar/excluir um lançamento pago antigo recalcula saldo, subconta, plano e fatura; excluir subconta ou cartão em uso não deixa referência órfã.
4. Backup inválido (outro JSON, arquivo truncado, versão futura) nunca substitui os dados atuais; restaurar mostra resumo e só então troca tudo.
5. Navegador limpa o armazenamento / `persist()` negado: o app avisa na tela de Backup e o lembrete de backup continua funcionando.

---

## File Structure

```
index.html                 casca única: <div id="app">, carrega src/main.js
manifest.webmanifest       nome, ícones, display standalone, cores
sw.js                      cache do app shell, offline-first
src/main.js                inicialização, roteador, render
src/core/money.js          centavos, formatação e leitura pt-BR
src/core/dates.js          dd/mm/aaaa, mês de referência, vencimentos
src/core/ledger.js         contas, subcontas, lançamentos, saldos, transferências
src/core/cards.js          cartões, faturas, parcelas, pagar fatura
src/core/categories.js     categorias, subcategorias, arquivar, excluir com destino
src/core/plan.js           plano por mês, grupos, estados, avisos
src/core/goals.js          metas ligadas a destino
src/core/subs.js           assinaturas, favoritas, recorrentes
src/core/capital.js        ativos, classes, locais, desvio das metas
src/core/backup.js         snapshot, restaurar, CSV, lembrete, apagar
src/core/lock.js           PIN
src/store/db.js            IndexedDB: load()/save(state)/clear()
src/ui/*.js                uma tela por arquivo + components.js (cards, barras, sheets)
test/core/*.test.js        testes unitários da lógica
test/ui/*.test.js          testes de tela com jsdom
```

Estado único: um objeto `state` serializável (mesma forma do `snapshot()` do protótipo: `tx, subs, accounts, cards, cats, plans, metas, assin, favs, cap, bar, home, prefs, meta{lastBackup,version}`). Todas as funções de `core` são puras: `(state, args) -> novo state` ou valor derivado.

---

### Task 1: Esqueleto, testes e dinheiro

**Files:**
- Create: `package.json` (`"type":"module"`, script `"test":"node --test test/"`), `src/core/money.js`, `src/core/dates.js`, `test/core/money.test.js`, `test/core/dates.test.js`, `.gitignore`

**Interfaces:**
- Produces: `toCents(reais: number|string): number`, `fmtMoney(cents: number): string`, `parseMoney(text: string): number|null` (retorna centavos, `null` se inválido), `fmtDate(iso: string): string`, `monthKey(iso: string): string` (`"2026-11"`), `addMonths(key: string, n: number): string`.

- [ ] **Step 1: Escrever testes que falham** em `test/core/money.test.js`:
```js
assert.equal(fmtMoney(123456), 'R$ 1.234,56');
assert.equal(fmtMoney(-4290), '− R$ 42,90');   // sinal de menos tipográfico, como no protótipo
assert.equal(parseMoney('1.234,56'), 123456);
assert.equal(parseMoney('1234,5'), 123450);
assert.equal(parseMoney('abc'), null);
assert.equal(toCents('0.1') + toCents('0.2'), 30);
```
e em `dates.test.js`: `fmtDate('2026-11-18') === '18/11/2026'`, `addMonths('2026-12',1) === '2027-01'`.
- [ ] **Step 2:** Rodar `npm test`; esperado: FAIL (módulos não existem).
- [ ] **Step 3:** Implementar os módulos com as assinaturas acima. `fmtMoney` usa só aritmética inteira; `parseMoney` trata `.` como milhar quando há vírgula e como decimal quando não há.
- [ ] **Step 4:** `npm test`; esperado: PASS.
- [ ] **Step 5:** `git init && git add -A && git commit -m "chore: esqueleto, dinheiro e datas"`

### Task 2: Armazenamento local

**Files:** Create `src/store/db.js`, `test/store/db.test.js` (com `fake-indexeddb` como devDependency).

**Interfaces:**
- Produces: `initialState(): State` (conforme "Estado único"; começa vazio, sem dados de exemplo), `load(): Promise<State>`, `save(state: State): Promise<void>`, `clear(): Promise<void>`, `requestPersist(): Promise<boolean>`.

- [ ] **Step 1:** Testes: `save` depois `load` devolve estado igual (`deepEqual`); `load` sem nada devolve `initialState()`; `clear` volta ao inicial; `requestPersist` devolve `false` (sem lançar) quando `navigator.storage` não existe.
- [ ] **Step 2:** Rodar; esperado FAIL.
- [ ] **Step 3:** Implementar com um único objeto guardado numa store `kv` com chave `"state"`, gravação em transação única (tudo ou nada).
- [ ] **Step 4:** Rodar; esperado PASS.
- [ ] **Step 5:** Commit `feat: armazenamento local`.

### Task 3: Contas, subcontas e saldo

**Files:** Create `src/core/ledger.js`, `test/core/ledger.test.js`.

**Interfaces:**
- Consumes: Task 1 (`toCents`).
- Produces: `addAccount(s, {name, initial})`, `addSub(s, accId, {name, value})`, `editSub`, `delSub`, `accountView(s, accId): {total, livre, subs:[{id,name,value}]}`, `transferBetweenSubs(s, accId, fromSubIdOrLivre, toSubIdOrLivre, cents): State` (lança `Error('Valor maior que o da subconta')`), `adjustBalance(s, accId, realCents): State` (cria lançamento `Ajuste de saldo`).

- [ ] **Step 1:** Testes com os números do protótipo: Nubank total R$ 1.200,00, subcontas Porquinho 1 = R$ 250,00 e Viagem = R$ 200,00 → `livre = 75000`; transferir R$ 50,00 do Livre para Viagem não muda o total; transferir mais do que a subconta tem lança erro; Livre negativo é permitido e `livre` vem negativo; `adjustBalance` cria um lançamento visível e não conta como receita nem despesa; `delSub` devolve o valor ao Livre.
- [ ] **Step 2:** Rodar; FAIL.
- [ ] **Step 3:** Implementar. `livre = total − Σ subcontas` é sempre derivado, nunca guardado.
- [ ] **Step 4:** Rodar; PASS.
- [ ] **Step 5:** Commit `feat: contas e subcontas`.

### Task 4: Lançamentos (pendente/pago, transferência, edição)

**Files:** Modify `src/core/ledger.js`; Test `test/core/ledger.tx.test.js`.

**Interfaces:**
- Produces: `addTx(s, tx): State` com `tx = {id?, type:'e'|'r'|'t', value, date, status:'p'|'n', cat?, acc, sub?, from?, to?, desc, card?}`, `effectTx(s, id): State` (Efetivar), `editTx`, `delTx`, `monthSummary(s, monthKey): {receitas, despesas, resultado, aReceber, aPagar, pendentes}`.

- [ ] **Step 1:** Testes: despesa paga de uma subconta reduz o total da conta e o valor da subconta, e o Livre não muda; despesa pendente não muda nada até `effectTx`; transferência entre contas não entra em `despesas` nem `receitas`; `delTx` e `editTx` de um lançamento pago antigo recalculam saldo e subconta (Review Focus 3); `monthSummary` separa pagos e pendentes.
- [ ] **Step 2:** Rodar; FAIL.
- [ ] **Step 3:** Implementar. Saldo e subcontas são sempre calculados a partir de `initial` + lançamentos pagos (não guardar saldo corrente).
- [ ] **Step 4:** Rodar; PASS.
- [ ] **Step 5:** Commit `feat: lançamentos`.

### Task 5: Cartões e faturas

**Files:** Create `src/core/cards.js`, `test/core/cards.test.js`.

**Interfaces:**
- Produces: `addCard(s, {name, limit?, closeDay, dueDay, payAcc})`, `invoiceFor(s, cardId, monthKey): {total, status:'aberta'|'fechada'|'paga', closeDate, dueDate, items}`, `bestPurchaseDay(card): number` (dia seguinte ao fechamento), `addInstallments(s, tx, n)`, `payInvoice(s, cardId, monthKey, accId): State` (cria transferência, não despesa).

- [ ] **Step 1:** Testes: compra no cartão pertence à categoria na data da compra; fatura aberta soma só compras até o fechamento; `payInvoice` não aumenta `despesas` do mês; fechamento dia 2 → melhor dia 3; parcela 1/3 gera 3 lançamentos nos meses seguintes.
- [ ] **Step 2:** Rodar; FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: cartões e faturas`.

### Task 6: Categorias

**Files:** Create `src/core/categories.js`, `test/core/categories.test.js`.

**Interfaces:**
- Produces: `addCat(s,{name,type:'e'|'r',color,subs?})`, `renameCat` (atualiza lançamentos, plano, favoritos e parcelados), `archiveCat`, `deleteCat(s, id, destId): State` (move lançamentos para `destId`; serve para juntar categorias), `catMonthSpend(s, id, monthKey)`.

- [ ] **Step 1:** Testes: arquivar esconde das opções novas e mantém o histórico; `deleteCat` com destino move todos os lançamentos; nome duplicado lança `Error('Já existe uma categoria com esse nome.')`; categorias do sistema (Cartão, Transferência, Ajuste de saldo) não aparecem em `listEditable`.
- [ ] **Step 2–4:** Falhar, implementar, passar. **Step 5:** Commit `feat: categorias`.

### Task 7: Plano por mês

**Files:** Create `src/core/plan.js`, `test/core/plan.test.js`.

**Interfaces:**
- Consumes: Task 4 (`monthSummary`), Task 6 (`catMonthSpend`).
- Produces: `planRows(s, monthKey): {renda, rows:[{group, limit, pago, prev, used, diff, pct, state}], fora, sum} | null`, `groupState(row): 'ok'|'perto'|'excedeu'`, `copyPlan(s, fromKey, toKey)`, `setCatGroup`, `alertRows(s): Row[]`, `alertKey(row): string`, `dismissAlert(s, key)`, `saveLeftover(s, groupId, destSubId, cents)` (cria transferência do Livre do Nubank).

- [ ] **Step 1:** Testes com o protótipo (renda R$ 4.200,00): Custo de Vida 50% → limite 210000, gasto+previsto 196995 → `pct ≈ 94` → `'perto'`, "restam R$ 130,05"; Projetos/Futuro 20% com 104000 usado → `pct ≈ 124` → `'excedeu'`, "excedeu R$ 200,00"; renda 0 ou grupo 0% não gera `NaN`/`Infinity` (Review Focus 1); `alertKey` muda de `g:n` para `g:o` quando o grupo estoura, então um aviso dispensado volta; copiar plano leva renda, grupos, % e categorias, sem gastos; soma de % diferente de 100 só devolve aviso, não lança.
- [ ] **Step 2–4:** Falhar, implementar, passar. **Step 5:** Commit `feat: plano`.

### Task 8: Metas

**Files:** Create `src/core/goals.js`, `test/core/goals.test.js`.

**Interfaces:**
- Produces: `addGoal(s,{name,target,dest:{kind:'sub'|'livre'|'acc', id}, deadline?, color})` (lança erro se outro objetivo já usa o mesmo destino), `goalInfo(s, goal): {saved, pct, perMonth?}`, `contribute(s, goalId, cents, fromAcc)`, `completeGoal`.

- [ ] **Step 1:** Testes: progresso = saldo do destino (nunca um segundo número); duas metas no mesmo destino → erro; com prazo `2027-03` e hoje `2026-11`, "guarde" = falta ÷ meses restantes (arredondado para cima em centavos); destino apagado → meta mostra "destino removido" sem quebrar.
- [ ] **Step 2–4:** Falhar, implementar, passar. **Step 5:** Commit `feat: metas`.

### Task 9: Assinaturas, favoritas e recorrentes

**Files:** Create `src/core/subs.js`, `test/core/subs.test.js`.

**Interfaces:**
- Produces: `addAssin(s,{name,value,day(1..28),from,status:'ativa'|'pausada'|'cancelada'})`, `nextCharges(s, todayIso): [{assin, date}]`, `assinTotal(s): {month, year}`, `generateMonth(s, monthKey): State` (cria um pendente por assinatura ativa, sem duplicar), `useFavorite(s, favId, todayIso): State`.

- [ ] **Step 1:** Testes: pausadas e canceladas não geram; rodar `generateMonth` duas vezes não duplica; dia 31 é rejeitado (limite 28); total por ano = 12 × mensal das ativas; favorita lança com data de hoje.
- [ ] **Step 2–4:** Falhar, implementar, passar. **Step 5:** Commit `feat: assinaturas e favoritas`.

### Task 10: Capital

**Files:** Create `src/core/capital.js`, `test/core/capital.test.js`.

**Interfaces:**
- Produces: `capItems(s): [{id,name,cls,loc,value,linked?}]` (itens ligados leem o valor da conta/subcontas, nunca digitado), `capByClass(s): [{cls, value, pct, meta, desvioPts, desvioCents, fora}]`, `capByLoc(s)`, `setClassMeta(s, cls, pct)` (lança se as metas das classes não-`fora` não somam 100), `linkAccount(s, ref, cls='Reserva')`.

- [ ] **Step 1:** Testes: Reserva (`fora: true`) não entra na base das %; metas de Renda fixa 40 + FIIs 40 + Ações 20 somam 100, 50 + 40 + 20 lança erro; conta apagada some dos itens ligados; o total do topo é Investimentos + Reserva.
- [ ] **Step 2–4:** Falhar, implementar, passar. **Step 5:** Commit `feat: capital`.

### Task 11: Backup, CSV, bloqueio e apagar

**Files:** Create `src/core/backup.js`, `src/core/lock.js`, `test/core/backup.test.js`, `test/core/lock.test.js`.

**Interfaces:**
- Produces: `makeBackup(s, nowIso): {app:'financas-junior', version:1, savedAt, data}`, `parseBackup(text): {ok:true, summary:{lancamentos,subcontas,metas,assinaturas}, data} | {ok:false, error}`, `restore(s, parsed): State`, `backupDue(s, nowIso): boolean` (> 7 dias ou nunca), `toCsv(s): string`, `setPin(s, pin)`, `checkPin(s, pin): boolean`, `eraseAll(confirmText): State` (só com `'APAGAR'`).

- [ ] **Step 1:** Testes: JSON de outro app, arquivo truncado e `version: 99` → `ok:false` e `restore` nunca é chamado com eles (Review Focus 4); ida e volta `makeBackup` → `parseBackup` → `restore` preserva tudo; `backupDue` é `true` com 8 dias e `false` com 6; CSV com `;`, `1234,50` e despesa negativa; PIN com 3 dígitos ou letras → erro; `eraseAll('apagar')` → erro.
- [ ] **Step 2–4:** Falhar, implementar, passar. **Step 5:** Commit `feat: backup, csv, bloqueio`.

### Task 12: Casca da interface, barra e Início

**Files:** Create `index.html`, `src/main.js`, `src/ui/components.js`, `src/ui/inicio.js`, `src/ui/config.js`, `src/style.css`, `test/ui/shell.test.js`.

**Interfaces:**
- Consumes: Tasks 3–11.
- Produces: `render(state): void`, `go(screen: string): void`, `components`: `card`, `darkStrip(label, cents)`, `splitBar(parts)`, `sheet(html)`, `titleLink(to, label)`.

- [ ] **Step 1:** Testes com jsdom: barra padrão mostra 5 abas em ordem; tentar pôr uma sexta é recusado; Início não sai da barra; engrenagem no Início abre Configurações; títulos de bloco com destino levam à tela certa (Contas→contas, Cartões de crédito→cartoes, Últimos lançamentos→lanc, Metas→metas, Assinaturas→assin, Despesas por grupo→plano); aviso de limite tem X que dispensa; olho troca saldos por `R$ ••••` e mantém receitas, despesas e % do mês visíveis.
- [ ] **Step 2–4:** Falhar; portar o HTML/CSS do protótipo (`sInicio`, `sMais`, `lt`) para módulos; passar.
- [ ] **Step 5:** Commit `feat: casca, barra inferior e Início`.

### Task 13: Telas de movimento: Lançamentos, Novo lançamento, Contas, Cartões

**Files:** Create `src/ui/lanc.js`, `src/ui/novo.js`, `src/ui/contas.js`, `src/ui/cartoes.js`, `test/ui/movimento.test.js`.

- [ ] **Step 1:** Testes jsdom: "+" abre as 4 opções (Despesa, Receita, Transferência, Cartão), cada uma com a cor do tipo; lançar uma despesa de R$ 42,90 pelo formulário muda o saldo e aparece em Últimos lançamentos; filtro "Cartão" mostra "Total gasto" e a contagem, sem receitas; Efetivar move um pendente para pago; Contas mostra só Nubank e Santander como cards escuros iguais.
- [ ] **Step 2–4:** Falhar; portar `sLanc`, `sNovo`, `accCard`, fatura com seletor; passar.
- [ ] **Step 5:** Commit `feat: telas de movimento`.

### Task 14: Telas de planejamento: Plano, Grupo, Metas, Assinaturas, Categorias, Capital

**Files:** Create `src/ui/plano.js`, `src/ui/metas.js`, `src/ui/assin.js`, `src/ui/categ.js`, `src/ui/capital.js`, `test/ui/planejamento.test.js`.

- [ ] **Step 1:** Testes jsdom: o card do grupo mostra círculo com a inicial, "50% da renda · limite R$ 2.100,00", faixa "Perto do limite · restam R$ 130,05" e, no estourado, "Excedeu R$ 200,00"; renda 0 não mostra `NaN`; Capital mostra Reserva fora do cálculo e aceita metas só se somarem 100%; Categorias mostra gasto do mês e grupo.
- [ ] **Step 2–4:** Falhar; portar `sPlano`, `grpBody`, `sGrupo`, `sMetas`, `sAssin`, `sCateg`, `sCapital`; passar.
- [ ] **Step 5:** Commit `feat: telas de planejamento`.

### Task 15: Configurações, Backup e Segurança (tela)

**Files:** Modify `src/ui/config.js`; Create `src/ui/backup.js`, `test/ui/backup.test.js`.

- [ ] **Step 1:** Testes jsdom: Configurações tem as seções Backup, Abas (só as fora da barra), Configurações, Dados, Segurança; importar arquivo inválido mostra erro e não troca nada; backup válido mostra o resumo antes de confirmar; `persist()` negado mostra o aviso (Review Focus 5); apagar só habilita com `APAGAR`; o download usa `<a download>` com `Blob` (funciona no app instalado).
- [ ] **Step 2–4:** Falhar, implementar, passar. **Step 5:** Commit `feat: configurações e backup`.

### Task 16: PWA e instalação

**Files:** Create `manifest.webmanifest`, `sw.js`, `icons/` (192 e 512), `fonts/`; Modify `index.html`; Test `test/ui/pwa.test.js`.

- [ ] **Step 1:** Teste: `manifest.webmanifest` tem `display: "standalone"`, `start_url`, ícones 192 e 512 e `theme_color: "#0F1B26"`; a lista de arquivos do cache em `sw.js` contém todos os módulos de `src/` (teste varre a pasta e compara).
- [ ] **Step 2–4:** Falhar; implementar service worker *cache-first* para o app shell com versão no nome do cache; passar.
- [ ] **Step 5:** Verificação manual no Android (Chrome): abrir o site hospedado (GitHub Pages ou similar, HTTPS), "Instalar app", ligar o modo avião e abrir; esperado: o app abre e lança um gasto. Commit `feat: pwa offline`.

---

## Auto-revisão

- **Cobertura do doc:** Contas/subcontas (T3), pendente/pago e transferência (T4), cartões/faturas (T5), categorias (T6), plano e avisos (T7), metas (T8), assinaturas/favoritas (T9), Capital (T10), backup/CSV/bloqueio/apagar (T11), Início, barra, olho e títulos (T12), telas (T13–T15), PWA (T16). **Fora, por decisão:** importação do Mobills/Despezzas (doc, "Pendente"): precisa de arquivo real e regra contra duplicados.
- **Pendências do doc que o plano não decide:** tela de lançamento aguarda prints de referência (T13 usa o protótipo); edição de recorrentes fica para quem constrói (doc, "Deixado para quem for construir").
- **Riscos que o plano não elimina:** sem hospedagem HTTPS não há instalação; limpar o armazenamento do navegador apaga os dados (mitigado por backup + `persist()`).
