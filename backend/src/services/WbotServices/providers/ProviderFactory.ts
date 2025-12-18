import { Op } from "sequelize";
import Ticket from "../../../models/Ticket";
import { WhatsAppProvider } from "./WhatsAppProvider";
import BaileysProvider from "./BaileysProvider";
import EvolutionProvider from "./EvolutionProvider";
import Whatsapp from "../../../models/Whatsapp";
import { logger } from "../../../utils/logger";
import AppError from "../../../errors/AppError";

// Baileys provider is disabled - only Evolution API is used
const BAILEYS_DISABLED = true;

class ProviderFactory {
  static async getProvider(ticket: Ticket): Promise<WhatsAppProvider> {
    // Recarregar ticket com whatsapp associado se necessário
    if (!ticket.whatsapp) {
      await ticket.reload({
        include: [{ model: Whatsapp, as: "whatsapp" }]
      });
    }

    // Se tem apiIntegrationId, usa Evolution API
    if (ticket.whatsapp?.apiIntegrationId) {
      return new EvolutionProvider();
    }

    // Se Baileys desativado, tentar encontrar uma conexão Evolution para o ticket
    if (BAILEYS_DISABLED) {
      // Buscar conexão Evolution disponível
      const evolutionConnection = await Whatsapp.findOne({
        where: {
          companyId: ticket.companyId,
          status: "CONNECTED",
          apiIntegrationId: { [Op.ne]: null }
        }
      });

      if (evolutionConnection) {
        // Re-associar ticket à conexão Evolution
        logger.info(`[ProviderFactory] Re-associating ticket ${ticket.id} to Evolution connection ${evolutionConnection.id}`);
        await ticket.$set("whatsapp", evolutionConnection);
        await ticket.reload({
          include: [{ model: Whatsapp, as: "whatsapp" }]
        });
        return new EvolutionProvider();
      }

      // Tentar qualquer conexão Evolution mesmo que não esteja CONNECTED (pode estar gerenciada externamente)
      const anyEvolutionConnection = await Whatsapp.findOne({
        where: {
          companyId: ticket.companyId,
          apiIntegrationId: { [Op.ne]: null }
        }
      });

      if (anyEvolutionConnection) {
        logger.info(`[ProviderFactory] Re-associating ticket ${ticket.id} to Evolution connection ${anyEvolutionConnection.id} (any status)`);
        await ticket.$set("whatsapp", anyEvolutionConnection);
        await ticket.reload({
          include: [{ model: Whatsapp, as: "whatsapp" }]
        });
        return new EvolutionProvider();
      }

      throw new AppError("Nenhuma conexão WhatsApp Evolution disponível. Configure uma conexão Evolution na página de Conexões.");
    }

    // Caso contrário, usa Baileys
    return new BaileysProvider();
  }
}

export default ProviderFactory;
