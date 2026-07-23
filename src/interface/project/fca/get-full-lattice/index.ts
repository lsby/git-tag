import {
  JSON参数解析插件,
  常用接口返回器,
  接口,
  接口逻辑,
  计算接口逻辑JSON参数,
  计算接口逻辑正确结果,
  计算接口逻辑错误结果,
} from '@lsby/net-core'
import { Right } from '@lsby/ts-fp-data'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'
import type { FcaLatticeData, FcaLatticeEdge, FcaLatticeNode } from './types'

let 接口路径 = '/api/project/fca/get-full-lattice' as const
let 接口方法 = 'post' as const

let FcaLatticeNodeSchema: z.ZodType<FcaLatticeNode> = z.object({
  id: z.string(),
  intent: z.array(z.string()),
  extentCount: z.number(),
  label: z.string(),
})

let FcaLatticeEdgeSchema: z.ZodType<FcaLatticeEdge> = z.object({ from: z.string(), to: z.string() })

let FcaLatticeDataSchema: z.ZodType<FcaLatticeData> = z.object({
  nodes: z.array(FcaLatticeNodeSchema),
  edges: z.array(FcaLatticeEdgeSchema),
})

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造([new JSON参数解析插件(z.object({}), {}), kysely插件], async (参数, 逻辑附加参数, 请求附加参数) => {
      let _log = 请求附加参数.log.extend(接口路径)
      let db = 参数.kysely.获得句柄()
      let userId = 逻辑附加参数.userId

      // 1. 获取用户所有仓库及标签关系
      let 所有关系 = await db
        .selectFrom('git_repo_tag_relation as r')
        .innerJoin('git_tag as t', 'r.tag_id', 't.id')
        .innerJoin('git_repo as repo', 'r.repo_id', 'repo.id')
        .where('repo.user_id', '=', userId)
        .select(['r.repo_id', 't.name as tag_name'])
        .execute()

      // 构建仓库→标签集映射
      let 仓库标签映射 = new Map<string, Set<string>>()
      for (let 行 of 所有关系) {
        let 标签集 = 仓库标签映射.get(行.repo_id)
        if (标签集 === undefined) {
          标签集 = new Set<string>()
          仓库标签映射.set(行.repo_id, 标签集)
        }
        标签集.add(行.tag_name)
      }

      // 2. 计算所有形式概念
      // 形式概念 = (extent, intent)，其中 extent 是对象集（仓库），intent 是属性集（标签）
      // intent闭包: 给定标签集T, 找所有包含T的仓库, 然后取这些仓库标签的交集
      let 所有标签 = new Set<string>()
      for (let 标签集 of 仓库标签映射.values()) {
        for (let 标签 of 标签集) {
          所有标签.add(标签)
        }
      }

      // 计算给定标签集的闭包
      function 计算闭包(标签集: Set<string>): { intent: Set<string>; extent: Set<string> } {
        // 先求 extent: 所有包含给定标签集的仓库
        let extent = new Set<string>()
        for (let [仓库id, 仓库标签] of 仓库标签映射.entries()) {
          let 全部包含 = true
          for (let 标签 of 标签集) {
            if (!仓库标签.has(标签)) {
              全部包含 = false
              break
            }
          }
          if (全部包含) {
            extent.add(仓库id)
          }
        }
        // 再求 intent: extent 中所有仓库标签的交集
        let intent: Set<string> | null = null
        for (let 仓库id of extent) {
          let 仓库标签 = 仓库标签映射.get(仓库id)
          if (仓库标签 === undefined) continue
          if (intent === null) {
            intent = new Set(仓库标签)
          } else {
            for (let 标签 of intent) {
              if (!仓库标签.has(标签)) {
                intent.delete(标签)
              }
            }
          }
        }
        return { intent: intent ?? new Set<string>(), extent }
      }

      // 通过枚举所有可能的标签子集来找形式概念（使用闭包算子去重）
      // 优化：从空集开始，逐步添加单个标签计算闭包
      let 概念映射 = new Map<string, { intent: string[]; extentCount: number }>()

      // 空集的闭包 = 顶节点
      let 顶节点闭包 = 计算闭包(new Set<string>())
      let 顶节点intent = Array.from(顶节点闭包.intent).sort()
      let 顶节点key = 顶节点intent.join(',')
      概念映射.set(顶节点key, { intent: 顶节点intent, extentCount: 顶节点闭包.extent.size })

      // 使用 BFS 方式枚举: 从已发现的概念出发，每次加一个标签
      let 待处理队列: Set<string>[] = [顶节点闭包.intent]
      let 已处理 = new Set<string>()
      已处理.add(顶节点key)

      while (待处理队列.length > 0) {
        let 当前intent = 待处理队列.shift()
        if (当前intent === undefined) continue

        for (let 新标签 of 所有标签) {
          if (当前intent.has(新标签)) continue

          let 新标签集 = new Set(当前intent)
          新标签集.add(新标签)
          let 闭包结果 = 计算闭包(新标签集)

          if (闭包结果.extent.size === 0) continue

          let intent排序 = Array.from(闭包结果.intent).sort()
          let key = intent排序.join(',')
          if (!已处理.has(key)) {
            已处理.add(key)
            概念映射.set(key, { intent: intent排序, extentCount: 闭包结果.extent.size })
            待处理队列.push(闭包结果.intent)
          }
        }
      }

      // 3. 构造节点列表
      let 概念列表 = Array.from(概念映射.entries())
      let nodes: FcaLatticeNode[] = 概念列表.map(([key, 值]) => {
        let label: string
        if (值.intent.length === 0) {
          label = '全部'
        } else {
          label = 值.intent.join(', ')
        }
        return { id: key === '' ? '__TOP__' : key, intent: 值.intent, extentCount: 值.extentCount, label }
      })

      // 4. 计算 Hasse 图的覆盖关系
      // 概念 A 覆盖 概念 B 当且仅当: A.intent ⊂ B.intent 且不存在 C 使得 A.intent ⊂ C.intent ⊂ B.intent
      let edges: FcaLatticeEdge[] = []

      // 按 intent 大小排序
      let 按intent大小排序 = [...概念列表].sort((a, b) => a[1].intent.length - b[1].intent.length)

      for (let i = 0; i < 按intent大小排序.length; i++) {
        let 子项 = 按intent大小排序[i]
        if (子项 === undefined) continue
        let [子key, 子值] = 子项

        // 找该节点的直接父节点（intent 更小且是子集）
        let 直接父节点列表: string[] = []

        for (let j = i - 1; j >= 0; j--) {
          let 父项 = 按intent大小排序[j]
          if (父项 === undefined) continue
          let [父key, 父值] = 父项

          // 检查父值.intent 是否是子值.intent 的真子集
          if (父值.intent.length >= 子值.intent.length) continue

          let 是子集 = true
          for (let 标签 of 父值.intent) {
            if (!子值.intent.includes(标签)) {
              是子集 = false
              break
            }
          }
          if (!是子集) continue

          // 检查是否存在中间节点（是否已被其他直接父节点覆盖）
          let 被覆盖 = false
          for (let 已有父key of 直接父节点列表) {
            let 已有父 = 概念映射.get(已有父key)
            if (已有父 === undefined) continue
            // 如果已有父节点的 intent 是当前候选父节点的超集，则候选被覆盖
            if (已有父.intent.length > 父值.intent.length) {
              let 全包含 = true
              for (let 标签 of 父值.intent) {
                if (!已有父.intent.includes(标签)) {
                  全包含 = false
                  break
                }
              }
              if (全包含) {
                被覆盖 = true
                break
              }
            }
          }

          if (!被覆盖) {
            // 移除被当前候选覆盖的已有父节点
            直接父节点列表 = 直接父节点列表.filter((已有父key) => {
              let 已有父 = 概念映射.get(已有父key)
              if (已有父 === undefined) return true
              if (已有父.intent.length < 父值.intent.length) {
                let 全包含 = true
                for (let 标签 of 已有父.intent) {
                  if (!父值.intent.includes(标签)) {
                    全包含 = false
                    break
                  }
                }
                if (全包含) return false
              }
              return true
            })
            直接父节点列表.push(父key)
          }
        }

        for (let 父key of 直接父节点列表) {
          edges.push({ from: 父key === '' ? '__TOP__' : 父key, to: 子key === '' ? '__TOP__' : 子key })
        }
      }

      let 结果: FcaLatticeData = { nodes, edges }
      return new Right(结果)
    }),
  )

type _接口逻辑JSON参数 = 计算接口逻辑JSON参数<typeof 接口逻辑实现>
type _接口逻辑错误返回 = 计算接口逻辑错误结果<typeof 接口逻辑实现>
type _接口逻辑正确返回 = 计算接口逻辑正确结果<typeof 接口逻辑实现>

let 接口错误类型描述 = z.enum(['未登录', '用户不存在'])

export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, FcaLatticeDataSchema))
