import * as Sentry from "@sentry/node";
import fs from "fs";
import ApiIntegration from "../../../models/ApiIntegration";
import Message from "../../../models/Message";
import Contact from "../../../models/Contact";
import User from "../../../models/User";
import Whatsapp from "../../../models/Whatsapp";
import formatBody from "../../../helpers/Mustache";
import AppError from "../../../errors/AppError";
import { WhatsAppProvider, SendTextOptions, SendMediaOptions } from "./WhatsAppProvider";
import EvolutionApiService from "../../EvolutionApiService/EvolutionApiService";
import { logger } from "../../../utils/logger";
import Ticket from "../../../models/Ticket";
import { proto } from "@whiskey-online/baileys";
import CreateMessageService from "../../../services/Message/CreateMessageService";

// Função auxiliar para obter o número correto para envio via Evolution API
// Evolution API espera número limpo (E.164) ou JID completo com @lid para LIDs
// IMPORTANTE: LIDs são específicos da instância, então se o ticket foi recebido por
// outra instância, o LID não vai funcionar. Nesses casos, tentar usar o número real.
async function getReplyNumber(ticketId: number, contactNumber: string): Promise<string | null> {
  // PRIMEIRO: verificar se o contato tem um número real (não LID)
  // Números válidos têm entre 10-15 dígitos (E.164)
  const isValidPhoneNumber = contactNumber.match(/^\d{10,15}$/);

  if (isValidPhoneNumber) {
    // Contato tem número real, usar diretamente
    logger.info(`[EvolutionProvider] Using real contact number: ${contactNumber}`);
    return contactNumber;
  }

  // Contato tem LID como número - precisamos buscar o remoteJid salvo
  const lastReceivedMessage = await Message.findOne({
    where: {
      ticketId,
      fromMe: false
    },
    order: [["createdAt", "DESC"]]
  });

  if (lastReceivedMessage?.remoteJid) {
    const savedJid = lastReceivedMessage.remoteJid;

    // Se é um LID, usar o formato completo @lid
    if (savedJid.includes("@lid")) {
      logger.info(`[EvolutionProvider] Using LID format for reply: ${savedJid}`);
      return savedJid;
    }

    // Para JIDs normais (@s.whatsapp.net), extrair apenas o número
    if (savedJid.includes("@s.whatsapp.net")) {
      const cleanNumber = savedJid.replace("@s.whatsapp.net", "");
      logger.info(`[EvolutionProvider] Using phone number from saved JID: ${cleanNumber}`);
      return cleanNumber;
    }

    // Para grupos (@g.us), usar o ID do grupo
    if (savedJid.includes("@g.us")) {
      logger.info(`[EvolutionProvider] Using group ID: ${savedJid}`);
      return savedJid;
    }

    // Se não tem @, é provavelmente um número limpo
    logger.info(`[EvolutionProvider] Using saved number directly: ${savedJid}`);
    return savedJid;
  }

  // Fallback: LID puro sem remoteJid salvo - NÃO PODEMOS ENVIAR
  // Números puros LID (maiores que 15 dígitos) não funcionam sem o formato @lid
  logger.error(`[EvolutionProvider] Cannot send to LID contact without saved remoteJid: ${contactNumber}`);
  return null;
}

class EvolutionProvider implements WhatsAppProvider {
  getProviderName(): string {
    return "evolution";
  }

