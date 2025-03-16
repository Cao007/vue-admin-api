'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Trees', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      parentId: {
        allowNull: true, // 允许null
        defaultValue: null, // 默认值为null，表示顶级节点
        type: Sequelize.INTEGER,
        references: {
          model: 'Trees', // 关联自身表
          key: 'id'
        },
        onUpdate: 'CASCADE', // 如果父级 ID 更新，子级也更新
        onDelete: 'SET NULL' // 如果父级被删除，子级的 parentId 设为 NULL
      },
      title: {
        allowNull: false,
        type: Sequelize.STRING
      },
      rank: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.INTEGER
      },
      content: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Trees')
  }
}
