const { MeiliSearch } = require('meilisearch')

const searchClient = new MeiliSearch({
  host: 'http://127.0.0.1:7700',
  apiKey: 'Pqq-IQRvyGgk4TT60glCapPIAUOD6SraSC86PUU_Djk'
})

/**
 * 用户索引
 */
const usersIndex = searchClient.index('users')
;(async () => {
  // 用于搜索的字段
  await usersIndex.updateSearchableAttributes(['email', 'username', 'nickname'])

  // 自定义排序规则
  await usersIndex.updateSortableAttributes(['updatedAt'])

  // 排序权重顺序
  await usersIndex.updateRankingRules([
    'sort',
    'words',
    'typo',
    'proximity',
    'attribute',
    'exactness'
  ])
})()

/**
 * 文章索引
 */
const articlesIndex = searchClient.index('articles')
;(async () => {
  // 用于搜索的字段
  await articlesIndex.updateSearchableAttributes(['title', 'content'])

  // 自定义排序规则
  await articlesIndex.updateSortableAttributes(['updatedAt'])

  // 排序权重顺序
  await articlesIndex.updateRankingRules([
    'sort',
    'words',
    'typo',
    'proximity',
    'attribute',
    'exactness'
  ])
})()

module.exports = { searchClient, usersIndex, articlesIndex }
