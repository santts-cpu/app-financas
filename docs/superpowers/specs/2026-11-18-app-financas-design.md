# App de finanças pessoais do Junior — desenho

Data: 2026-11-18. Status: aguardando aprovação do Junior (versão 3, revisada: protótipo e documento conferidos entre si).

## Intenção e porquê
Junior paga hoje dois apps (Mobills e Despezzas), cerca de R$ 200/ano somados. Ele quer um app só dele, sem assinatura, com lançamento manual. O motivo declarado é pagar menos. O diferencial real é a **subconta dentro da conta** ("porquinhos"). Os prints do Mobills mostram o problema: ele usa contas falsas como porquinhos (01 Salário, 02 Moradia, 02.1 Parcelamentos, 03 Assinaturas, 03.1 picpay) e a lista de contas fica poluída.

Observação honesta: só pela economia, construir não compensa. O desenho se justifica pelo controle e pelas subcontas.

## Metas, não-metas, anti-metas
**Metas**
- Categorias com subcategorias e cor, agrupadas em grupos de planejamento (ex.: Custo de Vida, Projetos/Futuro).
- Contas com saldo total e subcontas editáveis embaixo.
- Lançamentos **pendentes ou pagos**; o saldo só conta o pago.
- Vários cartões de crédito, cada um com fatura aberta/fechada, parcelas, limite e melhor dia de compra.
- Assinaturas listadas num lugar só, com total mensal.
- Planejamento do mês em **% da renda por grupo**.
- Seção de metas ligada a porquinhos ou contas.
- Transações favoritas: um toque lança um gasto ou receita que se repete.
- Início personalizável, com aviso de pendências no topo.
- Funcionar offline no Android, sem custo.

**Não-metas**
- Sincronização automática com bancos (Open Finance). Não é necessária e custa caro.
- Computador, iPhone, multiusuário, loja de aplicativos.
- Acompanhar cotas, rentabilidade ou preço de investimentos (continuam na planilha dele).

**Anti-metas (falha mesmo que "funcione")**
- Perder os dados do Junior.
- Saldo do app se afastar do saldo real sem um jeito rápido de corrigir.
- Lançar um gasto ser mais lento do que nos apps que ele já usa.
- Mostrar números diferentes para a mesma coisa em telas diferentes (o Mobills faz isso: balanço negativo e "economia" positiva na mesma tela).

## Restrições
Android, só no celular. Lançamento manual. Grátis para rodar. Dados financeiros ficam no aparelho do Junior, não em servidor.

## Caminhos considerados
1. **App web instalável (PWA)**, dados no aparelho, backup em arquivo para o Google Drive. **Escolhido pelo Junior.** Grátis, offline, rápido de construir. Risco: perder dados se limpar o navegador sem backup; sem widget nativo.
2. App Android nativo. Mais robusto e com widgets, mas bem mais trabalho, instalação fora da Play Store e difícil de testar neste ambiente.
3. Site com conta e banco online. Acessa de qualquer lugar, mas coloca dados financeiros em servidor, com login, manutenção e possível custo.

## Decisões do Junior
- Subconta dentro da conta, com nome e valor editáveis; o total da conta também é editável.
- A linha **Livre** é calculada sozinha: total da conta menos a soma das subcontas.
- Todo gasto escolhe de qual subconta sai.
- Metas são uma **seção própria**; cada meta é ligada a um porquinho ou a uma conta.
- Categorias e subcategorias, contas e saldo, cartão e faturas, assinaturas.
- Das ideias dos apps, quer: aviso no topo do Início, planejamento, Início personalizável, anel do limite do cartão com "melhor dia de compra".
- Planejamento definido como **% da renda por grupo**.
- Visual: versão 2 (barra dividida na tela de contas), aprovada por ele.

