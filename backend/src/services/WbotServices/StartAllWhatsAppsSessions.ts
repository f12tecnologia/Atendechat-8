import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import * as Sentry from "@sentry/node";
import { logger } from "../../utils/logger";

export const StartAllWhatsAppsSessions = async (
  companyId: number
): Promise<void> => {
  try {
    const whatsapps = await ListWhatsAppsService({ companyId });
    if (whatsapps.length > 0) {
      for (const whatsapp of whatsapps) {
        if (whatsapp.provider === "evolution") {
          logger.info(`Skipping Evolution API session: ${whatsapp.name} (managed externally)`);
          continue;
        }
        
        try {
          await StartWhatsAppSession(whatsapp, companyId);
        } catch (sessionError: any) {
          logger.error(`Failed to start session for ${whatsapp.name}: ${sessionError.message}`);
          Sentry.captureException(sessionError);
        }
      }
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};
