import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const tableDescription = await queryInterface.describeTable("Companies");

      if (!tableDescription.evolutionApiUrl) {
        await queryInterface.addColumn(
          "Companies",
          "evolutionApiUrl",
          {
            type: DataTypes.STRING,
            allowNull: true
          },
          { transaction: t }
        );
      }

      if (!tableDescription.evolutionApiKey) {
        await queryInterface.addColumn(
          "Companies",
          "evolutionApiKey",
          {
            type: DataTypes.STRING,
            allowNull: true
          },
          { transaction: t }
        );
      }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn("Companies", "evolutionApiUrl", { transaction: t });
      await queryInterface.removeColumn("Companies", "evolutionApiKey", { transaction: t });
    });
  }
};
