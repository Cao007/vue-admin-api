const express = require('express')
const router = express.Router()
const { Tree } = require('../../models')
const { NotFound } = require('http-errors')
const { success, failure } = require('../../utils/responses')

/**
 * 获取树形结构列表（所有根节点）或单个树节点
 * GET /common/trees
 * GET /common/trees/:id
 */
router.get('/:id?', async (req, res) => {
  try {
    let trees
    const allNodes = await Tree.findAll()

    if (req.params.id) {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) throw new Error(`ID ${req.params.id} 不是有效的数字`)

      trees = buildTree(allNodes, id)
      if (!trees) throw new NotFound(`ID: ${id} 的树节点未找到。`)
    } else {
      trees = buildForest(allNodes)
    }

    success(res, '查询树形数据成功。', { trees })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 获取节点的路径（从根节点到目标节点）
 * GET /common/trees/:id/path
 */
router.get('/:id/path', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new Error(`ID ${req.params.id} 不是有效的数字`)

    let node = await Tree.findByPk(id)
    if (!node) throw new NotFound(`ID: ${id} 的树节点未找到。`)

    const path = []
    while (node) {
      path.unshift(node)
      node = await Tree.findByPk(node.parentId)
    }

    success(res, `获取 ID: ${id} 的路径成功。`, { path })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 获取树节点的兄弟节点
 * GET /common/trees/:id/siblings
 */
router.get('/:id/siblings', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new Error(`ID ${req.params.id} 不是有效的数字`)

    const node = await Tree.findByPk(id, {
      include: [
        {
          model: Tree,
          as: 'parent'
        }
      ]
    })
    if (!node) throw new NotFound(`ID: ${id} 的树节点未找到。`)

    const siblings = await Tree.findAll({ where: { parentId: node.parentId } })
    siblings.filter((sibling) => sibling.id !== node.id)

    success(res, `获取 ID: ${id} 的兄弟节点成功。`, { siblings })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 创建树节点
 * POST /common/trees
 */
router.post('/', async (req, res) => {
  try {
    const { parentId, title, rank, content } = req.body
    const tree = await Tree.create({
      parentId: parentId ? parseInt(parentId, 10) || null : null,
      title,
      rank,
      content
    })
    success(res, '创建树节点成功。', { tree }, 201)
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 更新树节点
 * PUT /common/trees/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const tree = await Tree.findByPk(req.params.id)
    if (!tree) throw new NotFound(`ID: ${req.params.id} 的树节点未找到。`)

    const { title, rank, content } = req.body
    await tree.update({ title, rank, content })
    success(res, '更新树节点成功。', { tree })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 删除树节点
 * DELETE /common/trees/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new Error(`ID ${req.params.id} 不是有效的数字`)

    const allNodes = await Tree.findAll()
    const idsToDelete = collectSubtreeIds(allNodes, id)
    if (idsToDelete.length === 0) throw new NotFound(`ID: ${id} 的树节点未找到。`)

    await Tree.destroy({ where: { id: idsToDelete } })
    success(res, `删除 ID ${id} 及其所有子节点成功。`)
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 移动树节点
 * PUT /common/trees/:id/move
 */
router.put('/:id/move', async (req, res) => {
  try {
    const { targetParentId } = req.body
    const nodeId = parseInt(req.params.id, 10)
    if (isNaN(nodeId)) throw new Error(`ID ${req.params.id} 不是有效的数字`)

    const node = await Tree.findByPk(nodeId)
    if (!node) throw new NotFound(`ID: ${nodeId} 的树节点未找到。`)

    // 判断目标父节点是否存在
    const targetParentNode = await Tree.findByPk(targetParentId)
    if (targetParentId && !targetParentNode)
      throw new NotFound(`目标父节点 ID: ${targetParentId} 未找到。`)

    // 确保不会出现循环依赖（即子节点不能成为父节点）
    if (targetParentNode && targetParentNode.id === nodeId) {
      throw new Error(`节点不能移动到自身作为父节点。`)
    }

    // 更新节点的 parentId，将其移动到新的父节点
    await node.update({ parentId: targetParentId || null })

    // 如果节点被移动到新的父节点下，更新子节点的 parentId（递归操作）
    if (targetParentNode) {
      // 例如需要处理移动节点下的所有子节点
      const childNodes = await Tree.findAll({ where: { parentId: nodeId } })
      for (const childNode of childNodes) {
        await childNode.update({ parentId: nodeId }) // 更新子节点的 parentId
      }
    }

    success(res, `移动节点 ID: ${nodeId} 到父节点 ID: ${targetParentId} 成功。`, { node })
  } catch (error) {
    failure(res, error)
  }
})

/**
 * 递归构建树结构
 * @param {Array} nodes - 所有节点
 * @param {number} rootId - 根节点 ID
 * @returns {Object} - 该节点及其所有子节点
 */
function buildTree(nodes, rootId) {
  const nodeMap = new Map(nodes.map((node) => [node.id, { ...node.toJSON(), children: [] }]))
  let rootNode = nodeMap.get(rootId)

  if (!rootNode) return null

  nodes.forEach((node) => {
    if (node.parentId !== null && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId).children.push(nodeMap.get(node.id))
    }
  })

  return rootNode
}

/**
 * 构建所有根节点的森林
 * @param {Array} nodes - 所有节点
 * @returns {Array} - 所有根节点的完整树
 */
function buildForest(nodes) {
  const nodeMap = new Map(nodes.map((node) => [node.id, { ...node.toJSON(), children: [] }]))
  const roots = []

  nodes.forEach((node) => {
    if (node.parentId !== null && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId).children.push(nodeMap.get(node.id))
    } else if (node.parentId === null) {
      roots.push(nodeMap.get(node.id))
    }
  })

  return roots
}

/**
 * 递归收集子树的所有 ID（用于批量删除）
 * @param {Array} nodes - 所有节点
 * @param {number} rootId - 需要删除的根节点 ID
 * @returns {Array} - 需要删除的所有 ID
 */
function collectSubtreeIds(nodes, rootId) {
  const idSet = new Set()
  const queue = [rootId]

  while (queue.length > 0) {
    const currentId = queue.shift()
    idSet.add(currentId)

    nodes.forEach((node) => {
      if (node.parentId === currentId) {
        queue.push(node.id)
      }
    })
  }

  return [...idSet]
}

module.exports = router
