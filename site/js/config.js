// Configuração do site. É o único arquivo que precisa ser editado para publicar.
// Enquanto apiUrl estiver vazio, o site roda em modo demonstração: convites fictícios,
// votos de exemplo e nada é gravado fora do aparelho.
window.SITE_CONFIG = {
  // URL do Apps Script publicado como app da Web (ver backend/apps-script/LEIAME.md)
  apiUrl: "",

  // Aparece em "Confirme até ..."
  prazoConfirmacao: "",

  // Só números, com DDI e DDD: ex. "5531999999999"
  whatsapp: "",

  // Pix para os presentes: chave, nome do titular e cidade (como no banco, sem acento)
  pix: { chave: "", titular: "", cidade: "SABARA" },

  // Lista de presentes. valor em reais (número). foto: arquivo dentro de midia/ (opcional)
  presentes: [
    { id: "jantar", nome: "Um jantar a dois", valor: null, foto: "" },
    { id: "mala", nome: "Uma mala nova", valor: null, foto: "" },
    { id: "passagem", nome: "Passagem para o próximo destino", valor: null, foto: "" },
    { id: "hotel", nome: "Uma noite de hotel na lua de mel", valor: null, foto: "" },
    { id: "barco", nome: "Um passeio de barco", valor: null, foto: "" },
    { id: "safari", nome: "Um safári (desta vez, sem leoas)", valor: null, foto: "" },
  ],
};
