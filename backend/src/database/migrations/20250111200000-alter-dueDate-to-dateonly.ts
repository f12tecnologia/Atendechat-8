
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn("Companies", "dueDate", {
      type: DataTypes.DATEONLY,
      allowNull: true
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn("Companies", "dueDate", {
      type: DataTypes.DATE,
      allowNull: true
    });
  }
};
