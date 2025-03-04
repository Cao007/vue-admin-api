const express = require('express')
const router = express.Router()
const { Article } = require('../../models')
const { success, failure } = require('../../utils/responses')
const { NotFound } = require('http-errors')
const { setKey, getKey } = require('../../utils/redis')

/**
 * 查询文章列表
 * GET /front/articles
 */
router.get('/', async function (req, res) {
  try {
    const query = req.query
    const currentPage = Math.abs(Number(query.currentPage)) || 1
    const pageSize = Math.abs(Number(query.pageSize)) || 10
    const offset = (currentPage - 1) * pageSize

    // 1.定义带有「当前页码」和「每页条数」的 cacheKey 作为缓存的键
    const cacheKey = `articles:${currentPage}:${pageSize}`
    let data = await getKey(cacheKey)
    if (data) {
      return success(res, '查询文章列表成功。', data)
    }

    const condition = {
      attributes: { exclude: ['content'] },
      order: [['id', 'DESC']],
      limit: pageSize,
      offset: offset
    }

    // 2.如果缓存中没有，则从数据库中查询
    const { count, rows } = await Article.findAndCountAll(condition)
    data = {
      articles: rows,
      pagination: {
        total: count,
        currentPage,
        pageSize
      }
    }

    // 3.将查询到的数据缓存到 Redis 中
    await setKey(cacheKey, data)

    success(res, '查询文章列表成功。', data)
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 查询文章详情
 * GET /front/articles/:id
 */
router.get('/:id', async function (req, res) {
  try {
    const { id } = req.params

    // 1.定义带有 id 的 cacheKey 作为缓存的键
    const cacheKey = `article:${id}`
    let article = await getKey(cacheKey)
    if (article) {
      return success(res, '查询文章详情成功。', { article })
    }

    // 2.如果缓存中没有，则从数据库中查询
    article = await Article.findByPk(id)
    if (!article) {
      throw new NotFound(`ID: ${id}的文章未找到。`)
    }

    // 3.将查询到的数据缓存到 Redis 中
    await setKey(cacheKey, article)

    success(res, '查询文章成功。', { article })
  } catch (error) {
    failure(res, error)
  }
})

module.exports = router
