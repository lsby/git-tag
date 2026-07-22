import {
  JSON参数解析插件,
  WebSocket插件,
  常用接口返回器,
  接口,
  接口逻辑,
  计算接口逻辑JSON参数,
  计算接口逻辑正确结果,
  计算接口逻辑错误结果,
} from '@lsby/net-core'
import { Left, Right } from '@lsby/ts-fp-data'
import crypto from 'node:crypto'
import { domainToUnicode } from 'node:url'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let 接口路径 = '/api/project/provider/sync' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [
        new JSON参数解析插件(z.object({ providerId: z.string() }), {}),
        new WebSocket插件(z.object({ message: z.string() }), z.object({})),
        kysely插件,
      ],
      async (参数, 逻辑附加参数, 请求附加参数) => {
        let _log = 请求附加参数.log.extend(接口路径)
        let userId = 逻辑附加参数.userId
        let db = 参数.kysely.获得句柄()

        let ws发送 = async (message: string): Promise<void> => {
          await 参数.ws操作?.发送ws信息({ message }).catch(() => {})
        }

        // 1. 获取配置
        let config = await db
          .selectFrom('git_provider_config')
          .where('id', '=', 参数.json.providerId)
          .where('user_id', '=', userId)
          .selectAll()
          .executeTakeFirst()
        if (config === undefined) {
          return new Left('服务商配置不存在' as const)
        }

        let token = config.token

        let RepoSchema = z
          .object({
            id: z.number(),
            full_name: z.string(),
            description: z.string().nullable(),
            html_url: z.string(),
            stargazers_count: z.number().optional(),
            language: z.string().nullable(),
            topics: z.array(z.string()).optional(),
            private: z.boolean(),
          })
          .passthrough()

        // 2. 拉取 GitHub 仓库
        let allRepos: z.infer<typeof RepoSchema>[] = []
        let page = 1
        while (true) {
          await ws发送(`正在从 GitHub 拉取您的仓库 (第 ${page} 页)...`)
          let url = `https://api.github.com/user/repos?per_page=100&page=${page}&affiliation=owner`
          let res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          })
          if (res.status !== 200) {
            await _log.error('GitHub API 错误:', await res.text())
            return new Left('请求 GitHub API 失败，请检查 Token 是否有效' as const)
          }
          let data = (await res.json()) as unknown
          if (Array.isArray(data) === false) break
          if (data.length === 0) break

          let parsedData = z.array(RepoSchema).parse(data)
          for (let item of parsedData) {
            allRepos.push(item)
          }
          page = page + 1
        }

        let ignoredRepos = await db
          .selectFrom('git_ignored_repo')
          .where('user_id', '=', userId)
          .select('full_name')
          .execute()
        let ignoredSet = new Set(ignoredRepos.map((r) => r.full_name))
        allRepos = allRepos.filter((r) => !ignoredSet.has(r.full_name))

        // 3. 处理数据
        await ws发送(`拉取完成，共获得 ${allRepos.length} 个仓库，正在准备写入数据库...`)

        let allTopicsSet = new Set<string>()
        for (let repo of allRepos) {
          let topics = repo.topics
          if (Array.isArray(topics)) {
            // Decode punycode tags in place
            repo.topics = topics.map((t) => domainToUnicode(t))
            for (let t of repo.topics) allTopicsSet.add(t)
          }
        }
        let allTopicsArray = Array.from(allTopicsSet)

        // 4. 落库
        await db.transaction().execute(async (tx) => {
          await ws发送('正在清理旧数据...')
          await tx.deleteFrom('git_repo').where('provider_id', '=', 参数.json.providerId).execute()

          await ws发送('正在同步标签数据...')
          if (allTopicsArray.length > 0) {
            let chunkSize = 100
            for (let i = 0; i < allTopicsArray.length; i += chunkSize) {
              let chunk = allTopicsArray.slice(i, i + chunkSize)
              await tx
                .insertInto('git_tag')
                .values(chunk.map((t) => ({ id: crypto.randomUUID(), name: t })))
                .onConflict((oc) => oc.column('name').doNothing())
                .execute()
            }
          }

          let tagMap = new Map<string, string>()
          if (allTopicsArray.length > 0) {
            // sqlite 的 in 子句也有数量限制，不过我们只做了100，如果在外面可以分块
            let chunkSize = 100
            for (let i = 0; i < allTopicsArray.length; i += chunkSize) {
              let chunk = allTopicsArray.slice(i, i + chunkSize)
              let tags = await tx.selectFrom('git_tag').where('name', 'in', chunk).selectAll().execute()
              for (let t of tags) tagMap.set(t.name, t.id)
            }
          }

          await ws发送('正在保存仓库及关联数据...')
          let reposToInsert = []
          let relationsToInsert = []

          for (let r of allRepos) {
            let repoId = crypto.randomUUID()
            reposToInsert.push({
              id: repoId,
              user_id: userId,
              provider_id: 参数.json.providerId,
              external_id: String(r.id),
              full_name: r.full_name,
              description: r.description ?? '',
              url: r.html_url,
              stars: r.stargazers_count ?? 0,
              language: r.language ?? '',
              is_private: r.private ? 1 : 0,
              raw_data: JSON.stringify(r),
            })

            let topics = r.topics
            if (Array.isArray(topics)) {
              for (let topic of topics) {
                let tagId = tagMap.get(topic)
                if (tagId !== undefined) {
                  relationsToInsert.push({ id: crypto.randomUUID(), repo_id: repoId, tag_id: tagId })
                }
              }
            }
          }

          if (reposToInsert.length > 0) {
            let chunkSize = 100
            for (let i = 0; i < reposToInsert.length; i += chunkSize) {
              await tx
                .insertInto('git_repo')
                .values(reposToInsert.slice(i, i + chunkSize))
                .execute()
            }
          }

          if (relationsToInsert.length > 0) {
            let chunkSize = 100
            for (let i = 0; i < relationsToInsert.length; i += chunkSize) {
              await tx
                .insertInto('git_repo_tag_relation')
                .values(relationsToInsert.slice(i, i + chunkSize))
                .execute()
            }
          }
        })

        await ws发送('同步全部完成！')

        return new Right({ success: true, message: '同步成功' })
      },
      async (参数) => {
        await 参数.ws操作?.关闭ws连接()
      },
    ),
  )

type _接口逻辑JSON参数 = 计算接口逻辑JSON参数<typeof 接口逻辑实现>
type _接口逻辑错误返回 = 计算接口逻辑错误结果<typeof 接口逻辑实现>
type _接口逻辑正确返回 = 计算接口逻辑正确结果<typeof 接口逻辑实现>

let 接口错误类型描述 = z.enum([
  '未登录',
  '用户不存在',
  '服务商配置不存在',
  '请求 GitHub API 失败，请检查 Token 是否有效',
])
let 接口正确类型描述 = z.object({ success: z.boolean(), message: z.string() })

export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