## Decisões minhas (o Junior pode mudar)
- Gasto pago de um porquinho reduz o total da conta e o valor daquele porquinho; o Livre não muda.
- Se o valor de um porquinho ficar maior que o saldo disponível, mostra aviso e permite (não bloqueia); Livre negativo aparece em vermelho.
- Transferência entre contas e subcontas é tipo próprio de lançamento e não conta como despesa nem receita.
- Pagar a fatura é uma transferência, não uma nova despesa. A fatura aparece como pendente na data de vencimento.
- Compra no cartão pertence à categoria na data da compra.
- Meta ligada a porquinho mostra progresso pelo saldo do porquinho; ligada a conta, pelo saldo total da conta.
- "Ajustar saldo" cria um lançamento de ajuste visível no histórico, sem apagar nada.
- **Pendente x pago:** todo lançamento tem status. Pendente não mexe no saldo; o botão "Efetivar" marca como pago. Salário esperado e fatura a vencer são pendentes.
- **Planejamento:** o Junior informa a renda base do mês (editável). Cada grupo tem uma % e o valor em R$ é calculado. A barra de cada grupo separa "pago" de "previsto (pendente)".
- **Subconta só separa dinheiro dentro de uma mesma conta.** Investimentos (Rico, Clear, Wallet) não são contas do app: vivem na aba Capital, com valor digitado à mão, e não somam no saldo disponível.
- **Vários cartões:** a tela de fatura tem seletor de cartão; a lista mostra fechamento e total das faturas abertas.
- **Transações favoritas:** modelos de lançamento (nome, valor, categoria, conta) com um toque para lançar.
- Navegação inferior: até 5 abas (padrão Início, Lançamentos, Contas, Plano e Capital), com botão "+" no Início e em Lançamentos. As outras abas, Gerenciar início e Backup ficam em Configurações (engrenagem no topo do Início). Detalhe na seção "Navegação" abaixo.
- **Barra inferior personalizável (pedido do Junior):** em Configurações > Barra inferior ele escolhe quais abas ficam na barra (máximo 5) e em que ordem; Início fica sempre na barra, porque é o caminho até a engrenagem. Há "Restaurar padrão". (Substitui a primeira proposta, de 4 abas mais "Mais" fixa.)
- Backup: exportar um arquivo e guardar no Drive, com lembrete na tela inicial se passaram mais de 7 dias sem backup; pedir armazenamento persistente ao navegador.
- Valores em reais, formato brasileiro, datas dd/mm/aaaa. Toda conta nasce com saldo inicial; cartão com limite opcional.
- Apagar ou editar um lançamento recalcula os saldos automaticamente. Cada número (saldo, resultado do mês, gasto por grupo) tem uma única definição usada em todas as telas.

## Telas da primeira versão
Início (aviso de pendências, saldo, mês, resumo, cartões, personalizável), Lançamentos (com pendentes e Efetivar), Contas (com subcontas), Capital, Cartões e faturas (com seletor), Assinaturas, Plano (grupos em %), Metas, Categorias, Favoritas, Configurações (barra inferior, abas, backup, segurança).

## Início (pedido do Junior, versão do protótipo)
Filtro de mês no topo (mês passado, atual, seguinte e adiante). Saldo em contas com receitas e despesas pagas e o resultado do mês. Cartões "A receber" e "A pagar" com a contagem de pendentes. Seção **Contas**: cada conta mostra saldo e a barra Livre/porquinhos, e tocar abre os lançamentos daquela conta, com filtro por subconta. Seção **Cartões de crédito** (abertas e fechadas): fatura, fechamento, melhor dia de compra e anel de limite; tocar abre a fatura. Depois vêm Plano do mês e últimos lançamentos. O aviso de pendências do topo foi absorvido pelos cartões A receber e A pagar.

