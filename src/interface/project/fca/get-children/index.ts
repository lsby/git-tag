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
import type { FcaTreeNodeData } from './types'

let 接口路径 = '/api/project/fca/get-children' as const
let 接口方法 = 'post' as const

// 本地声明递归 Schema
export let FcaTreeNodeDataSchema: z.ZodType<FcaTreeNodeData> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string().optional(),
    children: z.array(FcaTreeNodeDataSchema),
    objectCount: z.number(),
    hasChildren: z.boolean().optional(),
  }),
)

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [new JSON参数解析插件(z.object({ parentId: z.string() }), {}), kysely插件],
      async (参数, 逻辑附加参数, 请求附加参数) => {
        let _log = 请求附加参数.log.extend(接口路径)
        let db = 参数.kysely.获得句柄()
        let userId = 逻辑附加参数.userId
        let parentId = 参数.json.parentId

        let selectedTags = parentId === '' ? [] : parentId.split(',')

        // 1. 获取用户所有仓库及标签关系
        let allRelations = await db
          .selectFrom('git_repo_tag_relation as r')
          .innerJoin('git_tag as t', 'r.tag_id', 't.id')
          .innerJoin('git_repo as repo', 'r.repo_id', 'repo.id')
          .where('repo.user_id', '=', userId)
          .select(['r.repo_id', 't.name as tag_name'])
          .execute()

        let repoTags = new Map<string, Set<string>>()
        for (let row of allRelations) {
          let tags = repoTags.get(row.repo_id)
          if (tags === undefined) {
            tags = new Set<string>()
            repoTags.set(row.repo_id, tags)
          }
          tags.add(row.tag_name)
        }

        // 2. 筛选出包含所有 selectedTags 的仓库 (targetRepos)
        let targetRepos: string[] = []
        for (let [repoId, tags] of repoTags.entries()) {
          let hasAll = true
          for (let st of selectedTags) {
            if (!tags.has(st)) {
              hasAll = false
              break
            }
          }
          if (hasAll) {
            targetRepos.push(repoId)
          }
        }

        if (targetRepos.length === 0) {
          return new Right({ data: [] })
        }

        // 3. 收集所有的 candidateTags (在 targetRepos 中出现过，且不在 selectedTags 中)
        let candidateTags = new Set<string>()
        for (let repoId of targetRepos) {
          let tags = repoTags.get(repoId)
          if (tags === undefined) continue
          for (let tag of tags) {
            if (!selectedTags.includes(tag)) {
              candidateTags.add(tag)
            }
          }
        }

        // 4. 计算每个 candidateTag 产生的 nextConcept (Intent)
        type Concept = { intent: string[]; intentSet: Set<string>; extentSize: number; maxTagsInAnyRepo: number }
        let nextConcepts = new Map<string, Concept>()

        for (let T of candidateTags) {
          let reposWithT: string[] = []
          for (let repoId of targetRepos) {
            let tags = repoTags.get(repoId)
            if (tags !== undefined && tags.has(T)) {
              reposWithT.push(repoId)
            }
          }

          let extentSize = reposWithT.length

          let firstRepoTags = repoTags.get(reposWithT[0] ?? '') ?? new Set<string>()
          let intersection = new Set(firstRepoTags)
          let maxTags = firstRepoTags.size
          for (let i = 1; i < reposWithT.length; i++) {
            let tags = repoTags.get(reposWithT[i] ?? '') ?? new Set<string>()
            if (tags.size > maxTags) maxTags = tags.size
            for (let tag of intersection) {
              if (!tags.has(tag)) {
                intersection.delete(tag)
              }
            }
          }

          let intent = Array.from(intersection).sort()
          let key = intent.join(',')
          if (!nextConcepts.has(key)) {
            nextConcepts.set(key, { intent, intentSet: intersection, extentSize, maxTagsInAnyRepo: maxTags })
          }
        }

        // 5. 过滤掉非 immediate 的子概念 (保留 minimal intents)
        let conceptsArray = Array.from(nextConcepts.values())
        let immediateConcepts: Concept[] = []

        for (let i = 0; i < conceptsArray.length; i++) {
          let c1 = conceptsArray[i]
          if (c1 === undefined) continue
          let isMinimal = true
          for (let j = 0; j < conceptsArray.length; j++) {
            if (i === j) continue
            let c2 = conceptsArray[j]
            if (c2 === undefined) continue
            // 如果 c1 严格包含 c2，那么 c1 就不是 minimal
            if (c1.intentSet.size > c2.intentSet.size) {
              let containsAll = true
              for (let tag of c2.intentSet) {
                if (!c1.intentSet.has(tag)) {
                  containsAll = false
                  break
                }
              }
              if (containsAll) {
                isMinimal = false
                break
              }
            }
          }
          if (isMinimal) {
            immediateConcepts.push(c1)
          }
        }

        // 6. 构造返回数据
        let data: FcaTreeNodeData[] = immediateConcepts.map((c): FcaTreeNodeData => {
          let newTags = c.intent.filter((t) => !selectedTags.includes(t))
          let name = newTags.join(' & ')
          let id = c.intent.join(',')
          let hasChildren = c.maxTagsInAnyRepo > c.intent.length

          return { id, name, children: [], objectCount: c.extentSize, hasChildren }
        })

        // 排序：先按数量倒序，再按名称正序
        data.sort((a, b) => {
          if (a.objectCount !== b.objectCount) {
            return b.objectCount - a.objectCount
          }
          return (a.name ?? '').localeCompare(b.name ?? '')
        })

        return new Right({ data })
      },
    ),
  )

type _接口逻辑JSON参数 = 计算接口逻辑JSON参数<typeof 接口逻辑实现>
type _接口逻辑错误返回 = 计算接口逻辑错误结果<typeof 接口逻辑实现>
type _接口逻辑正确返回 = 计算接口逻辑正确结果<typeof 接口逻辑实现>

let 接口错误类型描述 = z.enum(['未登录', '用户不存在'])
let 接口正确类型描述 = z.object({ data: z.array(FcaTreeNodeDataSchema) })

export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
