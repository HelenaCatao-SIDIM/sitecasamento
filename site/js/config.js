// Configuração do site. É o único arquivo que precisa ser editado para publicar.
// Enquanto apiUrl estiver vazio, o site roda em modo demonstração: convites fictícios,
// votos de exemplo e nada é gravado fora do aparelho.
window.SITE_CONFIG = {
  // URL do Apps Script publicado como app da Web (ver backend/apps-script/LEIAME.md)
  apiUrl: "",

  // Aparece em "Confirme até ..."
  prazoConfirmacao: "",

  // Só números, com DDI e DDD: ex. "5531999999999"
  whatsapp: "5531999493059",

  // Link da lista de presentes (ex.: lista da Amazon). Vazio = aparece "em breve".
  listaPresentes: "",

  // Pix para quem preferir dar dinheiro. tipo aparece como "Chave CPF", "Chave e-mail" etc.
  // Sugestão: chave aleatória ou e-mail, para não deixar o CPF público no site.
  pix: { tipo: "aleatória", chave: "50e26b58-5a74-40d0-8c75-0068d7616c71", titular: "Helena Maciel Catão", cidade: "SABARA" },
};
