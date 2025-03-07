const express = require('express')
const router = express.Router()
const { User } = require('../../models')
const { success, failure } = require('../../utils/responses')
const { NotFound, BadRequest, Unauthorized } = require('http-errors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')
const validateCaptcha = require('../../middlewares/validate-captcha')
const { delKey } = require('../../utils/redis')
const { mailProducer } = require('../../utils/rabbit-mq')

/**
 * 用户注册
 * POST /front/auth/sign_up
 */
router.post('/sign_up', validateCaptcha, async function (req, res) {
  try {
    const body = filterBody(req)

    const user = await User.create(body)

    // 删除密码字段
    delete user.dataValues.password

    // 注册成功，删除redis缓存的验证码，防止在有效期内重复使用
    await delKey(req.body.captchaKey)

    // 发送邮件
    // 将邮件发送请求放入队列
    const msg = {
      to: user.email,
      subject: 'vue-admin注册成功通知',
      html: `
        您好，<span style="color: red">${user.nickname}</span>。<br><br>
        恭喜，您已成功注册会员！
      `
    }
    await mailProducer(msg)

    success(res, '创建用户成功。', { user }, 201)
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 用户登录
 * POST /front/auth/sign_in
 */
router.post('/sign_in', async (req, res) => {
  try {
    const { login, password } = req.body

    if (!login) {
      throw new BadRequest('邮箱/用户名必须填写。')
    }

    if (!password) {
      throw new BadRequest('密码必须填写。')
    }

    const condition = {
      where: {
        [Op.or]: [{ email: login }, { username: login }]
      }
    }

    // 通过email或username，查询用户是否存在
    const user = await User.findOne(condition)
    if (!user) {
      throw new NotFound('用户不存在，无法登录。')
    }

    // 验证密码
    const isPasswordValid = bcrypt.compareSync(password, user.password)
    if (!isPasswordValid) {
      throw new Unauthorized('密码错误。')
    }

    // 生成身份验证令牌
    const token = jwt.sign(
      {
        userId: user.id
      },
      process.env.SECRET,
      { expiresIn: '30d' }
    )
    success(res, '登录成功。', { token })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 公共方法：白名单过滤
 * @param req
 * @return {{email: *, username: *, password: *, nickname: *, gender: *, company: *, introduce: *, role: *, avatar: *}}
 */
function filterBody(req) {
  return {
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    nickname: req.body.nickname,
    gender: req.body.gender,
    company: req.body.company,
    introduce: req.body.introduce,
    role: req.body.role,
    avatar: req.body.avatar
  }
}

module.exports = router
