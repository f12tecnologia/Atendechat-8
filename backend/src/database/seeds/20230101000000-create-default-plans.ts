
import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const plans = await queryInterface.sequelize.query(
      'SELECT id FROM "Plans" LIMIT 1;'
    );

    if (plans[0].length === 0) {
      return queryInterface.bulkInsert(
        "Plans",
        [
          {
            name: "Plano Básico",
            users: 5,
            connections: 2,
            queues: 3,
            amount: "29.90",
            useWhatsapp: true,
            useFacebook: false,
            useInstagram: false,
            useCampaigns: true,
            useSchedules: true,
            useInternalChat: true,
            useExternalApi: true,
            useKanban: true,
            useOpenAi: true,
            useIntegrations: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            name: "Plano Profissional",
            users: 10,
            connections: 5,
            queues: 10,
            amount: "59.90",
            useWhatsapp: true,
            useFacebook: true,
            useInstagram: true,
            useCampaigns: true,
            useSchedules: true,
            useInternalChat: true,
            useExternalApi: true,
            useKanban: true,
            useOpenAi: true,
            useIntegrations: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            name: "Plano Enterprise",
            users: 50,
            connections: 20,
            queues: 50,
            amount: "199.90",
            useWhatsapp: true,
            useFacebook: true,
            useInstagram: true,
            useCampaigns: true,
            useSchedules: true,
            useInternalChat: true,
            useExternalApi: true,
            useKanban: true,
            useOpenAi: true,
            useIntegrations: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );
    }
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Plans", {});
  },
};
