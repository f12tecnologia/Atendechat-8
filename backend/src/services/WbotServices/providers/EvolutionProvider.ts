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
      // Log detalhado para debug
      logger.info(`[EvolutionProvider] sendText called for ticket ${ticket.id}`);
      logger.info(`[EvolutionProvider] Ticket whatsapp details: id=${ticket.whatsapp?.id}, name=${ticket.whatsapp?.name}, apiIntegrationId=${ticket.whatsapp?.apiIntegrationId}`);
      
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
      
      // Se não conseguimos obter um número válido, não podemos enviar
      if (!replyNumber) {
        logger.error(`[EvolutionProvider] Cannot send media - no valid number for contact: ${ticket.contact.number}`);
        throw new AppError("Não foi possível enviar mídia. O contato não tem um número válido para resposta.");
      }
      
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
