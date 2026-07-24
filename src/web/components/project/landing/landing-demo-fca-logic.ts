import type { FcaTreeNodeData } from '../../../../interface/project/fca/get-children/types'
import type {
  FcaLatticeData,
  FcaLatticeEdge,
  FcaLatticeNode,
} from '../../../../interface/project/fca/get-full-lattice/types'
import type { 仓库 } from './landing-demo-data'

export function 计算演示概念格(当前仓库: 仓库[]): FcaLatticeData {
  let 仓库标签映射 = new Map<string, Set<string>>()
  for (let r of 当前仓库) {
    仓库标签映射.set(r.id, new Set(r.tags))
  }

  let 所有存在标签 = new Set<string>()
  for (let tags of 仓库标签映射.values()) {
    for (let tag of tags) 所有存在标签.add(tag)
  }

  function 计算闭包(标签集: Set<string>): { intent: Set<string>; extent: Set<string> } {
    let extent = new Set<string>()
    for (let [repoId, repoTags] of 仓库标签映射.entries()) {
      let 全包含 = true
      for (let tag of 标签集) {
        if (repoTags.has(tag) === false) {
          全包含 = false
          break
        }
      }
      if (全包含 === true) extent.add(repoId)
    }

    let intent: Set<string> | null = null
    for (let repoId of extent) {
      let repoTags = 仓库标签映射.get(repoId)
      if (repoTags === undefined) continue
      if (intent === null) intent = new Set(repoTags)
      else {
        for (let t of intent) {
          if (repoTags.has(t) === false) intent.delete(t)
        }
      }
    }
    return { intent: intent ?? new Set<string>(), extent }
  }

  let 概念映射 = new Map<string, { intent: string[]; extent: Set<string>; extentCount: number }>()

  let 顶节点闭包 = 计算闭包(new Set())
  let 顶节点intent = Array.from(顶节点闭包.intent).sort()
  概念映射.set(顶节点intent.join(','), {
    intent: 顶节点intent,
    extent: 顶节点闭包.extent,
    extentCount: 顶节点闭包.extent.size,
  })

  let 待处理 = [顶节点闭包.intent]
  let 已处理 = new Set([顶节点intent.join(',')])

  while (待处理.length > 0) {
    let 当前 = 待处理.shift()
    if (当前 === undefined) continue
    for (let 新标签 of 所有存在标签) {
      if (当前.has(新标签) === true) continue
      let 新集 = new Set(当前)
      新集.add(新标签)
      let 闭包 = 计算闭包(新集)
      if (闭包.extent.size === 0) continue

      let intent排 = Array.from(闭包.intent).sort()
      let key = intent排.join(',')
      if (已处理.has(key) === false) {
        已处理.add(key)
        概念映射.set(key, { intent: intent排, extent: 闭包.extent, extentCount: 闭包.extent.size })
        待处理.push(闭包.intent)
      }
    }
  }

  let 仓库名称映射 = new Map<string, string>()
  for (let r of 当前仓库) {
    仓库名称映射.set(r.id, r.name)
  }

  let nodes: FcaLatticeNode[] = Array.from(概念映射.entries()).map(([key, val]) => {
    let 仓库名字列表 = Array.from(val.extent)
      .map((id) => 仓库名称映射.get(id) ?? '')
      .filter((name) => name !== '')
    return {
      id: key === '' ? '__TOP__' : key,
      intent: val.intent,
      extentCount: val.extentCount,
      label: val.intent.length === 0 ? '全部' : val.intent.join(' & '),
      repos: 仓库名字列表,
    }
  })

  let edges: FcaLatticeEdge[] = []
  let 按大小排 = Array.from(概念映射.entries()).sort((a, b) => a[1].intent.length - b[1].intent.length)

  for (let i = 0; i < 按大小排.length; i++) {
    let 子项 = 按大小排[i]
    if (子项 === undefined) continue
    let 直接父节点列表: string[] = []

    for (let j = i - 1; j >= 0; j--) {
      let 父项 = 按大小排[j]
      if (父项 === undefined) continue
      if (父项[1].intent.length >= 子项[1].intent.length) continue

      let 是子集 = 父项[1].intent.every((t) => 子项[1].intent.includes(t))
      if (是子集 === false) continue

      let 被覆盖 = false
      for (let 已有父key of 直接父节点列表) {
        let 已有父 = 概念映射.get(已有父key)
        if (已有父 === undefined) continue
        if (已有父.intent.length > 父项[1].intent.length) {
          if (父项[1].intent.every((t) => 已有父.intent.includes(t)) === true) {
            被覆盖 = true
            break
          }
        }
      }

      if (被覆盖 === false) {
        直接父节点列表 = 直接父节点列表.filter((已有父key) => {
          let 已有父 = 概念映射.get(已有父key)
          if (已有父 === undefined) return true
          if (已有父.intent.length < 父项[1].intent.length) {
            if (已有父.intent.every((t) => 父项[1].intent.includes(t)) === true) return false
          }
          return true
        })
        直接父节点列表.push(父项[0])
      }
    }

    for (let 父key of 直接父节点列表) {
      edges.push({ from: 父key === '' ? '__TOP__' : 父key, to: 子项[0] === '' ? '__TOP__' : 子项[0] })
    }
  }

  return { nodes, edges }
}

