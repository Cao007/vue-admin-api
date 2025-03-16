'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Tree extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // 子节点关联
      Tree.hasMany(models.Tree, {
        foreignKey: 'parentId',
        as: 'children',
        onDelete: 'CASCADE', // 删除父节点时，子节点也会被删除
        onUpdate: 'CASCADE' // 更新父节点时，子节点也会更新
      })
      // 父节点关联
      Tree.belongsTo(models.Tree, {
        foreignKey: 'parentId',
        as: 'parent',
        onDelete: 'SET NULL', // 删除父节点时，子节点的 parentId 会被设为 NULL
        onUpdate: 'CASCADE' // 更新父节点时，子节点的 parentId 会同步更新
      })
    }
  }
  Tree.init(
    {
      parentId: {
        type: DataTypes.INTEGER,
        allowNull: true, // 允许null作为顶级节点
        references: {
          model: Tree,
          key: 'id'
        }
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: '标题必须填写。' },
          notEmpty: { msg: '标题不能为空。' },
          len: { args: [1, 50], msg: '标题长度在1到50之间。' }
        }
      },
      rank: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: '排序必须填写。' },
          notEmpty: { msg: '排序不能为空。' },
          isInt: { msg: '排序必须为整数。' },
          min: { args: [0], msg: '排序必须大于等于0。' }
        }
      },
      content: DataTypes.TEXT
    },
    {
      sequelize,
      modelName: 'Tree'
    }
  )
  return Tree
}
