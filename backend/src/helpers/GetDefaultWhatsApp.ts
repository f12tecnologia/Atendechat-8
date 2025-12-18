import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import GetDefaultWhatsAppByUser from "./GetDefaultWhatsAppByUser";

const GetDefaultWhatsApp = async (
  companyId: number,
  userId?: number
): Promise<Whatsapp> => {
  if (userId) {
    const whatsappByUser = await GetDefaultWhatsAppByUser(userId);
    if (whatsappByUser?.status === 'CONNECTED') {
      return whatsappByUser;
    }
  }

  const defaultWhatsapp = await Whatsapp.findOne({
    where: { isDefault: true, companyId, status: "CONNECTED" }
  });

  if (defaultWhatsapp) {
    return defaultWhatsapp;
  }

  const evolutionConnection = await Whatsapp.findOne({
    where: { 
      status: "CONNECTED", 
      companyId,
      apiIntegrationId: { [Op.ne]: null }
    }
  });

  if (evolutionConnection) {
    return evolutionConnection;
  }

  const anyConnection = await Whatsapp.findOne({
    where: { status: "CONNECTED", companyId }
  });

  if (anyConnection) {
    return anyConnection;
  }

  throw new AppError(`Nenhum número de Whatsapp conectado foi encontrado para essa empresa`);
};

export default GetDefaultWhatsApp;