Seletor de mês: o mês atual fica centralizado e em destaque; o anterior e o seguinte aparecem apagados nas laterais e levam ao mês ao toque. **Lançamentos (lista)** (pedido dele): um card empilhado em três camadas, como um degradê. Em cima, o card escuro com o resumo do mês (receitas, despesas, resultado, a receber, a pagar, pendentes para efetivar), com cores: receitas pagas e a receber em verde-menta, despesas pagas e a pagar em rosa-vermelho, resultado em menta se positivo e rosa se negativo. No meio, uma faixa em azul-escuro com os chips Geral, Contas, Cartão e Assinaturas (com contagem; assinatura = categoria Assinaturas). Embaixo, a camada branca "Total do filtro" (receitas, despesas e resultado do que está filtrado, com os filtros ativos listados; a contagem de pendentes aparece só no card escuro, sem repetir). Cores no Total do filtro: receitas em verde, despesas em vermelho, resultado em verde se positivo e vermelho se negativo (zero fica neutro). Nos chips Cartão e Assinaturas só existem gastos, então o Total do filtro troca o formato: mostra "Total gasto" em vermelho e a contagem, sem receitas nem resultado, e o filtro de tipo some de dentro de Filtros. A mesma regra vale sempre que o filtro só pode ter gastos: conta = Cartão Nubank ou tipo = Só despesas mostram "Total gasto" em vermelho; tipo = Só receitas mostra "Total recebido" em verde. O chip Contas também usa o formato "Total gasto" + contagem (pedido dele); as receitas continuam na lista e no card escuro do topo, e só aparecem no total se o tipo for "Só receitas". Só o chip Geral mostra receitas, despesas e resultado. Nota. O botão Filtros fica no topo, ao lado do título, com a contagem de filtros ativos. Dentro dele ficam a busca (descrição, categoria ou valor), tipo, conta/subconta/cartão, categoria e ordem (data, maior valor, menor valor, categoria); o total e a lista atualizam enquanto você digita a busca. Não há mais barra de busca solta na tela. Tocar num lançamento abre para editar ou excluir (com confirmação), também no Início, nas contas e em Receitas/Despesas do mês. Pagamentos de fatura e ajustes só podem ser excluídos. Editar e excluir recalculam saldos, subcontas, Plano e fatura. Meses de exemplo são só leitura. Ícone do lançamento: gasto de conta mantém a seta; gasto de cartão usa o ícone de cartãozinho (mesma cor vermelha), para ver de onde veio o gasto. Vale em todas as listas.

**Cartões e fatura** (pedido dele): chips para trocar de cartão, botão "+" para novo cartão e "Editar cartão" (nome, limite, dia de fechamento, dia de vencimento, conta que paga a fatura; o melhor dia de compra é o dia seguinte ao fechamento). Seletor de fatura por mês: anterior (paga), aberta, e as duas seguintes (previstas, só com parcelas e assinaturas já conhecidas). "Fatura por categoria" mostra todas as categorias com valor e %. "Parcelas futuras" lista cada compra parcelada (parcela atual, quantas faltam, quando termina) e o total já comprometido. **Pagar fatura:** escolhe a conta de onde sai (padrão: a conta ligada ao cartão), aceita pagamento parcial, reduz o saldo da conta e a fatura, e não vira despesa (é transferência; as compras já contaram na data da compra). Lançamentos de pagamento e de ajuste aparecem no extrato marcados como "fora de receitas e despesas". **Limite usado** = fatura aberta + parcelas futuras (uma definição só, igual no Início e na tela de Cartões). Decisão minha (mudável): neste protótipo só o Nubank recebe lançamentos de compra, por isso o nome dele é fixo; excluir cartão não foi pedido e ficou de fora.

**Contas** (pedido dele): a lista mostra só contas correntes (Nubank e Santander), com total. Os investimentos saíram daqui e vivem na aba Capital. Botão "Reordenar contas" com setas para subir e descer.
**Dentro de uma conta:** seletor de mês no extrato; "Transferir entre subcontas" (de/para, incluindo o Livre; o total da conta não muda; não deixa tirar mais do que a subconta tem; Livre negativo só avisa); "Ajustar saldo" (digita o saldo real, a diferença vira um lançamento "Ajuste de saldo" visível no extrato, dentro do Livre no Nubank, e não conta como receita nem despesa); editar subconta (nome, valor reservado, cor) e excluir (o valor volta ao Livre e os lançamentos passam para o Livre). As transferências aparecem numa lista "Movimentações entre subcontas". Ficou de fora por ora: ajustar o saldo da conta de investimento.

**A receber / A pagar** (pedido dele): tocar num dos dois cartões do Início abre a tela "Receitas do mês" ou "Despesas do mês", com alternador entre as duas. Cada uma tem duas seções: pendentes ("A receber" / "A pagar", agrupados por data de vencimento, com Efetivar) e já realizados ("Recebidos" / "Pagos", agrupados por data). Usa o seletor de mês. Os totais de cada seção ficam no topo. Efetivar move o item para a seção de realizados.

