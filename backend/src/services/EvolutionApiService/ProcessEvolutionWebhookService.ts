import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import ApiIntegration from "../../models/ApiIntegration";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

interface EvolutionWebhookData {
  event: string;
  instance: string;
  server_url?: string;
  apikey?: string;
  data: {
    // Evolution API envia mensagens em array
    messages?: Array<{
      key: {
        remoteJid: string;
        fromMe: boolean;
        id: string;
      };
      pushName?: string;
      message?: any;
      messageType?: string;
      messageTimestamp?: number;
    }>;
    // Campos diretos (compatibilidade Baileys)
    key?: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    keyId?: string;
    remoteJid?: string;
    fromMe?: boolean;
    status?: string;
    state?: string;
    qr?: string;
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
    let { event, instance, data } = webhookData;
    const io = getIO();

    // Log detalhado do webhook recebido
    logger.info(`[WEBHOOK] Received: event=${event}, instance=${instance}, companyId=${companyId}`);
    logger.info(`[WEBHOOK] Full payload: ${JSON.stringify(webhookData, null, 2)}`);

    // Normalizar nome do evento: Evolution API envia em UPPERCASE (MESSAGES_UPSERT, CONNECTION_UPDATE)
    // mas o código espera lowercase estilo Baileys (messages.upsert, connection.update)
    const originalEvent = event;
    event = event.toLowerCase().replace(/_/g, ".");
    
    if (originalEvent !== event) {
      logger.info(`[WEBHOOK] Normalized event name: ${originalEvent} -> ${event}`);
    }

    // Buscar a integração Evolution API
    let apiIntegration = await ApiIntegration.findOne({
      where: {
        companyId,
        type: "evolution",
        instanceName: instance,
        isActive: true
      }
    });

    if (!apiIntegration) {
      logger.warn(`[WEBHOOK] Integration not found for instance: ${instance}`);
      logger.info(`[WEBHOOK] Auto-creating integration for instance: ${instance}`);
      
      // Auto-criar integração para esta instância
      try {
        // Extrair URL base e API key do webhook (se disponível via headers ou payload)
        const baseUrl = webhookData.server_url || "https://evolution.intelfoz.app.br";
        const apiKey = webhookData.apikey || "c680d58f04ed48c97cb13bd3b5b7a05b"; // fallback para key conhecida
        
        apiIntegration = await ApiIntegration.create({
          name: `Evolution - ${instance}`,
          type: "evolution",
          baseUrl,
          apiKey,
          instanceName: instance,
          isActive: true,
          webhookUrl: "",
          companyId
        });
        
        logger.info(`[WEBHOOK] ✅ Auto-created integration: id=${apiIntegration.id}, name=${apiIntegration.name}`);
        
        // Emitir evento Socket.IO para atualizar frontend
        const io = getIO();
        io.to(`company-${companyId}-notification`)
          .to(`company-${companyId}-mainchannel`)
          .emit(`company-${companyId}-apiIntegration`, {
            action: "create",
            apiIntegration
          });
      } catch (error) {
        logger.error(`[WEBHOOK] Failed to auto-create integration: ${error}`);
        return;
      }
    }
    
    logger.info(`[WEBHOOK] Found integration: id=${apiIntegration.id}, name=${apiIntegration.name}`);

    // Processar eventos de conexão
    if (event === "connection.update") {
      const rawState = data.state || data.status;
      const state = rawState?.toString().toUpperCase();
      const qr = data.qr;
      
      logger.info(`Evolution connection update: instance=${instance}, state=${state}, rawState=${rawState}`);

      // Buscar conexão WhatsApp por apiIntegrationId (prioritário) ou nome (fallback)
      let whatsapp = await Whatsapp.findOne({
        where: {
          apiIntegrationId: apiIntegration.id,
          companyId
        }
      });

      if (!whatsapp) {
        // Fallback: buscar por nome (para migração de dados antigos)
        whatsapp = await Whatsapp.findOne({
          where: {
            name: `Evolution - ${apiIntegration.name}`,
            companyId
          }
        });
        
        // Se encontrou por nome, atualizar apiIntegrationId
        if (whatsapp) {
          await whatsapp.update({ apiIntegrationId: apiIntegration.id });
        }
      }

      if (!whatsapp) {
        // Criar nova conexão vinculada à integração
        whatsapp = await Whatsapp.create({
          name: `Evolution - ${apiIntegration.name}`,
          status: "PENDING",
          number: instance,
          isDefault: false,
          companyId,
          channel: "whatsapp",
          apiIntegrationId: apiIntegration.id
        });
      }

      // Mapear estados da Evolution API para estados internos
      const stateMapping: { [key: string]: string } = {
        "OPEN": "CONNECTED",
        "CONNECTED": "CONNECTED",
        "CONNECTED_RESTORE": "CONNECTED",
        "CLOSE": "DISCONNECTED",
        "DISCONNECTED": "DISCONNECTED",
        "CONNECTING": "OPENING",
        "QR_CODE": "qrcode",
        "QR": "qrcode"
      };

      const newStatus = stateMapping[state] || "PENDING";
      
      // Atualizar status da conexão
      await whatsapp.update({
        status: newStatus,
        qrcode: qr || "",
        retries: newStatus === "CONNECTED" ? 0 : whatsapp.retries
      });

      // Recarregar para obter dados atualizados
      await whatsapp.reload();

      // Emitir evento socket para atualizar frontend (usando toJSON para serialização)
      io.to(`company-${companyId}-mainchannel`).emit(
        `company-${companyId}-whatsappSession`,
        {
          action: "update",
          session: whatsapp.toJSON()
        }
      );

      logger.info(`Evolution connection updated: ${instance} -> ${newStatus}`);
      return;
    }

    // Processar apenas eventos de mensagens recebidas
    if (event !== "messages.upsert") {
      logger.info(`[WEBHOOK] Skipping event: ${event}`);
      return;
    }

    // Evolution API envia mensagens dentro de data.messages[], Baileys envia direto em data
    // Normalizar para usar o mesmo formato
    if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
      logger.info(`[WEBHOOK] Evolution format detected - extracting message from array`);
      data = data.messages[0]; // Pegar primeira mensagem do array
    }

