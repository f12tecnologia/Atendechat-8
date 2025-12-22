import * as Sentry from "@sentry/node";
import fs from "fs";
import ApiIntegration from "../../../models/ApiIntegration";
import Message from "../../../models/Message";
import formatBody from "../../../helpers/Mustache";
import AppError from "../../../errors/AppError";
import { WhatsAppProvider, SendTextOptions, SendMediaOptions } from "./WhatsAppProvider";
import EvolutionApiService from "../../EvolutionApiService/EvolutionApiService";
import { logger } from "../../../utils/logger";

// Função auxiliar para obter o número correto para envio via Evolution API
// Evolution API espera número limpo (E.164) ou JID completo com @lid para LIDs
async function getReplyNumber(ticketId: number, contactNumber: string): Promise<string> {
  // Buscar última mensagem recebida (fromMe=false) do ticket para obter o remoteJid correto
  const lastReceivedMessage = await Message.findOne({
    where: {
      ticketId,
      fromMe: false
    },
    order: [["createdAt", "DESC"]]
  });
  
  if (lastReceivedMessage?.remoteJid) {
    const savedJid = lastReceivedMessage.remoteJid;
    
    // Se é um LID, precisamos enviar com o formato @lid para Evolution API
    if (savedJid.includes("@lid")) {
      logger.info(`[EvolutionProvider] Using LID format for reply: ${savedJid}`);
      return savedJid; // Manter formato completo @lid
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
  
  // Fallback: usar o número do contato
  // Isso pode falhar para LIDs se o número armazenado for o LID sem @
  logger.info(`[EvolutionProvider] No saved remoteJid, using contact number: ${contactNumber}`);
  return contactNumber;
}

class EvolutionProvider implements WhatsAppProvider {
  getProviderName(): string {
    return "evolution";
  }

  async sendText({ body, ticket, quotedMsg }: SendTextOptions): Promise<any> {
    try {
      // Buscar integração Evolution API
      const apiIntegration = await ApiIntegration.findByPk(ticket.whatsapp.apiIntegrationId);

      if (!apiIntegration) {
        logger.error("[EvolutionProvider] No API integration found for apiIntegrationId:", ticket.whatsapp.apiIntegrationId);
        throw new AppError("ERR_NO_EVOLUTION_INTEGRATION");
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
        throw new AppError("ERR_NO_INSTANCE_NAME");
      }

      logger.info(`[EvolutionProvider] Sending text message via instance: ${instanceName}`);

      const evolutionService = new EvolutionApiService({
        baseUrl: apiIntegration.baseUrl,
        apiKey: apiIntegration.apiKey
      });

      // Obter o número correto para responder (pode ser LID ou número normal)
      const replyNumber = await getReplyNumber(ticket.id, ticket.contact.number);
      const textMessage = formatBody(body, ticket.contact);

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
        status: err?.response?.status,
        ticketId: ticket?.id,
        contactNumber: ticket?.contact?.number
      });
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  async sendMedia({ media, ticket, body }: SendMediaOptions): Promise<any> {
    try {
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
      const caption = formatBody(body || "", ticket.contact);

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
        status: err?.response?.status,
        ticketId: ticket?.id,
        contactNumber: ticket?.contact?.number
      });
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }
}

export default EvolutionProvider;
