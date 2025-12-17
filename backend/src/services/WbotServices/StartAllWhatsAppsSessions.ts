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
        // Skip Evolution connections (managed externally)
        if (whatsapp.provider === "evolution") {
          logger.info(`Skipping Evolution API session: ${whatsapp.name} (managed externally)`);
          continue;
        }
        
        // Skip connections with names starting with "Evolution" (orphaned/duplicate entries)
        if (whatsapp.name.toLowerCase().startsWith("evolution")) {
          logger.warn(`Skipping orphaned Evolution connection: ${whatsapp.name}`);
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
