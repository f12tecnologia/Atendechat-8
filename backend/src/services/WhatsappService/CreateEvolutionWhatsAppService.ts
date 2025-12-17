import Whatsapp from "../../models/Whatsapp";
import ApiIntegration from "../../models/ApiIntegration";
import AppError from "../../errors/AppError";
import EvolutionApiService from "../EvolutionApiService/EvolutionApiService";
import CreateWhatsAppService from "./CreateWhatsAppService";
import { logger } from "../../utils/logger";

interface Request {
  name: string;
  companyId: number;
  apiIntegrationId: number;
  queueIds?: number[];
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  isDefault?: boolean;
}

interface Response {
  whatsapp: Whatsapp;
  qrcode: string | null;
  oldDefaultWhatsapp: Whatsapp | null;
}

const CreateEvolutionWhatsAppService = async ({
  name,
  companyId,
  apiIntegrationId,
  queueIds = [],
  greetingMessage = "",
  complationMessage = "",
  outOfHoursMessage = "",
  ratingMessage = "",
  isDefault = false
}: Request): Promise<Response> => {
  
  // Verificar se a integração existe e é válida
  const apiIntegration = await ApiIntegration.findOne({
    where: {
      id: apiIntegrationId,
      companyId,
      type: "evolution",
      isActive: true
    }
  });

  if (!apiIntegration) {
    throw new AppError("ERR_NO_EVOLUTION_INTEGRATION_FOUND", 404);
  }

  // Criar o serviço da Evolution API
  const evolutionService = new EvolutionApiService({
    baseUrl: apiIntegration.baseUrl,
    apiKey: apiIntegration.apiKey
  });

  // Gerar um nome de instância único baseado no nome da conexão + timestamp
  const instanceName = `${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;

  // Obter o domínio do webhook
  const webhookUrl = `${process.env.BACKEND_URL}/api-integrations/webhook/${companyId}`;

  let qrcode: string | null = null;

  try {
    // Criar instância na Evolution API
    const evolutionInstance = await evolutionService.createInstance({
      instanceName,
      qrcode: true,
      webhookUrl,
      webhookEvents: [
        "QRCODE_UPDATED",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "CONNECTION_UPDATE"
      ]
    });

    logger.info(`Evolution instance created: ${instanceName}`, evolutionInstance);

    // Aguardar um pouco para a instância inicializar
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Usar o endpoint /instance/connect para obter o QR code (método correto)
    try {
      logger.info(`Obtendo QR code via connect endpoint...`);
      const connectResponse = await evolutionService.connectInstance(instanceName);
      
      if (connectResponse) {
        qrcode = connectResponse.base64 || 
                 connectResponse.qrcode?.base64 || 
                 connectResponse.code || 
                 connectResponse.qrcode?.code || 
                 null;
        
        if (qrcode) {
          logger.info(`✅ QR code obtido com sucesso via connect endpoint`);
        } else {
          logger.warn(`⚠️ Resposta do connect não contém QR code:`, connectResponse);
        }
      }
    } catch (connectError: any) {
      logger.warn(`⚠️ Erro ao obter QR code via connect: ${connectError.message}`);
    }

    // Criar conexão WhatsApp com provider="evolution"
    const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
      name,
      status: "PENDING",
      queueIds,
      greetingMessage,
      complationMessage,
      outOfHoursMessage,
      ratingMessage,
      isDefault,
      companyId,
      provider: "evolution",
      apiIntegrationId
    });

    // Atualizar com o nome da instância e QR code se disponível
    await whatsapp.update({
      session: instanceName,
      qrcode: qrcode || ""
    });

    logger.info(`WhatsApp connection created for Evolution API: ${name}`);

    return {
      whatsapp,
      qrcode,
      oldDefaultWhatsapp
    };

  } catch (error) {
    logger.error("Error creating Evolution WhatsApp connection:", error);
    throw new AppError("ERR_CREATING_EVOLUTION_WHATSAPP");
  }
};

export default CreateEvolutionWhatsAppService;
