const express = require('express')
const router = express.Router()

// 路由中间件
const adminAuth = require('../middlewares/admin-auth')
const userAuth = require('../middlewares/user-auth')

// 前台路由文件
const articlesRouter = require('./front/articles')
const authRouter = require('./front/auth')
const usersRouter = require('./front/users')

// 后台路由文件
const adminArticlesRouter = require('./admin/articles')
const adminUsersRouter = require('./admin/users')
const adminChartsRouter = require('./admin/charts')
const adminAuthRouter = require('./admin/auth')
const adminLogsRouter = require('./admin/logs')
const adminAttachmentsRouter = require('./admin/attachments')
const adminTrademarksRouter = require('./admin/trademarks')
const adminSettingsRouter = require('./admin/settings')

// 公共路由文件
const uploadsRouter = require('./common/uploads')
const captchaRouter = require('./common/captcha')
const treesRouter = require('./common/trees')
const searchRouter = require('./common/search')

/**
 * 前台路由配置
 */
router.use('/front/articles', articlesRouter)
router.use('/front/auth', authRouter)
router.use('/front/users', userAuth, usersRouter)

/**
 * 后台路由配置
 */
router.use('/admin/articles', adminAuth, adminArticlesRouter)
router.use('/admin/users', adminAuth, adminUsersRouter)
router.use('/admin/charts', adminAuth, adminChartsRouter)
router.use('/admin/auth', adminAuthRouter)
router.use('/admin/logs', adminAuth, adminLogsRouter)
router.use('/admin/attachments', adminAuth, adminAttachmentsRouter)
router.use('/admin/trademarks', adminAuth, adminTrademarksRouter)
router.use('/admin/settings', adminAuth, adminSettingsRouter)

/**
 * 公共路由配置
 */
router.use('/common/uploads', userAuth, uploadsRouter)
router.use('/common/captcha', captchaRouter)
router.use('/common/trees', treesRouter)
router.use('/common/search', searchRouter)

module.exports = router