export async function 获取演示树子节点(parentId: string, 当前仓库: 仓库[]): Promise<FcaTreeNodeData[]> {
  let parentIntent = parentId === '' ? [] : parentId.split(',')
  let parentIntentSet = new Set(parentIntent)

  let 匹配仓库 = 当前仓库.filter((repo) => {
    for (let tag of parentIntentSet) {
      if (repo.tags.includes(tag) === false) return false
    }
    return true
  })

  if (匹配仓库.length === 0) return []

  let 候选标签池 = new Set<string>()
  for (let repo of 匹配仓库) {
    for (let tag of repo.tags) {
      if (parentIntentSet.has(tag) === false) 候选标签池.add(tag)
    }
  }

  let 子概念Map = new Map<string, string[]>()
  for (let candidate of 候选标签池) {
    let 拥有该标签的仓库 = 匹配仓库.filter((r) => r.tags.includes(candidate))
    if (拥有该标签的仓库.length === 0) continue

    let 仓库第零项 = 拥有该标签的仓库[0]
    let 公共标签 = new Set(仓库第零项 !== undefined ? 仓库第零项.tags : [])
    for (let i = 1; i < 拥有该标签的仓库.length; i++) {
      let 仓库单项 = 拥有该标签的仓库[i]
      if (仓库单项 === undefined) continue
      let tags = new Set(仓库单项.tags)
      for (let tag of 公共标签) {
        if (tags.has(tag) === false) 公共标签.delete(tag)
      }
    }

    let intentArr = Array.from(公共标签).sort()
    let intentKey = intentArr.join(',')
    if (子概念Map.has(intentKey) === false) {
      let isMinimal = true
      for (let [existKey, existArr] of 子概念Map.entries()) {
        if (existArr.length > intentArr.length && intentArr.every((t) => existArr.includes(t)) === true) {
          子概念Map.delete(existKey)
        } else if (intentArr.length > existArr.length && existArr.every((t) => intentArr.includes(t)) === true) {
          isMinimal = false
          break
        }
      }
      if (isMinimal === true) 子概念Map.set(intentKey, intentArr)
    }
  }

  let result: FcaTreeNodeData[] = []
  for (let [intentKey, intentArr] of 子概念Map.entries()) {
    let 节点新增标签 = intentArr.filter((t) => parentIntentSet.has(t) === false)
    let 匹配该子节点的仓库数量 = 匹配仓库.filter((r) => intentArr.every((t) => r.tags.includes(t)) === true).length

    let 子节点匹配仓库 = 匹配仓库.filter((r) => intentArr.every((t) => r.tags.includes(t)) === true)
    let 子节点候选标签 = new Set<string>()
    for (let r of 子节点匹配仓库) {
      for (let t of r.tags) {
        if (intentArr.includes(t) === false) 子节点候选标签.add(t)
      }
    }

    result.push({
      id: intentKey,
      name: 节点新增标签.join(' & '),
      objectCount: 匹配该子节点的仓库数量,
      hasChildren: 子节点候选标签.size > 0,
      children: [],
    })
  }

  return result
}