**Gerenciar início** (em Configurações): duas listas. "Na tela" mostra os blocos ativos, com setas para subir e descer e um botão para tirar. "Disponíveis para adicionar" mostra o que está fora, com um botão para pôr (entra no fim da tela). Catálogo de 11 blocos: saldo/receitas/despesas, a receber e a pagar, contas, cartões, plano do mês, últimos lançamentos, metas, assinaturas, despesas por grupo, transações favoritas (toque lança na hora) e próximos vencimentos. Padrão: os 6 primeiros. Há "Restaurar padrão". O título e o mês ficam fixos. Decisão minha (mudável): o olho de esconder foi trocado por tirar/adicionar, e os 5 blocos extras saíram do que ele já pediu (metas, assinaturas, favoritas) mais despesas por grupo e vencimentos.

## Categorias (pedido do Junior, versão do protótipo)

- Despesa e receita têm listas separadas. Cada categoria tem nome, cor e subcategorias opcionais.
- Criar, editar, arquivar (some das opções novas, mas o histórico fica) e excluir. Ao excluir uma categoria em uso, o Junior escolhe outra para receber os lançamentos, o que também serve para juntar duas categorias.
- Cada categoria mostra o gasto do mês e o grupo do Plano a que pertence. Tocar na categoria abre os lançamentos filtrados.
- Categorias do sistema (Cartão, Transferência, Ajuste de saldo) não aparecem para editar.
- Decisões minhas (mudáveis): renomear atualiza lançamentos, plano, favoritos e parcelados; subcategoria é só um detalhe do lançamento, sem orçamento próprio.

## Mais, backup e segurança (pedido do Junior, versão do protótipo)

- **Início (ajustes do Junior):** o total das faturas e o total em contas ficam em faixas pretas coladas na base dos cards. "Escolher" no card de Contas liga e desliga cada conta; o total soma só as exibidas; investimentos não entram, porque ficam na Capital. Um olho no topo do Início, ao lado da engrenagem, esconde só o que é saldo ou acumulado, trocando por R$ ••••: saldo em contas, valores das contas e subcontas, total em contas, quanto está guardado nas metas, saldo de antes, limite do cartão e parcelas futuras. O que é do mês continua visível: receitas, despesas, a receber, a pagar, resultado, faturas do mês, gastos por categoria e grupo, lançamentos, plano. Porcentagens e barras continuam visíveis. Fica ligado até o Junior desligar e vai no backup.
- **Aviso de limite dispensável (pedido do Junior):** o aviso no topo do Início tem um X. Dispensar esconde o aviso daquele grupo naquele estado (perto do limite ou estourado). Decisão minha: se outro grupo passar do limite, ou o mesmo grupo piorar de "perto" para "estourado", o aviso volta. Em Plano, "Mostrar de novo os avisos dispensados" restaura. A chave "Aviso de limite" em Plano desliga o aviso de vez. O grupo estourado continua marcado no Plano.
- **Início: Despesas por grupo e Assinaturas (pedido do Junior):** os dois blocos seguem o padrão dos cards de Contas e Cartões (corpo branco + faixa preta de total). Despesas por grupo: barra dividida por grupo, linhas com cor, valor e % do gasto, etiqueta "passou do limite" no grupo estourado, faixa "Despesas pagas no mês". Assinaturas: próximas 3 cobranças com data (hoje em âmbar), nome e origem, "e mais N assinaturas", faixa "Total por mês". Os dois só aparecem se o bloco estiver ligado em Gerenciar início.
- **Títulos clicáveis no Início (pedido do Junior):** os títulos "Contas" e "Cartões de crédito" têm uma setinha e levam direto para a aba correspondente. Depois ele pediu para padronizar: todos os títulos de bloco do Início que têm destino (Contas, Cartões de crédito, Últimos lançamentos, Metas, Assinaturas, Despesas por grupo → Plano, Próximos vencimentos) viram link com a setinha, e os links soltos à direita ("Ver todos", "Ver todas", "Plano") saíram. "Escolher" (Contas) e os chips Abertas/Fechadas continuam. Transações favoritas não tem destino e fica sem link.
- **Cards dos grupos no Plano (pedido do Junior):** cada grupo vira um card com círculo colorido com a inicial, nome, "X% da renda · limite R$", valor gasto + previsto em destaque, percentual ao lado (vermelho se passou, âmbar se perto), barra Pago/Previsto, legenda com os dois valores e uma faixa final com o estado (Restam / Perto do limite / Excedeu). Mesmo card na tela do grupo, sem a seta.
- **Navegação (pedido do Junior):** a aba Mais saiu da barra inferior. As configurações abrem por uma engrenagem no topo do Início, ao lado do título. A barra tem no máximo 5 abas (decisão do Junior), e o Junior escolhe e ordena quais em Configurações. Padrão: Início, Lançamentos, Contas, Plano e Capital. A tela Configurações tem uma seção "Abas" com as abas que ficaram fora da barra (Metas, Assinaturas, Cartões e Categorias por padrão; muda sozinha quando o Junior troca a barra), e uma seção "Configurações" com Gerenciar início e Barra inferior. Depois vêm Dados e Segurança. Decisão minha: o Início não pode sair da barra, porque é o único caminho até a engrenagem.
- **Backup:** arquivo .json com todos os dados, salvo pelo Junior no Drive. A tela mostra o último backup, o histórico (8 últimos) e um lembrete que avisa no Início depois de 7 dias sem backup.
- **Importar backup:** valida que o arquivo é deste app, mostra o resumo (lançamentos, subcontas, metas, assinaturas) e só então substitui tudo, com aviso claro.
- **Exportar CSV:** todos os lançamentos, separador ponto e vírgula, valores com vírgula, despesa negativa, abre direto no Excel/Sheets.
- **Bloqueio:** senha de 4 dígitos, digital opcional. Decisão minha: o bloqueio só esconde a tela, não criptografa os dados, e o app diz isso. Esqueceu a senha: apagar os dados e restaurar o backup.
- **Apagar todos os dados:** exige digitar APAGAR, oferece fazer backup antes.
- Limite do protótipo: o download do arquivo não funciona dentro do visualizador; no app instalado funciona. Apagar tudo volta aos dados de exemplo.

