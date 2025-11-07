import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("ApiIntegrations", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      baseUrl: {
        type: DataTypes.STRING,
        allowNull: false
      },
      apiKey: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      instanceName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      webhookUrl: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      config: {
        type: DataTypes.JSON,
        allowNull: true
      },
      credentials: {
        type: DataTypes.JSON,
        allowNull: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("ApiIntegrations");
  }
};
