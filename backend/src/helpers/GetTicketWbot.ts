import { WASocket } from "baileys";
import { getWbot } from "../libs/wbot";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";
import Ticket from "../models/Ticket";
import { Store } from "../libs/store";
import AppError from "../errors/AppError";

type Session = WASocket & {
  id?: number;
  store?: Store;
};

const GetTicketWbot = async (ticket: Ticket): Promise<Session> => {
  if (!ticket.whatsappId) {
    const defaultWhatsapp = await GetDefaultWhatsApp(ticket.companyId, ticket.userId);

    if (!defaultWhatsapp) {
      throw new AppError("Nenhuma conexão WhatsApp disponível para enviar mensagens");
    }

    await ticket.$set("whatsapp", defaultWhatsapp);
    await ticket.reload();
  }

  if (!ticket.whatsappId) {
    throw new AppError("Não foi possível associar uma conexão WhatsApp ao ticket");
  }

  const wbot = getWbot(ticket.whatsappId);
  
  if (!wbot) {
    throw new AppError("A conexão WhatsApp não está ativa. Reconecte o número e tente novamente.");
  }
  
  return wbot;
};

export default GetTicketWbot;
