import * as Sentry from "@sentry/node";
import fs from "fs";
import ApiIntegration from "../../../models/ApiIntegration";
import formatBody from "../../../helpers/Mustache";
import AppError from "../../../errors/AppError";
import { WhatsAppProvider, SendTextOptions, SendMediaOptions } from "./WhatsAppProvider";
import EvolutionApiService from "../../EvolutionApiService/EvolutionApiService";

class EvolutionProvider implements WhatsAppProvider {
  getProviderName(): string {
    return "evolution";
  }

  async sendText({ body, ticket, quotedMsg }: SendTextOptions): Promise<any> {
    try {
      // Buscar integração Evolution API
      const apiIntegration = await ApiIntegration.findByPk(ticket.whatsapp.apiIntegrationId);

      if (!apiIntegration) {
        throw new AppError("ERR_NO_EVOLUTION_INTEGRATION");
      }

      const evolutionService = new EvolutionApiService({
        baseUrl: apiIntegration.baseUrl,
        apiKey: apiIntegration.apiKey
      });

      const number = ticket.contact.number;
      const textMessage = formatBody(body, ticket.contact);

      // Enviar mensagem via Evolution API
      const response = await evolutionService.sendTextMessage({
        instanceName: apiIntegration.instanceName,
        number,
        text: textMessage
      });

      await ticket.update({ lastMessage: textMessage });

      return response;
    } catch (err) {
      Sentry.captureException(err);
      console.log(err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  async sendMedia({ media, ticket, body }: SendMediaOptions): Promise<any> {
    try {
      // Buscar integração Evolution API
      const apiIntegration = await ApiIntegration.findByPk(ticket.whatsapp.apiIntegrationId);

      if (!apiIntegration) {
        throw new AppError("ERR_NO_EVOLUTION_INTEGRATION");
      }

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
        instanceName: apiIntegration.instanceName,
        number,
        mediatype,
        media: base64Data,
        caption
      });

      await ticket.update({ lastMessage: caption || media.originalname });

      return response;
    } catch (err) {
      Sentry.captureException(err);
      console.log(err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }
}

export default EvolutionProvider;