## Capital (pedido do Junior, versão do protótipo)

- Aba nova na barra, no estilo da aba Contas: mostra onde está o capital, à mão ou ligado às contas. Valores digitados à mão, sem consulta a corretora.
- Cada ativo tem nome, classe (Renda fixa, FIIs, Ações, editável), local (corretora ou banco) e valor atual.
- **Por classe:** valor, % do capital, meta de % definida pelo Junior e o desvio (pontos acima ou abaixo e quanto falta ou sobra em reais). As metas precisam somar 100%.
- **Por local:** total e % do capital em cada corretora ou banco, com os ativos dentro.
- **Ligar contas e porquinhos (pedido do Junior):** o Junior escolhe quais contas entram no Capital: Livre do Nubank, cada porquinho e o Santander. O valor acompanha a conta sozinho e não é digitado. Cada item ligado tem uma classe (padrão Reserva, com meta 0%). Tirar do Capital não mexe na conta. Se a conta for apagada, o item some da Capital.
- **Adicionar ativo:** primeiro escolhe entre ligar uma conta ou digitar um investimento. No digitado há tipos prontos (Tesouro Selic, Tesouro IPCA+, CDB, LCI/LCA, Fundo, FIIs, Ações, ETF, Cripto, Previdência, Outro) que preenchem nome e classe; classe que não existe é criada com meta 0%.
- **Reserva fora das metas (decisão do Junior):** classes marcadas como "fora do cálculo das metas" (a Reserva, onde caem os itens ligados) não entram na base das %. As metas de Renda fixa, FIIs e Ações somam 100% só entre os investimentos. O total do topo mostra tudo, com a divisão "Investimentos · Reserva".
- **Mesmo desenho da aba Contas (pedido do Junior):** em Contas e na Capital, todo card usa o mesmo desenho escuro: círculo com a inicial, nome, etiqueta com a fatia (do saldo em Contas, do capital na Capital), valor grande, barra dividida com legenda em %, linhas com valor e % dentro do card, e rodapé com "+ Subconta" ou "+ Ativo" e "Abrir conta". Na Capital, a Capital abre "Por local", com um card por corretora ou banco, todos escuros e iguais ao card do Nubank em Contas, barra dividida por classe, ativos em linhas e "+ Ativo" dentro do card. "Por classe" continua com as metas e o desvio.
- **Investimentos saíram da aba Contas:** Contas mostra só contas correntes. O Rico deixou de ser uma conta e virou um local dentro da Capital; também saiu da seção Contas do Início.
- Um número por conceito: o que está no Rico é a soma dos ativos cujo local é Rico, na própria Capital.
- O olho do Início esconde os valores da Capital; porcentagens continuam visíveis.
- Dados do protótipo são exemplos.

