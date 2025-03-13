'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Trademark extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Trademark.init(
    {
      tmName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: '品牌名称必须填写。' },
          notEmpty: { msg: '品牌名称不能为空。' },
          async isUnique(value) {
            const trademark = await Trademark.findOne({ where: { tmName: value } })
            if (trademark) {
              throw new Error('品牌名称已存在，请重新填写。')
            }
          }
        }
      },
      logoUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: '品牌logo必须填写。' },
          notEmpty: { msg: '品牌logo不能为空。' },
          isUrl: { msg: '品牌logo地址不正确。' }
        }
      }
    },
    {
      sequelize,
      modelName: 'Trademark'
    }
  )
  return Trademark
}
