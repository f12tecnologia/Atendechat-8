import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import * as Sentry from "@sentry/node";
import { logger } from "../../utils/logger";

// Baileys provider is disabled - only Evolution API is used
const BAILEYS_DISABLED = true;

export const StartAllWhatsAppsSessions = async (
  companyId: number
): Promise<void> => {
  try {
    const whatsapps = await ListWhatsAppsService({ companyId });
    if (whatsapps.length > 0) {
      for (const whatsapp of whatsapps) {
        // Skip Evolution connections (managed externally via Evolution API)
        if (whatsapp.provider === "evolution" || whatsapp.apiIntegrationId) {
          logger.info(`Skipping Evolution API session: ${whatsapp.name} (managed externally)`);
          continue;
        }
        
        // Skip all Baileys sessions when disabled
        if (BAILEYS_DISABLED) {
          logger.info(`Baileys disabled - skipping session: ${whatsapp.name}`);
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
