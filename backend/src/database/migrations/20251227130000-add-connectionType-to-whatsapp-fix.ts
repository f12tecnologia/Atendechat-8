import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable("Whatsapps") as Record<string, unknown>;
    if (!tableInfo.connectionType) {
      await queryInterface.addColumn("Whatsapps", "connectionType", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "evolution"
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable("Whatsapps") as Record<string, unknown>;
    if (tableInfo.connectionType) {
      await queryInterface.removeColumn("Whatsapps", "connectionType");
    }
  }
};
