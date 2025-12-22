import fs from "fs";
import path from "path";
import axios from "axios";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import Queue from "../../models/Queue";
import ApiIntegration from "../../models/ApiIntegration";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import EvolutionApiService from "./EvolutionApiService";

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

// Função auxiliar para processar e salvar mídia recebida
const processMediaMessage = async (
  messageContent: any,
  messageId: string,
  fileName: string,
  instanceName: string,
  apiIntegration: any
): Promise<string> => {
  try {
    if (!messageContent) {
      logger.warn(`[MEDIA] No message content provided`);
      return "";
    }

    let base64Data: string | null = null;
    
    // Opção 1: base64 já está no webhook
    if (messageContent.base64) {
      base64Data = messageContent.base64;
      // Remover prefixo data URI se presente
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }
      logger.info(`[MEDIA] Using base64 from webhook`);
    }
    // Opção 2: Baixar da mediaUrl se disponível
    else if (messageContent.mediaUrl) {
      try {
        const response = await axios.get(messageContent.mediaUrl, {
          responseType: "arraybuffer",
          timeout: 30000
        });
        base64Data = Buffer.from(response.data).toString("base64");
        logger.info(`[MEDIA] Downloaded from mediaUrl`);
      } catch (downloadErr: any) {
        logger.warn(`[MEDIA] Failed to download from mediaUrl: ${downloadErr.message}`);
      }
    }
    // Opção 3: Buscar via API getBase64FromMediaMessage
    else if (instanceName && messageId) {
      try {
        const evolutionService = new EvolutionApiService({
          baseUrl: apiIntegration.baseUrl,
          apiKey: apiIntegration.apiKey
        });
        
        const fetchedBase64 = await evolutionService.getBase64FromMediaMessage(
          instanceName,
          messageId,
          false
        );
        
        if (fetchedBase64) {
          base64Data = fetchedBase64;
          // Remover prefixo data URI se presente
          if (base64Data.includes(",")) {
            base64Data = base64Data.split(",")[1];
          }
          logger.info(`[MEDIA] Fetched base64 via API`);
        }
      } catch (apiErr: any) {
        logger.warn(`[MEDIA] Failed to fetch base64 via API: ${apiErr.message}`);
      }
    }

    if (!base64Data) {
      logger.warn(`[MEDIA] Could not retrieve media data`);
      return "";
    }

    // Garantir que a pasta public existe
    if (!fs.existsSync(publicFolder)) {
      fs.mkdirSync(publicFolder, { recursive: true });
    }

    // Salvar arquivo de forma assíncrona
    const filePath = path.join(publicFolder, fileName);
    const buffer = Buffer.from(base64Data, "base64");
    
    await fs.promises.writeFile(filePath, buffer);

    logger.info(`[MEDIA] Saved media to ${fileName} (${buffer.length} bytes)`);
    
    // Retornar nome do arquivo (o frontend acessa via /public/filename)
    return fileName;
  } catch (error) {
    logger.error(`[MEDIA] Error processing media: ${error}`);
    return "";
  }
};

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
      // Tentar buscar por instanceName parcial (nome pode ter sido normalizado)
      apiIntegration = await ApiIntegration.findOne({
        where: {
          companyId,
          type: "evolution",
          isActive: true
        }
      });
      
      if (!apiIntegration) {
        logger.warn(`[WEBHOOK] No Evolution integration found for company ${companyId}. Skipping.`);
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

      // Buscar conexão WhatsApp por apiIntegrationId (prioritário)
      let whatsapp = await Whatsapp.findOne({
        where: {
          apiIntegrationId: apiIntegration.id,
          companyId
        }
      });

      if (!whatsapp) {
        // Fallback: buscar por session (instanceName) ou nome (sem prefixo duplicado)
        const { Op } = require("sequelize");
        whatsapp = await Whatsapp.findOne({
          where: {
            companyId,
            provider: "evolution",
            [Op.or]: [
              { session: instance },
              { name: instance }
            ]
          }
        });
        
        // Se encontrou, vincular à ApiIntegration
        if (whatsapp) {
          await whatsapp.update({ apiIntegrationId: apiIntegration.id });
          logger.info(`[WEBHOOK] Linked existing WhatsApp ${whatsapp.id} to integration ${apiIntegration.id}`);
        }
      }

      if (!whatsapp) {
        // Não criar nova conexão - a conexão deve ser criada manualmente
        logger.warn(`[WEBHOOK] No WhatsApp connection found for instance: ${instance}. Skipping connection update.`);
        return;
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
    const { Op } = require("sequelize");
    let whatsapp = await Whatsapp.findOne({
      where: {
        apiIntegrationId: apiIntegration.id,
        companyId
      }
    });

    if (!whatsapp) {
      // Fallback: buscar por session (instanceName) ou nome (sem prefixo duplicado)
      whatsapp = await Whatsapp.findOne({
        where: {
          companyId,
          provider: "evolution",
          [Op.or]: [
            { session: instance },
            { name: instance }
          ]
        }
      });
      
      // Se encontrou, vincular à ApiIntegration
      if (whatsapp) {
        await whatsapp.update({ apiIntegrationId: apiIntegration.id });
        logger.info(`[WEBHOOK] Linked existing WhatsApp ${whatsapp.id} to integration ${apiIntegration.id}`);
      }
    }

    if (!whatsapp) {
      // Não criar nova conexão - ignorar webhook
      logger.warn(`[WEBHOOK] No WhatsApp connection found for instance: ${instance}. Skipping message.`);
      return;
    }

    // Extrair número do contato (remover @s.whatsapp.net e @lid)
    const isGroup = data.key.remoteJid.includes("@g.us");
    const contactNumber = data.key.remoteJid
      .replace("@s.whatsapp.net", "")
      .replace("@lid", "")
      .replace("@g.us", "");
    
    // Buscar foto de perfil (apenas para contatos individuais, não grupos)
    let profilePicUrl = "";
    // Usar instanceName da integração ou o instance do webhook como fallback
    const instanceNameToUse = apiIntegration.instanceName || instance;
    
    if (!isGroup && contactNumber && instanceNameToUse) {
      try {
        const evolutionService = new EvolutionApiService({
          baseUrl: apiIntegration.baseUrl,
          apiKey: apiIntegration.apiKey
        });
        
        const fetchedProfilePic = await evolutionService.getProfilePicture(
          instanceNameToUse,
          contactNumber
        );
        
        profilePicUrl = fetchedProfilePic || "";
        
        if (profilePicUrl) {
          logger.info(`[WEBHOOK] Profile picture fetched for ${contactNumber}: ${profilePicUrl.substring(0, 50)}...`);
        }
      } catch (error) {
        logger.warn(`[WEBHOOK] Failed to fetch profile picture for ${contactNumber}: ${error.message}`);
        profilePicUrl = "";
      }
    }
    
    // Criar ou atualizar contato
    const contactData = {
      name: data.pushName || contactNumber,
      number: contactNumber,
      profilePicUrl,
      isGroup
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

    // Buscar fila padrão do WhatsApp (primeira fila via WhatsappQueue)
    // Como Sequelize v5 não suporta ordenação em BelongsToMany,
    // buscamos todas e ordenamos em memória
    await whatsapp.reload({
      include: [{
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "orderQueue"]
      }]
    });

    // Ordenar filas por orderQueue em memória (mais confiável que SQL order)
    const sortedQueues = (whatsapp.queues || []).sort((a, b) => 
      (a.orderQueue || 9999) - (b.orderQueue || 9999)
    );
    
    const defaultQueueId = sortedQueues.length > 0 ? sortedQueues[0].id : 0;
    const defaultQueueName = sortedQueues.length > 0 ? sortedQueues[0].name : "none";
    
    logger.info(`[WEBHOOK] Default queue for whatsapp ${whatsapp.id}: ${defaultQueueId} (${defaultQueueName})`);

    // Criar ou encontrar ticket
    const ticket = await FindOrCreateTicketService(
      contact,
      whatsapp.id!,
      defaultQueueId,
      companyId,
      undefined
    );

    // Extrair corpo da mensagem e processar mídia
    let body = "";
    let mediaType = "chat";
    let mediaUrl = "";
    let fileName = "";
    let mimetype = "";

    if (data.message) {
      if (data.message.conversation) {
        body = data.message.conversation;
      } else if (data.message.extendedTextMessage) {
        body = data.message.extendedTextMessage.text;
      } else if (data.message.imageMessage) {
        body = data.message.imageMessage.caption || "[imagem]";
        mediaType = "image";
        mimetype = data.message.imageMessage.mimetype || "image/jpeg";
        // Usar messageId + timestamp para evitar colisões
        fileName = `${data.key.id}_${Date.now()}.${mimetype.split("/")[1] || "jpg"}`;
        
        // Processar mídia: base64, mediaUrl ou buscar via API
        const savedPath = await processMediaMessage(
          data.message.imageMessage,
          data.key.id,
          fileName,
          instanceNameToUse,
          apiIntegration
        );
        if (savedPath) mediaUrl = savedPath;
        
      } else if (data.message.videoMessage) {
        body = data.message.videoMessage.caption || "[vídeo]";
        mediaType = "video";
        mimetype = data.message.videoMessage.mimetype || "video/mp4";
        fileName = `${data.key.id}_${Date.now()}.${mimetype.split("/")[1] || "mp4"}`;
        
        const savedPath = await processMediaMessage(
          data.message.videoMessage,
          data.key.id,
          fileName,
          instanceNameToUse,
          apiIntegration
        );
        if (savedPath) mediaUrl = savedPath;
        
      } else if (data.message.audioMessage) {
        body = "[áudio]";
        mediaType = "audio";
        mimetype = data.message.audioMessage.mimetype || "audio/ogg";
        const ext = data.message.audioMessage.ptt ? "ogg" : (mimetype.split("/")[1] || "ogg");
        fileName = `${data.key.id}_${Date.now()}.${ext}`;
        
        const savedPath = await processMediaMessage(
          data.message.audioMessage,
          data.key.id,
          fileName,
          instanceNameToUse,
          apiIntegration
        );
        if (savedPath) mediaUrl = savedPath;
        
      } else if (data.message.documentMessage) {
        body = data.message.documentMessage.caption || data.message.documentMessage.fileName || "[documento]";
        mediaType = "document";
        mimetype = data.message.documentMessage.mimetype || "application/octet-stream";
        // Para documentos, usar o nome original ou gerar um único
        const originalName = data.message.documentMessage.fileName || "";
        fileName = originalName ? `${data.key.id}_${originalName}` : `${data.key.id}_${Date.now()}.pdf`;
        
        const savedPath = await processMediaMessage(
          data.message.documentMessage,
          data.key.id,
          fileName,
          instanceNameToUse,
          apiIntegration
        );
        if (savedPath) mediaUrl = savedPath;
        
      } else if (data.message.stickerMessage) {
        body = "[sticker]";
        mediaType = "sticker";
        mimetype = data.message.stickerMessage.mimetype || "image/webp";
        fileName = `${data.key.id}_${Date.now()}.webp`;
        
        const savedPath = await processMediaMessage(
          data.message.stickerMessage,
          data.key.id,
          fileName,
          instanceNameToUse,
          apiIntegration
        );
        if (savedPath) mediaUrl = savedPath;
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

    logger.info(`Evolution API message processed: ${data.key.id}, mediaType=${mediaType}, mediaUrl=${mediaUrl ? 'saved' : 'none'}`);
  } catch (error) {
    logger.error(`Error processing Evolution API webhook: ${error}`);
    throw error;
  }
};

export default ProcessEvolutionWebhookService;
