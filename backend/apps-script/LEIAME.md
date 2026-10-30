# Planilha das confirmações e dos votos

O site guarda as confirmações de presença e os votos do Muro numa planilha do Google. Configuração, uma vez só:

1. Abra `planilha-modelo.xlsx` (nesta pasta) no Google Drive e salve como Planilha Google (Arquivo → Salvar como Planilhas Google). Ela já vem com as três abas e os cabeçalhos certos:
   - **Convidados**: `convite_id | convite_nome | convidado_por | pessoa_id | nome | crianca | apelidos`
   - **Respostas**: `data | convite_id | pessoa_id | nome | vai | restricao`
   - **Votos**: `data | opcao | dispositivo`
2. Apague as linhas de exemplo e preencha **Convidados** com uma linha por pessoa. Pessoas do mesmo convite repetem `convite_id`, `convite_nome` (ex.: "Família Andrade") e `convidado_por` ("Helena", "Italo" ou "Helena e Italo"). `pessoa_id` é único por pessoa (ex.: `andrade-1`). `crianca`: "sim" ou vazio. `apelidos` (opcional): outros jeitos de a pessoa digitar o nome, separados por vírgula (sobrenome, nome de batismo).
3. Na planilha: **Extensões → Apps Script**. Apague o que estiver lá e cole o conteúdo de `Code.gs`. Salve.
4. **Implantar → Nova implantação → Tipo: App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**. Implante e autorize.
5. Copie a URL que termina em `/exec` e cole em `site/js/config.js`, no campo `apiUrl`.

Pronto: o site sai do modo demonstração. As respostas aparecem na aba **Respostas** (a última de cada pessoa é a que vale) e os votos na aba **Votos**.

Para mudar o código depois, edite no Apps Script e use **Implantar → Gerenciar implantações → editar → Nova versão** (a URL continua a mesma).

Busca: o site pede nome e sobrenome, mas como a lista tem muito apelido e primeiro nome, basta uma das palavras bater com o nome (ou os apelidos) de alguém do convite. Palavra igual pesa mais que começo de nome, e só aparecem os convites com mais palavras batendo: "Caio César" acha só Caio César e Gabi; "Caio Silva" mostra os três convites com Caio para a pessoa escolher o dela. Preencher `apelidos` com o sobrenome deixa a busca mais certeira.
