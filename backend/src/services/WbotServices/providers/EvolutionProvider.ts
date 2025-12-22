import * as Sentry from "@sentry/node";
import fs from "fs";
import ApiIntegration from "../../../models/ApiIntegration";
import formatBody from "../../../helpers/Mustache";
import AppError from "../../../errors/AppError";
import { WhatsAppProvider, SendTextOptions, SendMediaOptions } from "./WhatsAppProvider";
import EvolutionApiService from "../../EvolutionApiService/EvolutionApiService";
import { logger } from "../../../utils/logger";

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

      const number = ticket.contact.number;
      const textMessage = formatBody(body, ticket.contact);

      // Enviar mensagem via Evolution API
      const response = await evolutionService.sendTextMessage({
        instanceName,
        number,
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

      const number = ticket.contact.number;
      const caption = formatBody(body || "", ticket.contact);

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
        number,
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