  async sendText({ body, ticket, quotedMsg }: SendTextOptions): Promise<any> {
    try {
      // Recarregar ticket com user para garantir que temos os dados do atendente
      await ticket.reload({
        include: [
          { model: Contact, as: "contact" },
          { model: User, as: "user" },
          { model: Whatsapp, as: "whatsapp" }
        ]
      });

      logger.info(`[EvolutionProvider] Ticket user AFTER reload: ${ticket.user?.name || 'STILL NO USER'}`);

      // Log detalhado para debug
      logger.info(`[EvolutionProvider] sendText called for ticket ${ticket.id}`);
      logger.info(`[EvolutionProvider] Ticket whatsapp details: id=${ticket.whatsapp?.id}, name=${ticket.whatsapp?.name}, apiIntegrationId=${ticket.whatsapp?.apiIntegrationId}`);
      logger.info(`[EvolutionProvider] Ticket user BEFORE reload: ${ticket.user?.name || 'NO USER'}`);

      // Buscar integração Evolution API
      const apiIntegration = await ApiIntegration.findByPk(ticket.whatsapp.apiIntegrationId);

      if (!apiIntegration) {
        logger.error("[EvolutionProvider] No API integration found for apiIntegrationId:", ticket.whatsapp.apiIntegrationId);
        throw new AppError("Integração Evolution API não encontrada. Configure nas Integrações.");
      }

      // Log dos dados da integração encontrada
      logger.info(`[EvolutionProvider] Found ApiIntegration: id=${apiIntegration.id}, name=${apiIntegration.name}, instanceName=${apiIntegration.instanceName}, baseUrl=${apiIntegration.baseUrl}`);

      // Validar API Key
      if (!apiIntegration.apiKey || apiIntegration.apiKey.trim() === "") {
        logger.error("[EvolutionProvider] API Key missing for integration:", apiIntegration.id);
        throw new AppError("API Key não configurada para esta integração Evolution. Verifique as configurações.");
      }

      // Usar instanceName da integração, ou fallback para o nome da conexão
      const instanceName = (apiIntegration.instanceName || ticket.whatsapp?.name || "").trim();

      if (!instanceName) {
        logger.error("[EvolutionProvider] No instance name available. Integration:", {
          id: apiIntegration.id,
          name: apiIntegration.name,
          instanceName: apiIntegration.instanceName,
          whatsappName: ticket.whatsapp?.name
        });
        throw new AppError("Nome da instância não configurado. Verifique as configurações da conexão.");
      }

      // Verificar status da conexão (apenas log de aviso, não bloquear - sessão pode estar gerenciada externamente)
      const connectionStatus = ticket.whatsapp?.status;
      if (connectionStatus && connectionStatus !== "CONNECTED") {
        logger.warn(`[EvolutionProvider] Connection status is ${connectionStatus}, attempting to send anyway (may be managed externally)`);
      }

      logger.info(`[EvolutionProvider] Sending text message via instance: ${instanceName}`);

      const evolutionService = new EvolutionApiService({
        baseUrl: apiIntegration.baseUrl,
        apiKey: apiIntegration.apiKey
      });

      // Obter o número correto para responder (pode ser LID ou número normal)
      const replyNumber = await getReplyNumber(ticket.id, ticket.contact.number);

      // Se não conseguimos obter um número válido, não podemos enviar
      if (!replyNumber) {
        logger.error(`[EvolutionProvider] Cannot send message - no valid number for contact: ${ticket.contact.number}`);
        throw new AppError("Não foi possível enviar mensagem. O contato não tem um número válido para resposta.");
      }

      const textMessage = formatBody(body, { contact: ticket.contact, user: ticket.user });

      logger.info(`[EvolutionProvider] Sending to: ${replyNumber}`);

      // Enviar mensagem via Evolution API
      const response = await evolutionService.sendTextMessage({
        instanceName,
        number: replyNumber,
        text: textMessage
      });

      await ticket.update({ lastMessage: textMessage });

      return response;
    } catch (err: any) {
      Sentry.captureException(err);
      logger.error("[EvolutionProvider] Error sending text:", {
        error: err?.response?.data || err?.message,
        status: err?.response?.status || err?.statusCode,
        ticketId: ticket?.id,
        contactNumber: ticket?.contact?.number
      });

      // Se já é um AppError com mensagem clara, repassa
      if (err?.statusCode === 404 || err?.message?.includes("não encontrada")) {
        throw err;
      }

      // Verificar erro 404 diretamente
      if (err?.response?.status === 404) {
        throw new AppError("Instância não encontrada na Evolution API. Verifique a página de conexões e corrija o nome da instância.", 404);
      }

      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  async sendMedia({ media, ticket, body }: SendMediaOptions): Promise<any> {
    try {
      // Recarregar ticket com user para garantir que temos os dados do atendente
      await ticket.reload({
        include: [
          { model: Contact, as: "contact" },
          { model: User, as: "user" },
          { model: Whatsapp, as: "whatsapp" }
        ]
      });

      logger.info(`[EvolutionProvider] Ticket user in sendMedia: ${ticket.user?.name || 'NO USER'}`);

      // Buscar integração Evolution API
      const apiIntegration = await ApiIntegration.findByPk(ticket.whatsapp.apiIntegrationId);

      if (!apiIntegration) {
        logger.error("[EvolutionProvider] No API integration found for apiIntegrationId:", ticket.whatsapp.apiIntegrationId);
        throw new AppError("ERR_NO_EVOLUTION_INTEGRATION");
      }

      // Usar instanceName da integração, ou fallback para o nome da conexão
      const instanceName = (apiIntegration.instanceName || ticket.whatsapp?.name || "").trim();

      if (!instanceName) {
        logger.error("[EvolutionProvider] No instance name available for media. Integration:", {
          id: apiIntegration.id,
          name: apiIntegration.name,
          instanceName: apiIntegration.instanceName,
          whatsappName: ticket.whatsapp?.name
        });
        throw new AppError("ERR_NO_INSTANCE_NAME");
      }

      logger.info(`[EvolutionProvider] Sending media message via instance: ${instanceName}`);

      const evolutionService = new EvolutionApiService({
        baseUrl: apiIntegration.baseUrl,
        apiKey: apiIntegration.apiKey
      });

      // Obter o número correto para responder (pode ser LID ou número normal)
      const replyNumber = await getReplyNumber(ticket.id, ticket.contact.number);

      // Se não conseguimos obter um número válido, não podemos enviar
      if (!replyNumber) {
        logger.error(`[EvolutionProvider] Cannot send media - no valid number for contact: ${ticket.contact.number}`);
        throw new AppError("Não foi possível enviar mídia. O contato não tem um número válido para resposta.");
      }

      const caption = formatBody(body || "", { contact: ticket.contact, user: ticket.user });

      logger.info(`[EvolutionProvider] Sending media to: ${replyNumber}`);

      // Ler arquivo e converter para base64
      const fileBuffer = fs.readFileSync(media.path);
      const base64Data = fileBuffer.toString("base64");

      // Determinar tipo de mídia
      const typeMessage = media.mimetype.split("/")[0];
      let mediatype: "image" | "video" | "audio" | "document" = "document";
      if (typeMessage === "image") mediatype = "image";
      else if (typeMessage === "video") mediatype = "video";
      else if (typeMessage === "audio") mediatype = "audio";

      // Enviar mídia via Evolution API
      const response = await evolutionService.sendMediaMessage({
        instanceName,
        number: replyNumber,
        mediatype,
        media: base64Data,
        caption
      });

      await ticket.update({ lastMessage: caption || media.originalname });

      return response;
    } catch (err: any) {
      Sentry.captureException(err);
      logger.error("[EvolutionProvider] Error sending media:", {
        error: err?.response?.data || err?.message,
        status: err?.response?.status || err?.statusCode,
        ticketId: ticket?.id,
        contactNumber: ticket?.contact?.number
      });

      // Se já é um AppError com mensagem clara, repassa
      if (err?.statusCode === 404 || err?.message?.includes("não encontrada")) {
        throw err;
      }

      // Verificar erro 404 diretamente
      if (err?.response?.status === 404) {
        throw new AppError("Instância não encontrada na Evolution API. Verifique a página de conexões e corrija o nome da instância.", 404);
      }

      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  async handleMessage(msg: proto.IWebMessageInfo, ticket: Ticket): Promise<Message | undefined> {
    const contact = await Contact.findByPk(ticket.contactId);
    if (!contact) {
      throw new AppError("ERR_NO_CONTACT", 404);
    }

    if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
      const quotedMsg = await Message.findOne({
        where: {
          id: msg.message.extendedTextMessage.contextInfo.stanzaId,
          ticketId: ticket.id
        }
      });
      if (quotedMsg) {
        // @ts-ignore
        msg.message.extendedTextMessage.contextInfo.quotedMessage = {
          key: {
            remoteJid: msg.key.remoteJid,
            fromMe: quotedMsg.fromMe,
            id: quotedMsg.id
          },
          message: JSON.parse(quotedMsg.dataJson!)
        };
      }
    }

    // Se for mensagem de mídia
    const messageMedia = msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.documentMessage || msg.message?.stickerMessage;
    if (messageMedia) {
      return this.handleMediaMessage(msg, ticket, contact);
    }

    // Se for mensagem de texto
    if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
      return this.handleTextMessage(msg, ticket, contact);
    }

    return undefined;
  }

  async handleMediaMessage(
    msg: proto.IWebMessageInfo,
    ticket: Ticket,
    contact: Contact
  ): Promise<Message | undefined> {
    try {
      logger.info('[EvolutionProvider] Processing media message');

      // Garantir que ticket.user está carregado
      await ticket.reload({
        include: [
          { model: Contact, as: "contact" },
          { model: User, as: "user" }
        ]
      });

      const quotedMsg = await this.verifyQuotedMessage(msg);
      const media = await this.downloadMedia(msg);

      if (!media) {
        logger.warn('[EvolutionProvider] No media found in message');
        return undefined;
      }

      // Obter o body da mensagem
      const bodyMessage = this.getBodyMessage(msg);
      const body = bodyMessage && bodyMessage !== '-' ? bodyMessage : media.filename || '';

      const messageData = {
        id: msg.key.id!,
        ticketId: ticket.id,
        contactId: msg.key.fromMe ? undefined : contact.id,
        body: body,
        fromMe: msg.key.fromMe!,
        read: msg.key.fromMe!,
        mediaUrl: media.filename,
        mediaType: media.mimetype.split('/')[0],
        quotedMsgId: quotedMsg?.id,
        ack: msg.status ? Number(msg.status) : 1,
        remoteJid: msg.key.remoteJid!,
        participant: msg.key.participant,
        dataJson: JSON.stringify(msg)
      };

      await ticket.update({ lastMessage: body || 'Arquivo de mídia' });

      const newMessage = await CreateMessageService({
        messageData,
        companyId: ticket.companyId
      });

      logger.info(`[EvolutionProvider] Media message created: ${newMessage.id}`);

      return newMessage;
    } catch (error) {
      logger.error(`[EvolutionProvider] Error handling media message: ${error}`);
      Sentry.captureException(error);
      return undefined;
    }
  }


  async handleTextMessage(
    msg: proto.IWebMessageInfo,
    ticket: Ticket,
    contact: Contact
  ): Promise<Message | undefined> {
    try {
      logger.info('[EvolutionProvider] Processing text message');

      // Garantir que ticket.user está carregado
      await ticket.reload({
        include: [
          { model: Contact, as: "contact" },
          { model: User, as: "user" }
        ]
      });

      const body = this.getBodyMessage(msg);
      const quotedMsg = await this.verifyQuotedMessage(msg);

      if (!body || body === "-") {
        logger.warn("[EvolutionProvider] Received empty or '-' text message");
        return undefined;
      }

      const messageData = {
        id: msg.key.id!,
        ticketId: ticket.id,
        contactId: msg.key.fromMe ? undefined : contact.id,
        body: body,
        fromMe: msg.key.fromMe!,
        read: msg.key.fromMe!,
        mediaType: "text",
        quotedMsgId: quotedMsg?.id,
        ack: msg.status ? Number(msg.status) : 1,
        remoteJid: msg.key.remoteJid!,
        participant: msg.key.participant,
        dataJson: JSON.stringify(msg)
      };

      await ticket.update({ lastMessage: body });

      const newMessage = await CreateMessageService({
        messageData,
        companyId: ticket.companyId
      });

      logger.info(`[EvolutionProvider] Text message created: ${newMessage.id}`);

      return newMessage;
    } catch (error) {
      logger.error(`[EvolutionProvider] Error handling text message: ${error}`);
      Sentry.captureException(error);
      return undefined;
    }
  }

  private async downloadMedia(msg: proto.IWebMessageInfo): Promise<{ filename: string; mimetype: string; data: Buffer } | undefined> {
    let media: any;
    let mimetype: string | undefined;
    const messageType = Object.keys(msg.message!)[0] as keyof proto.IMessage;

    try {
      if (messageType === "imageMessage") {
        media = msg.message.imageMessage;
        mimetype = msg.message.imageMessage.mimetype;
      } else if (messageType === "videoMessage") {
        media = msg.message.videoMessage;
        mimetype = msg.message.videoMessage.mimetype;
      } else if (messageType === "audioMessage") {
        media = msg.message.audioMessage;
        mimetype = msg.message.audioMessage.mimetype;
      } else if (messageType === "documentMessage") {
        media = msg.message.documentMessage;
        mimetype = msg.message.documentMessage.mimetype;
      } else if (messageType === "stickerMessage") {
        media = msg.message.stickerMessage;
        mimetype = msg.message.stickerMessage.mimetype || "image/webp";
      } else {
        logger.warn(`[EvolutionProvider] Unsupported media message type: ${messageType}`);
        return undefined;
      }

      if (media.url) {
        const response = await fetch(media.url);
        const data = await response.arrayBuffer();
        const filename = media.fileName || `${messageType}.${mimetype?.split('/')[1]}`;

        return {
          filename,
          mimetype: mimetype || `image/${mimetype?.split('/')[1]}`,
          data: Buffer.from(data)
        };
      } else if (media.directPath) {
        // Tentativa de usar directPath para baixar o arquivo
        const filePath = `${process.env.BAILEYS_MEDIA_PATH}/${media.directPath}`;
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath);
          const filename = media.fileName || `${messageType}.${mimetype?.split('/')[1]}`;
          return {
            filename,
            mimetype: mimetype || `image/${mimetype?.split('/')[1]}`,
            data: data
          };
        } else {
          logger.warn(`[EvolutionProvider] Media file not found at directPath: ${filePath}`);
          return undefined;
        }
      } else {
        logger.warn(`[EvolutionProvider] Media message has no URL or directPath.`);
        return undefined;
      }
    } catch (error) {
      logger.error(`[EvolutionProvider] Error downloading media: ${error}`);
      Sentry.captureException(error);
      return undefined;
    }
  }

