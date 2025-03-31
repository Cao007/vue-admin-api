'use strict'
const { Model } = require('sequelize')
const bcrypt = require('bcryptjs')
const { BadRequest } = require('http-errors')
const { usersIndex } = require('../utils/meilisearch')
const { delKey } = require('../utils/redis')

/**
 * 公共方法：清除缓存
 * @param user
 */
async function clearCache(id = null) {
  try {
    await delKey(`user:${id}`)
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      models.User.hasMany(models.Attachment, { as: 'attachments' })
    }
  }
  User.init(
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: '邮箱必须填写。' },
          notEmpty: { msg: '邮箱不能为空。' },
          isEmail: { msg: '邮箱格式不正确。' },
          async isUnique(value) {
            const user = await User.findOne({ where: { email: value } })
            if (user) {
              throw new Error('邮箱已存在，请直接登录。')
            }
          }
        }
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: '用户名必须填写。' },
          notEmpty: { msg: '用户名不能为空。' },
          len: { args: [2, 45], msg: '用户名长度必须是2 ~ 45之间。' },
          async isUnique(value) {
            const user = await User.findOne({ where: { username: value } })
            if (user) {
              throw new Error('用户名已经存在。')
            }
          }
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
          // 检查是否为空
          if (!value) {
            throw new BadRequest('密码必须填写。')
          }

          // 检查长度
          if (value.length < 6 || value.length > 45) {
            throw new BadRequest('密码长度必须是6 ~ 45之间。')
          }

          // 如果通过所有验证，进行hash处理并设置值
          this.setDataValue('password', bcrypt.hashSync(value, 10))
        }
      },
      nickname: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: '昵称必须填写。' },
          notEmpty: { msg: '昵称不能为空。' },
          len: { args: [2, 45], msg: '昵称长度必须是2 ~ 45之间。' }
        }
      },
      gender: {
        type: DataTypes.TINYINT,
        defaultValue: 2,
        validate: {
          notEmpty: { msg: '性别不能为空。' },
          isIn: { args: [[0, 1, 2]], msg: '性别的值必须是，男性：0 女性：1 未选择：2。' }
        }
      },
      company: DataTypes.STRING,
      introduce: DataTypes.TEXT,
      role: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        validate: {
          notEmpty: { msg: '用户组不能为空。' },
          isIn: { args: [[0, 100]], msg: '用户组的值必须是，普通用户：0 管理员：100。' }
        }
      },
      avatar: {
        type: DataTypes.STRING,
        validate: {
          isUrl: { msg: '图片地址不正确。' }
        }
      }
    },
    {
      hooks: {
        // 创建之后
        afterCreate: async (user) => {
          try {
            // 添加到搜索引擎
            await usersIndex.addDocuments([
              {
                id: user.id,
                email: user.email,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar
              }
            ])
          } catch (error) {
            console.error('Meilisearch Error:', error)
          }
          // 清除redis缓存
          await clearCache(user.id)
        },
        // 更新之后
        afterUpdate: async (user) => {
          try {
            await usersIndex.updateDocuments([
              {
                id: user.id,
                email: user.email,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar
              }
            ])
          } catch (error) {
            console.error('Meilisearch Error:', error)
          }
          await clearCache(user.id)
        },
        // 删除之后
        afterDestroy: async (user) => {
          try {
            await usersIndex.deleteDocuments([user.id])
          } catch (error) {
            console.error('Meilisearch Error:', error)
          }
          await clearCache(user.id)
        }
      },
      sequelize,
      modelName: 'User'
    }
  )
  return User
}