## Pendente de decidir (a pedido do Junior)
- **Como decidimos o resto:** tela por tela, começando pelo Início, até todos os blocos estarem definidos.
- **Importar do Mobills e do Despezzas (pedido do Junior, adiado para depois da revisão):** ele quer trazer para o app novo todo o histórico que cada app exportar (CSV ou Excel), como base. Ainda não desenhado. Fatos verificados: o Mobills exporta relatório só de lançamentos pagos, sem pendentes nem transferências (ajuda oficial do Mobills); não sei em que formato nem com quais colunas. Do Despezzas não achei como exporta. Antes de desenhar, o Junior precisa exportar um arquivo real de cada app e mandar. Limites já conhecidos: porquinhos (subcontas), transferências, parcelas futuras e saldos de conta não vêm; saldo inicial se acerta com lançamento de ajuste. Risco apontado: categorias duplicadas ou diferentes entre os dois apps, então a tela precisa de mapeamento de categorias e prévia antes de confirmar. Decisão dele: trazer tudo que o app exportar. Os períodos do Mobills e do Despezzas se sobrepõem (confirmado por ele), então a importação precisa de regra contra duplicados (mesma data, valor e descrição) com prévia.
- **Tela de lançamento:** refeita no formato "escolhe o tipo primeiro"; falta ele mandar os prints do app de referência para o ajuste final.

**Novo lançamento** (copiado dos prints do app que ele usa hoje): "+" abre uma escolha com quatro opções (Despesa, Receita, Transferência, Cartão); cada uma abre o seu formulário em tela cheia, com a cor própria do tipo (despesa vermelho, receita verde, transferência roxo, cartão turquesa): cabeçalho escuro com seta de voltar, título ("Nova despesa", "Nova despesa cartão"…), valor grande e atalhos + 10, + 20, + 50, + 100 e Limpar; abaixo, painel com linhas de ícone e botão redondo de confirmar (check) fixo embaixo. Linhas: **Pago / Recebido** (chave; some em transferência e cartão; data futura força pendente) · **Data** (Hoje, Ontem, Outros…; só novembro neste protótipo) · **Descrição** com coração para salvar como favorita · **Categoria** · **Conta** (ou **Cartão**) · em transferência "Transferir para" + conta destino · em cartão, linha "Fatura: data de vencimento" (só mostra) e chave **Parcelado** (2 a 12×; o valor digitado é o total, mostra "N× de R$ x") · chave **Despesa fixa / Receita fixa / Transferência fixa** (= repetir todo mês, volta como pendente nos meses seguintes) · **Observação**. Transferência não é receita nem despesa e não pode ser futura. Na edição, parcelas e repetição não mudam e aparece "Excluir lançamento". **Fora desta versão (decisão minha, mudável):** anexar arquivo, tags, lembrar-me, ignorar despesa, seletor de moeda e a linha separada "Repetir".

**Plano** (pontos pedidos por ele: renda base, editar grupos e %, categorias por grupo, detalhe do grupo, plano por mês, copiar do mês anterior, aviso de limite, sobra do grupo): cada mês tem o seu plano, com o seletor de mês no topo. Card escuro com a renda base e a barra pago/previsto; abaixo, um cartão por grupo (desenho descrito em "Cards dos grupos no Plano", acima): o mesmo cartão abre o detalhe, "Fora dos grupos" (gasto pago sem grupo) e a linha "Categorias por grupo". **Renda base:** digitada, ou ligada a "Renda = receitas do mês" (recebido + a receber do mês). **Editar plano:** nome e % de cada grupo, criar e excluir grupo (excluir pede confirmar; as categorias dele ficam sem grupo), com a soma das % ao vivo; soma diferente de 100% só avisa (menos de 100: parte da renda sem destino; mais de 100: planejou gastar mais que a renda), não bloqueia. **Categorias por grupo:** cada categoria de despesa aponta para um grupo ou para "Sem grupo"; vale na hora e muda o mês aberto. **Detalhe do grupo:** toque no grupo para ver planejado, pago, previsto, as categorias dele e os lançamentos; dá para editar o lançamento ali. **Plano por mês:** mês sem plano mostra "Copiar de <mês>" (o mês anterior vem primeiro) ou "Criar plano do zero"; copiar leva renda, grupos, % e categorias, sem os gastos. **Aviso de limite:** chave no Plano; avisa no Início quando um grupo do mês atual passa de 100% (ou chega a 90%, à escolha); o gasto previsto conta. **Sobra do grupo:** no mês atual, "Guardar sobra" move até o que resta do planejado do Livre do Nubank para um porquinho (Viagem, Notebook) ou para a reserva no Santander. É uma transferência, não despesa; o Livre precisa cobrir o valor; o que já foi guardado sai do disponível, e editar ou excluir essa transferência recalcula. Decisões minhas (mudáveis): renda manual como padrão no Nov; só novembro tem gastos reais, os outros meses mostram os lançamentos de exemplo; a sobra só vale no mês atual; o aviso do Início só olha o mês atual.