  private async verifyQuotedMessage(msg: proto.IWebMessageInfo): Promise<Message | undefined> {
    if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      return undefined;
    }

    const quotedMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage;
    const quotedMsgId = Object.keys(quotedMessage)[0];

    if (!quotedMsgId) {
      return undefined;
    }

    // Tentar encontrar a mensagem original no banco de dados
    const message = await Message.findOne({
      where: {
        id: quotedMsgId
      }
    });

    return message || undefined;
  }

  private getBodyMessage(msg: proto.IWebMessageInfo): string | undefined {
    const message = msg.message;
    const messageType = Object.keys(message!)[0] as keyof proto.IMessage;

    switch (messageType) {
      case "conversation":
        return message?.conversation;
      case "imageMessage":
        return message?.imageMessage?.caption;
      case "videoMessage":
        return message?.videoMessage?.caption;
      case "audioMessage":
        return message?.audioMessage?.ptt ? undefined : message?.audioMessage?.text;
      case "documentMessage":
        return message?.documentMessage?.caption;
      case "extendedTextMessage":
        return message?.extendedTextMessage?.text;
      case "stickerMessage":
        return undefined; // Stickers don't have a text body
      default:
        logger.warn(`[EvolutionProvider] Unknown message type for getBodyMessage: ${messageType}`);
        return undefined;
    }
  }
}

export default EvolutionProvider;