    // Ignorar mensagens enviadas por nós
    const fromMe = data.key?.fromMe || data.fromMe || false;
    if (fromMe) {
      logger.info(`[WEBHOOK] Skipping message from self`);
      return;
    }

    // Garantir que temos os dados da key
    if (!data.key) {
      logger.warn(`[WEBHOOK] No key data in webhook - data structure: ${JSON.stringify(Object.keys(data))}`);
      return;
    }
    
    logger.info(`[WEBHOOK] Processing message: id=${data.key.id}, from=${data.key.remoteJid}`);

    // Buscar conexão WhatsApp por apiIntegrationId
    let whatsapp = await Whatsapp.findOne({
      where: {
        apiIntegrationId: apiIntegration.id,
        companyId
      }
    });

    if (!whatsapp) {
      // Fallback: buscar por nome (para migração de dados antigos)
      whatsapp = await Whatsapp.findOne({
        where: {
          name: `Evolution - ${apiIntegration.name}`,
          companyId
        }
      });
      
      // Se encontrou por nome, atualizar apiIntegrationId
      if (whatsapp) {
        await whatsapp.update({ apiIntegrationId: apiIntegration.id });
      }
    }

    if (!whatsapp) {
      // Criar nova conexão vinculada à integração
      whatsapp = await Whatsapp.create({
        name: `Evolution - ${apiIntegration.name}`,
        status: "CONNECTED",
        number: instance,
        isDefault: false,
        companyId,
        channel: "whatsapp",
        apiIntegrationId: apiIntegration.id
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
