import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import ApiIntegration from "../../models/ApiIntegration";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { logger } from "../../utils/logger";

interface EvolutionWebhookData {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: any;
    messageType?: string;
    messageTimestamp?: number;
  };
}

const ProcessEvolutionWebhookService = async (
  webhookData: EvolutionWebhookData,
  companyId: number
): Promise<void> => {
  try {
    const { event, instance, data } = webhookData;

    // Processar apenas eventos de mensagens recebidas
    if (event !== "messages.upsert" && event !== "messages.update") {
      return;
    }

    // Ignorar mensagens enviadas por nós
    if (data.key.fromMe) {
      return;
    }

    // Buscar a integração Evolution API
    const apiIntegration = await ApiIntegration.findOne({
      where: {
        companyId,
        type: "evolution",
        instanceName: instance,
        isActive: true
      }
    });

    if (!apiIntegration) {
      logger.warn(`Integration not found for instance: ${instance}`);
      return;
    }

    // Criar uma conexão WhatsApp virtual para a Evolution API se não existir
    let whatsapp = await Whatsapp.findOne({
      where: {
        name: `Evolution - ${apiIntegration.name}`,
        companyId
      }
    });

    if (!whatsapp) {
      whatsapp = await Whatsapp.create({
        name: `Evolution - ${apiIntegration.name}`,
        status: "CONNECTED",
        number: instance,
        isDefault: false,
        companyId,
        channel: "whatsapp"
      });
    }

    // Extrair número do contato (remover @s.whatsapp.net)
    const contactNumber = data.key.remoteJid.replace("@s.whatsapp.net", "");
    
    // Criar ou atualizar contato
    const contactData = {
      name: data.pushName || contactNumber,
      number: contactNumber,
      profilePicUrl: "",
      isGroup: data.key.remoteJid.includes("@g.us")
    };

    const contact = await CreateOrUpdateContactService({
      ...contactData,
      companyId
    });

    // Verificar se mensagem já existe
    const messageExists = await Message.count({
      where: { id: data.key.id, companyId }
    });

    if (messageExists) {
      return;
    }

    // Criar ou encontrar ticket
    const ticket = await FindOrCreateTicketService(
      contact,
      whatsapp.id!,
      0,
      companyId,
      undefined
    );

    // Extrair corpo da mensagem
    let body = "";
    let mediaType = "chat";
    let mediaUrl = "";

    if (data.message) {
      if (data.message.conversation) {
        body = data.message.conversation;
      } else if (data.message.extendedTextMessage) {
        body = data.message.extendedTextMessage.text;
      } else if (data.message.imageMessage) {
        body = data.message.imageMessage.caption || "";
        mediaType = "image";
        mediaUrl = data.message.imageMessage.url || "";
      } else if (data.message.videoMessage) {
        body = data.message.videoMessage.caption || "";
        mediaType = "video";
        mediaUrl = data.message.videoMessage.url || "";
      } else if (data.message.audioMessage) {
        body = "";
        mediaType = "audio";
        mediaUrl = data.message.audioMessage.url || "";
      } else if (data.message.documentMessage) {
        body = data.message.documentMessage.caption || data.message.documentMessage.fileName || "";
        mediaType = "document";
        mediaUrl = data.message.documentMessage.url || "";
      } else if (data.message.stickerMessage) {
        body = "";
        mediaType = "sticker";
        mediaUrl = data.message.stickerMessage.url || "";
      }
    }

    // Criar mensagem
    const messageData = {
      id: data.key.id,
      ticketId: ticket.id,
      contactId: contact.id,
      body: body || "",
      fromMe: false,
      mediaType,
      mediaUrl,
      read: false,
      quotedMsgId: null,
      ack: 1,
      remoteJid: data.key.remoteJid,
      participant: null,
      dataJson: JSON.stringify(data),
      ticketTrakingId: null
    };

    // CreateMessageService já emite os eventos Socket.IO necessários
    await CreateMessageService({ messageData, companyId });

    logger.info(`Evolution API message processed: ${data.key.id}`);
  } catch (error) {
    logger.error(`Error processing Evolution API webhook: ${error}`);
    throw error;
  }
};

export default ProcessEvolutionWebhookService;