**Metas** (pontos pedidos: criar e editar, prazo e quanto guardar por mês, guardar na meta, meta concluída, histórico de aportes, ordenar e excluir): cada meta é ligada a um porquinho, ao Livre do Nubank ou a uma conta inteira (ex.: Santander), e o quanto ela já tem é o saldo desse destino, então nunca há dois números. No cadastro: nome, valor alvo, destino (ou "criar porquinho novo com o nome da meta"), prazo opcional (mês/ano) e cor; duas metas não podem apontar para o mesmo destino. Com prazo, a meta mostra "Guarde R$ x por mês até <mês>" (o que falta dividido pelos meses restantes, arredondado para cima); prazo vencido ou no mês atual aparece em vermelho. A lista tem um card escuro com o total guardado e o valor mensal somado para cumprir os prazos, um cartão por meta e as concluídas numa lista à parte. Tocar na meta abre o detalhe: barra, falta, prazo, "Guardar na meta" (transferência do Livre do Nubank ou do Santander para o destino da meta, com o valor sugerido do mês; confere o saldo de origem), Editar, Marcar como concluída/Reabrir e o histórico de aportes (lançamentos editáveis), mais a linha "Saldo de antes" com o que já estava guardado sem aporte registrado. "Ordenar" liga setas e exclusão com confirmação; excluir a meta não apaga o porquinho nem os aportes. Decisões minhas (mudáveis): ligação a destino único, valor mensal é só sugestão, meta concluída sai dos totais.

**Assinaturas** (pontos pedidos: criar/editar/excluir, cobrança em conta ou cartão, pausar e cancelar, ligar ao que já existe, próximas cobranças, total por mês e por ano, ordenar): a lista é dado de verdade, não mais texto fixo. Cada assinatura tem nome, valor, dia (1 a 28), onde é cobrada (conta ou qualquer cartão) e situação (ativa, pausada, cancelada). Ativas geram uma cobrança pendente por mês a partir do próximo e entram em A pagar, no Plano (categoria Assinaturas) e na fatura do mês; pausadas e canceladas não geram. Mudanças valem só para os meses seguintes; o que já está lançado em novembro não muda. Criar com dia depois de hoje já cria a cobrança pendente de novembro. A tela mostra o total por mês e por ano, quanto se economiza por mês com as canceladas, as três próximas cobranças, ordenação por dia, valor ou nome e as seções Pausadas e Canceladas. **Ligação com o que já existe:** "Despesa fixa" lançada com a categoria Assinaturas vira assinatura; despesa fixa em qualquer cartão aparece na lista com a marca "despesa fixa" e dá para "Parar de repetir". Início e Mais mostram o total e as próximas cobranças calculados da lista.

## Fica para depois da versão 1
Relatórios (Previsão e Parcelas são os mais pesados), frequência de gastos, calendário de gastos, tags, filtro essenciais/não essenciais, "Economia mensal" (só depois de existir uma definição que feche com o resultado do mês).

## Deixado para quem for construir
Escolha de biblioteca, armazenamento local, nomes internos dos dados, a forma exata de importar um backup e o comportamento de edição de recorrentes.

## Riscos
Perda de dados por limpeza do navegador; deriva do saldo por esquecimento de lançamentos; abandono do app se o lançamento for lento; o histórico do Mobills e do Despezzas só vem junto se a exportação deles trouxer o que precisamos (não verificado; ver "Importar do Mobills e do Despezzas" em Pendente).
