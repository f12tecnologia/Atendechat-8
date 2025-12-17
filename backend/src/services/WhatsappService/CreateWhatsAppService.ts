import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";

interface Request {
  name: string;
  companyId: number;
  queueIds?: number[];
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  status?: string;
  isDefault?: boolean;
  token?: string;
  provider?: string;
  //sendIdQueue?: number;
  //timeSendQueue?: number;
  transferQueueId?: number;
  timeToTransfer?: number;    
  promptId?: number;
  maxUseBotQueues?: number;
  timeUseBotQueues?: number;
  expiresTicket?: number;
  expiresInactiveMessage?: string;
  integrationId?: number;
  apiIntegrationId?: number;
}

interface Response {
  whatsapp: Whatsapp;
  oldDefaultWhatsapp: Whatsapp | null;
}

const CreateWhatsAppService = async ({
  name,
  status = "OPENING",
  queueIds = [],
  greetingMessage,
  complationMessage,
  outOfHoursMessage,
  ratingMessage,
  isDefault = false,
  companyId,
  token = "",
  provider = "beta",
  //timeSendQueue,
  //sendIdQueue,
  transferQueueId,
  timeToTransfer,    
  promptId,
  maxUseBotQueues = 3,
  timeUseBotQueues = 0,
  expiresTicket = 0,
  expiresInactiveMessage = "",
  integrationId = null,
  apiIntegrationId = null
}: Request): Promise<Response> => {

  const company = await Company.findOne({
    where: {
      id: companyId
    },
    include: [{ model: Plan, as: "plan" }]
  });

  if (company !== null) {
    const whatsappCount = await Whatsapp.count({
      where: {
        companyId
      }
    });

    if (whatsappCount >= company.plan.connections) {
      throw new AppError(
        `Número máximo de conexões já alcançado: ${whatsappCount}`
      );
    }
  }

  // Extract phone number from name (removes prefixes like "Evolution - ")
  const extractPhoneNumber = (connectionName: string): string => {
    // Remove common prefixes and extract just the number
    const cleaned = connectionName
      .replace(/^evolution\s*-?\s*/i, "")
      .replace(/^whatsapp\s*-?\s*/i, "")
      .replace(/[^0-9]/g, "");
    return cleaned;
  };

  const phoneNumber = extractPhoneNumber(name);

  const schema = Yup.object().shape({
    name: Yup.string()
      .required()
      .min(2)
      .test(
        "Check-name",
        "Esse nome já está sendo utilizado por outra conexão",
        async value => {
          if (!value) return false;
          const nameExists = await Whatsapp.findOne({
            where: { name: value, companyId }
          });
          return !nameExists;
        }
      )
      .test(
        "Check-phone-duplicate",
        "Já existe uma conexão com este número de telefone",
        async value => {
          if (!value) return false;
          const inputPhone = extractPhoneNumber(value);
          if (!inputPhone || inputPhone.length < 8) return true; // Skip check for non-phone names
          
          // Find any existing connection with the same phone number
          const { Op } = require("sequelize");
          const existingConnections = await Whatsapp.findAll({
            where: { companyId }
          });
          
          for (const conn of existingConnections) {
            const connPhone = extractPhoneNumber(conn.name);
            if (connPhone === inputPhone) {
              return false; // Duplicate found
            }
          }
          return true;
        }
      ),
    isDefault: Yup.boolean().required()
  });

  try {
    await schema.validate({ name, status, isDefault });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const whatsappFound = await Whatsapp.findOne({ where: { companyId } });

  isDefault = !whatsappFound;

  let oldDefaultWhatsapp: Whatsapp | null = null;

  if (isDefault) {
    oldDefaultWhatsapp = await Whatsapp.findOne({
      where: { isDefault: true, companyId }
    });
    if (oldDefaultWhatsapp) {
      await oldDefaultWhatsapp.update({ isDefault: false, companyId });
    }
  }

  if (queueIds.length > 1 && !greetingMessage) {
    throw new AppError("ERR_WAPP_GREETING_REQUIRED");
  }

  if (token !== null && token !== "") {
    const tokenSchema = Yup.object().shape({
      token: Yup.string()
        .required()
        .min(2)
        .test(
          "Check-token",
          "This whatsapp token is already used.",
          async value => {
            if (!value) return false;
            const tokenExists = await Whatsapp.findOne({
              where: { token: value }
            });
            return !tokenExists;
          }
        )
    });

    try {
      await tokenSchema.validate({ token });
    } catch (err: any) {
      throw new AppError(err.message);
    }
  }

  const whatsapp = await Whatsapp.create(
    {
      name,
      status,
      greetingMessage,
      complationMessage,
      outOfHoursMessage,
      ratingMessage,
      isDefault,
      companyId,
      token,
      provider,
      //timeSendQueue,
      //sendIdQueue,
            transferQueueId,
            timeToTransfer,       
      promptId,
      maxUseBotQueues,
      timeUseBotQueues,
      expiresTicket,
      expiresInactiveMessage,
      integrationId,
      apiIntegrationId
    },
    { include: ["queues"] }
  );

  await AssociateWhatsappQueue(whatsapp, queueIds);

  return { whatsapp, oldDefaultWhatsapp };
};

export default CreateWhatsAppService;
