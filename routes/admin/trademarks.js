const express = require('express')
const router = express.Router()
const { Trademark } = require('../../models')
const { Op } = require('sequelize')
const { NotFound } = require('http-errors')
const { success, failure } = require('../../utils/responses')

/**
 * 查询品牌列表
 * GET /admin/trademarks
 */
router.get('/', async function (req, res) {
  try {
    const query = req.query
    const currentPage = Math.abs(Number(query.currentPage)) || 1
    const pageSize = Math.abs(Number(query.pageSize)) || 10
    const offset = (currentPage - 1) * pageSize

    const condition = {
      where: {},
      order: [['id', 'DESC']],
      limit: pageSize,
      offset: offset
    }

    if (query.tmName) {
      condition.where.tmName = {
        [Op.like]: `%${query.tmName}%`
      }
    }

    const { count, rows } = await Trademark.findAndCountAll(condition)
    success(res, '查询品牌列表成功。', {
      trademarks: rows,
      pagination: {
        total: count,
        currentPage,
        pageSize
      }
    })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 查询品牌详情
 * GET /admin/trademarks/:id
 */
router.get('/:id', async function (req, res) {
  try {
    const trademark = await getTrademark(req)
    success(res, '查询品牌成功。', { trademark })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 创建品牌
 * POST /admin/trademarks
 */
router.post('/', async function (req, res) {
  try {
    const body = filterBody(req)

    const trademark = await Trademark.create(body)

    success(res, '创建品牌成功。', { trademark }, 201)
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 更新品牌
 * PUT /admin/trademarks/:id
 */
router.put('/:id', async function (req, res) {
  try {
    const trademark = await getTrademark(req)
    const body = filterBody(req)

    await trademark.update(body)

    success(res, '更新品牌成功。', { trademark })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 删除品牌
 * DELETE /admin/trademarks/:id
 */
router.delete('/:id', async function (req, res) {
  try {
    const trademark = await getTrademark(req)

    await trademark.destroy()

    success(res, '删除品牌成功。')
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 公共方法：查询当前品牌
 */
async function getTrademark(req) {
  const { id } = req.params

  const trademark = await Trademark.findByPk(id)
  if (!trademark) {
    throw new NotFound(`ID: ${id}的品牌未找到。`)
  }

  return trademark
}

/**
 * 公共方法：白名单过滤
 * @param req
 * @return {{tmName: *, logoUrl: *}}
 */
function filterBody(req) {
  return {
    tmName: req.body.tmName,
    logoUrl: req.body.logoUrl
  }
}

module.exports = router
