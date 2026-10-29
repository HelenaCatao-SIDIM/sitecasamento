/**
 * Backend do site Helena & Italo, numa planilha do Google.
 *
 * Abas (a primeira linha de cada uma é o cabeçalho, exatamente com estes nomes):
 *   Convidados: convite_id | convite_nome | convidado_por | pessoa_id | nome | crianca
 *   Respostas:  data | convite_id | pessoa_id | nome | vai | restricao
 *   Votos:      data | opcao | dispositivo
 *
 * Uma linha por pessoa em Convidados; as pessoas do mesmo convite repetem convite_id,
 * convite_nome e convidado_por. crianca: "sim" ou vazio.
 * Respostas guarda cada envio (a última resposta de cada pessoa é a que vale).
 */

const ABA_CONVIDADOS = 'Convidados';
const ABA_RESPOSTAS = 'Respostas';
const ABA_VOTOS = 'Votos';
const OPCOES_VOTO = ['muro', 'reboco', 'neutro'];

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'buscar') return json(buscar(p.nome || ''));
    if (p.action === 'votos') return json({ votos: contarVotos() });
    return json({ erro: 'Ação desconhecida.' });
  } catch (err) {
    return json({ erro: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'confirmar') return json(confirmar(body));
    if (body.action === 'votar') return json(votar(body));
    return json({ erro: 'Ação desconhecida.' });
  } catch (err) {
    return json({ erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------- convites ----------

function buscar(nome) {
  const palavras = normalizar(nome).split(/\s+/).filter(function (w) { return w.length >= 2; });
  // nome e sobrenome: ninguém vê o convite de outra família digitando só "Ana"
  if (palavras.length < 2) return { convites: [] };

  const convites = lerConvites();
  const encontrados = Object.keys(convites).map(function (id) { return convites[id]; }).filter(function (c) {
    return c.pessoas.some(function (p) {
      const termos = normalizar(p.nome).split(/\s+/);
      return palavras.every(function (w) { return termos.some(function (t) { return t.indexOf(w) === 0; }); });
    });
  });

  const respostas = ultimasRespostas();
  encontrados.forEach(function (c) {
    c.respostas = {};
    c.pessoas.forEach(function (p) { if (respostas[p.id]) c.respostas[p.id] = respostas[p.id]; });
  });
  return { convites: encontrados };
}

function confirmar(body) {
  const convites = lerConvites();
  const convite = convites[String(body.convite_id)];
  if (!convite) return { erro: 'Convite não encontrado.' };
  const pessoas = {};
  convite.pessoas.forEach(function (p) { pessoas[p.id] = p; });
  const respostas = body.respostas || [];
  if (!respostas.length || respostas.some(function (r) { return !pessoas[String(r.pessoa_id)]; })) {
    return { erro: 'Resposta com pessoa fora do convite.' };
  }
  const aba = planilha().getSheetByName(ABA_RESPOSTAS);
  const agora = new Date();
  respostas.forEach(function (r) {
    const id = String(r.pessoa_id);
    aba.appendRow([agora, convite.id, id, pessoas[id].nome, r.vai ? 'sim' : 'não', String(r.restricao || '').slice(0, 200)]);
  });
  return { ok: true };
}

function lerConvites() {
  const linhas = linhasComCabecalho(ABA_CONVIDADOS);
  const convites = {};
  linhas.forEach(function (l) {
    const id = String(l.convite_id || '').trim();
    if (!id || !l.nome) return;
    if (!convites[id]) convites[id] = { id: id, nome: String(l.convite_nome || l.nome), por: String(l.convidado_por || ''), pessoas: [] };
    convites[id].pessoas.push({ id: String(l.pessoa_id), nome: String(l.nome), crianca: normalizar(String(l.crianca || '')) === 'sim' });
  });
  return convites;
}

function ultimasRespostas() {
  const respostas = {};
  linhasComCabecalho(ABA_RESPOSTAS).forEach(function (l) {
    respostas[String(l.pessoa_id)] = { vai: normalizar(String(l.vai)) === 'sim', restricao: String(l.restricao || '') };
  });
  return respostas;
}

// ---------- votação do muro ----------

function votar(body) {
  const opcao = String(body.opcao || '');
  const dispositivo = String(body.dispositivo || '').slice(0, 80);
  if (OPCOES_VOTO.indexOf(opcao) < 0 || !dispositivo) return { erro: 'Voto inválido.' };
  const jaVotou = linhasComCabecalho(ABA_VOTOS).some(function (l) { return String(l.dispositivo) === dispositivo; });
  if (!jaVotou) planilha().getSheetByName(ABA_VOTOS).appendRow([new Date(), opcao, dispositivo]);
  return { votos: contarVotos() };
}

function contarVotos() {
  const votos = { muro: 0, reboco: 0, neutro: 0 };
  linhasComCabecalho(ABA_VOTOS).forEach(function (l) { if (votos.hasOwnProperty(l.opcao)) votos[l.opcao]++; });
  return votos;
}

// ---------- utilitários ----------

function planilha() { return SpreadsheetApp.getActiveSpreadsheet(); }

function linhasComCabecalho(nomeAba) {
  const aba = planilha().getSheetByName(nomeAba);
  if (!aba) throw new Error('Aba "' + nomeAba + '" não encontrada.');
  const valores = aba.getDataRange().getValues();
  const cab = (valores.shift() || []).map(function (c) { return String(c).trim(); });
  return valores.map(function (linha) {
    const obj = {};
    cab.forEach(function (c, i) { obj[c] = linha[i]; });
    return obj;
  });
}

function normalizar(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
