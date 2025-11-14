import { WAMessage } from "baileys";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ProviderFactory from "./providers/ProviderFactory";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<WAMessage | any> => {
  const provider = await ProviderFactory.getProvider(ticket);
  
  const sentMessage = await provider.sendText({
    body,
    ticket,
    quotedMsg
  });

  return sentMessage;
};

export default SendWhatsAppMessage;
