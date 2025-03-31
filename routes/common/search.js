const express = require('express')
const router = express.Router()
const { success, failure } = require('../../utils/responses')
const { BadRequest } = require('http-errors')
const { usersIndex, articlesIndex } = require('../../utils/meilisearch')
const { User, Article } = require('../../models')

/**
 * 重建 meilisearch 索引
 * GET /common/settings/meilisearch_reindex
 */
router.get('/meilisearch_reindex', async function (req, res) {
  try {
    // 获取用户数据
    const users = await User.findAll({
      attributes: ['id', 'email', 'username', 'nickname', 'avatar', 'updatedAt']
    })
    // 转换为 JSON
    const userDocs = users.map((user) => user.toJSON())
    // 清空旧索引并重新添加到搜索引擎
    await usersIndex.deleteAllDocuments()
    await usersIndex.addDocuments(userDocs)

    // 获取文章数据
    const articles = await Article.findAll({
      attributes: ['id', 'title', 'content', 'updatedAt']
    })
    // 转换为 JSON
    const articleDocs = articles.map((article) => article.toJSON())
    // 清空旧索引并重新添加到搜索引擎
    await articlesIndex.deleteAllDocuments()
    await articlesIndex.addDocuments(articleDocs)

    success(res, '重建索引成功。')
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 搜索
 * GET /common/search?q=关键字&type=users
 * GET /common/search?q=关键字&type=articles
 */
router.get('/', async function (req, res) {
  try {
    const query = req.query
    const currentPage = Math.abs(Number(query.currentPage)) || 1
    const pageSize = Math.abs(Number(query.pageSize)) || 10
    const offset = (currentPage - 1) * pageSize
    const { q, type } = query

    const option = {
      // 关键词高亮
      attributesToHighlight: ['*'],
      offset: offset,
      limit: pageSize
    }

    // 搜索类型
    let results
    switch (type) {
      case 'users':
        results = await usersIndex.search(q, option)
        break
      case 'articles':
        results = await articlesIndex.search(q, option)
        break
      default:
        throw new BadRequest('搜索类型错误。')
    }

    // 搜索到的结果
    const data = {}
    data[type] = results.hits

    success(res, '搜索成功。', {
      ...data,
      pagination: {
        total: results.estimatedTotalHits,
        currentPage,
        pageSize
      }
    })
  } catch (error) {
    failure(res, error)
  }
})

module.exports = router
