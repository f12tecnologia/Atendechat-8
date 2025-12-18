import { initWASocket } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import { logger } from "../../utils/logger";
import * as Sentry from "@sentry/node";

// Baileys provider is disabled - only Evolution API is used
const BAILEYS_DISABLED = true;

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  // Skip Evolution API connections (managed externally)
  if (whatsapp.provider === "evolution" || whatsapp.apiIntegrationId) {
    logger.info(`Skipping Evolution API session start: ${whatsapp.name} (managed externally)`);
    return;
  }

  // Skip all Baileys sessions when disabled
  if (BAILEYS_DISABLED) {
    logger.info(`Baileys disabled - not starting session: ${whatsapp.name}`);
    await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
    const io = getIO();
    io.to(`company-${whatsapp.companyId}-mainchannel`).emit("whatsappSession", {
      action: "update",
      session: whatsapp
    });
    return;
  }

  await whatsapp.update({ status: "OPENING" });

  const io = getIO();
  io.to(`company-${whatsapp.companyId}-mainchannel`).emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });

  try {
    const wbot = await initWASocket(whatsapp);
    wbotMessageListener(wbot, companyId);
    wbotMonitor(wbot, whatsapp, companyId);
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};
