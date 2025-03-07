const express = require('express')
const router = express.Router()
const { User } = require('../../models')
const { success, failure } = require('../../utils/responses')
const { BadRequest, NotFound } = require('http-errors')
const bcrypt = require('bcryptjs')
const { setKey, getKey, delKey } = require('../../utils/redis')
const { mailProducer } = require('../../utils/rabbit-mq')

/**
 * 查询当前登录用户详情
 * GET /front/users/me
 */
router.get('/me', async function (req, res) {
  try {
    // 1.定义带有 id 的 cacheKey 作为缓存的键
    const cacheKey = `user:${req.userId}`
    let user = await getKey(cacheKey)
    if (user) {
      return success(res, '查询当前用户信息成功。', { user })
    }

    // 2.如果缓存中没有，则从数据库中查询
    user = await getUser(req)
    if (!user) {
      throw new NotFound(`ID: ${req.userId}的用户未找到。`)
    }

    // 3.将查询结果存入缓存
    await setKey(cacheKey, user)

    success(res, '查询当前用户信息成功。', { user })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 更新用户信息
 * PUT /front/users/info
 */
router.put('/info', async function (req, res) {
  try {
    const body = {
      nickname: req.body.nickname,
      gender: req.body.gender,
      company: req.body.company,
      introduce: req.body.introduce,
      avatar: req.body.avatar
    }

    const user = await getUser(req)
    await user.update(body)

    await clearCache(user)

    success(res, '更新用户信息成功。', { user })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 更新账户信息
 * PUT /front/users/account
 */
router.put('/account', async function (req, res) {
  try {
    const body = {
      email: req.body.email,
      username: req.body.username,
      currentPassword: req.body.currentPassword,
      password: req.body.password,
      passwordConfirmation: req.body.passwordConfirmation
    }

    if (!body.currentPassword) {
      throw new BadRequest('当前密码必须填写。')
    }

    if (body.password !== body.passwordConfirmation) {
      throw new BadRequest('两次输入的密码不一致。')
    }

    // 加上 true 参数，可以查询到加密后的密码
    const user = await getUser(req, true)

    // 验证当前密码是否正确
    const isPasswordValid = bcrypt.compareSync(body.currentPassword, user.password)
    if (!isPasswordValid) {
      throw new BadRequest('当前密码不正确。')
    }

    await user.update(body)

    // 删除密码字段
    delete user.dataValues.password

    await clearCache(user)

    // 发送邮件
    const msg = {
      to: user.email,
      subject: 'vue-admin更新账户信息成功通知',
      html: `
        您好，<span style="color: red">${user.nickname}</span>。<br><br>
        恭喜，您已成功更新账户信息！<br><br>
        ${user}
      `
    }
    await mailProducer(msg)

    success(res, '更新账户信息成功。', { user })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 公共方法：清除缓存
 * @param user
 */
async function clearCache(user) {
  await delKey(`user:${user.id}`)
}

/**
 * 公共方法：查询当前用户
 * @param req
 * @param showPassword
 * @returns {Promise<Model<any, TModelAttributes>>}
 */
async function getUser(req, showPassword = false) {
  const id = req.userId

  let condition = {}
  if (!showPassword) {
    condition = {
      attributes: { exclude: ['password'] }
    }
  }

  const user = await User.findByPk(id, condition)
  if (!user) {
    throw new NotFound(`ID: ${id}的用户未找到。`)
  }

  return user
}

module.exports = router
