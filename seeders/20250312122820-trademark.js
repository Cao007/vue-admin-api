'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const arr = []
    const counts = 100

    for (let i = 1; i <= counts; i++) {
      const article = {
        tmName: '品牌' + i,
        logoUrl: 'https://picsum.photos/200/200?random=' + i,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      arr.push(article)
    }

    await queryInterface.bulkInsert('Trademarks', arr, {})
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Trademarks', null, {})
  }
}
