import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    try {
      // Remover constraint UNIQUE único do campo 'number'
      const indexes = await queryInterface.showIndex('Contacts');
      const uniqueNumberIndex = (indexes as any[]).find(idx => idx.name === 'Contacts_number_key');
      
      if (uniqueNumberIndex) {
        await queryInterface.removeIndex('Contacts', 'Contacts_number_key');
      }
    } catch (err) {
      // Index não existe, continuar
    }

    // Adicionar constraint UNIQUE composto (number, companyId)
    await queryInterface.addConstraint('Contacts', {
      fields: ['number', 'companyId'],
      type: 'unique',
      name: 'Contacts_number_companyId_unique'
    } as any);
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      // Remover constraint composta
      await queryInterface.removeConstraint('Contacts', 'Contacts_number_companyId_unique');
    } catch (err) {
      // Constraint não existe
    }
  }
};
