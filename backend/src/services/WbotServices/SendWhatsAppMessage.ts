import { WAMessage } from "baileys";
import { v4 as uuidv4 } from "uuid";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ProviderFactory from "./providers/ProviderFactory";
import CreateMessageService from "../MessageServices/CreateMessageService";
import formatBody from "../../helpers/Mustache";

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

  // For Evolution provider, save the message to database
  if (provider.getProviderName() === "evolution") {
    const formattedBody = formatBody(body, ticket.contact);
    
    // Extract message ID from Evolution response or generate one
    let messageId = uuidv4();
    if (sentMessage?.key?.id) {
      messageId = sentMessage.key.id;
    } else if (sentMessage?.id) {
      messageId = sentMessage.id;
    }

    // Save message to database
    await CreateMessageService({
      messageData: {
        id: messageId,
        ticketId: ticket.id,
        body: formattedBody,
        contactId: ticket.contactId,
        fromMe: true,
        read: true,
        ack: 2, // Sent status
        queueId: ticket.queueId
      },
      companyId: ticket.companyId
    });
  }

  return sentMessage;
};

export default SendWhatsAppMessage;
