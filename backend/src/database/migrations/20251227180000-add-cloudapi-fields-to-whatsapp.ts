import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Whatsapps", "cloudApiToken", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "cloudApiNumberId", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "cloudApiBusinessId", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "cloudApiToken");
    await queryInterface.removeColumn("Whatsapps", "cloudApiNumberId");
    await queryInterface.removeColumn("Whatsapps", "cloudApiBusinessId");
  }
};
