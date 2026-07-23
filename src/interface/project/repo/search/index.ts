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
import { sql } from 'kysely'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let 接口路径 = '/api/project/repo/search' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [
        new JSON参数解析插件(
          z.object({
            keyword: z.string().optional(),
            tags: z.array(z.string()).optional(),
            visibility: z.enum(['All', 'Public', 'Private']).optional().default('All'),
            sort: z.enum(['stars', 'updated_at', 'full_name']).optional().default('updated_at'),
            order: z.enum(['desc', 'asc']).optional().default('desc'),
            hasTags: z.enum(['All', 'Yes', 'No']).optional().default('All'),
            isFork: z.enum(['All', 'Yes', 'No']).optional().default('All'),
            page: z.number().int().min(1).default(1),
            pageSize: z.number().int().min(1).max(100).default(20),
          }),
          {},
        ),
        kysely插件,
      ],
      async (参数, 逻辑附加参数, 请求附加参数) => {
        let _log = 请求附加参数.log.extend(接口路径)
        let userId = 逻辑附加参数.userId
        let db = 参数.kysely.获得句柄()
        let { keyword, tags, page, pageSize } = 参数.json

        let query = db.selectFrom('git_repo').where('user_id', '=', userId)

        if (keyword !== undefined && keyword.trim() !== '') {
          query = query.where((eb) =>
            eb.or([eb('full_name', 'like', `%${keyword}%`), eb('description', 'like', `%${keyword}%`)]),
          )
        }

        if (参数.json.visibility !== 'All') {
          if (参数.json.visibility === 'Public') {
            query = query.where('is_private', '=', 0)
          } else {
            query = query.where('is_private', '=', 1)
          }
        }

        if (tags !== undefined && tags.length > 0) {
          for (let tag of tags) {
            query = query.where((eb) =>
              eb.exists(
                eb
                  .selectFrom('git_repo_tag_relation')
                  .select('git_repo_tag_relation.id')
                  .innerJoin('git_tag', 'git_repo_tag_relation.tag_id', 'git_tag.id')
                  .whereRef('git_repo_tag_relation.repo_id', '=', 'git_repo.id')
                  .where('git_tag.name', '=', tag),
              ),
            )
          }
        }

        if (参数.json.hasTags !== 'All') {
          if (参数.json.hasTags === 'Yes') {
            query = query.where((eb) =>
              eb.exists(
                eb
                  .selectFrom('git_repo_tag_relation')
                  .select('git_repo_tag_relation.id')
                  .whereRef('git_repo_tag_relation.repo_id', '=', 'git_repo.id'),
              ),
            )
          } else {
            query = query.where((eb) =>
              eb.not(
                eb.exists(
                  eb
                    .selectFrom('git_repo_tag_relation')
                    .select('git_repo_tag_relation.id')
                    .whereRef('git_repo_tag_relation.repo_id', '=', 'git_repo.id'),
                ),
              ),
            )
          }
        }

        if (参数.json.isFork !== 'All') {
          if (参数.json.isFork === 'Yes') {
            query = query.where((eb) =>
              eb.or([eb('raw_data', 'like', '%"fork":true%'), eb('raw_data', 'like', '%"fork": true%')]),
            )
          } else {
            query = query.where((eb) =>
              eb.not(eb.or([eb('raw_data', 'like', '%"fork":true%'), eb('raw_data', 'like', '%"fork": true%')])),
            )
          }
        }

        // Count total
        let countResult = await query.select((eb) => eb.fn.count<number>('id').as('total')).executeTakeFirst()
        let total = Number(countResult?.total ?? 0)

        // Paginate
        let limit = pageSize
        let offset = (page - 1) * pageSize
        let itemsQuery =
          参数.json.sort === 'updated_at'
            ? query
                .selectAll()
                .orderBy(
                  sql`coalesce(json_extract(raw_data, '$.pushed_at'), json_extract(raw_data, '$.updated_at'), git_repo.updated_at)`,
                  参数.json.order,
                )
                .limit(limit)
                .offset(offset)
            : query.selectAll().orderBy(参数.json.sort, 参数.json.order).limit(limit).offset(offset)

        let repoRows = await itemsQuery.execute()

        // Now we need tags for each repo
        let items: {
          id: string
          externalId: string
          fullName: string
          description: string
          url: string
          stars: number
          language: string
          tags: string[]
          isPrivate: boolean
          isFork: boolean
          githubUpdatedAt: string
        }[] = []
        if (repoRows.length > 0) {
          let repoIds = repoRows.map((r) => r.id)
          let tagsRows = await db
            .selectFrom('git_repo_tag_relation as r')
            .innerJoin('git_tag as t', 'r.tag_id', 't.id')
            .where('r.repo_id', 'in', repoIds)
            .select(['r.repo_id', 't.name'])
            .execute()

          let repoTagMap = new Map<string, string[]>()
          for (let tr of tagsRows) {
            let arr = repoTagMap.get(tr.repo_id) ?? []
            arr.push(tr.name)
            repoTagMap.set(tr.repo_id, arr)
          }

          items = repoRows.map((r) => {
            let rawDataSchema = z
              .object({
                pushed_at: z.string().optional(),
                updated_at: z.string().optional(),
                fork: z.boolean().optional(),
              })
              .passthrough()
            let githubUpdatedAt = r.updated_at
            let isFork = false
            try {
              let raw = rawDataSchema.parse(JSON.parse(r.raw_data))
              githubUpdatedAt = raw.pushed_at ?? raw.updated_at ?? r.updated_at
              isFork = raw.fork ?? false
            } catch (_e) {}
            return {
              id: r.id,
              externalId: r.external_id,
              fullName: r.full_name,
              description: r.description,
              url: r.url,
              stars: r.stars,
              language: r.language,
              tags: repoTagMap.get(r.id) ?? [],
              isPrivate: r.is_private === 1,
              isFork,
              githubUpdatedAt,
            }
          })
        }

        return new Right({ total, items })
      },
    ),
  )

type _接口逻辑JSON参数 = 计算接口逻辑JSON参数<typeof 接口逻辑实现>
type _接口逻辑错误返回 = 计算接口逻辑错误结果<typeof 接口逻辑实现>
type _接口逻辑正确返回 = 计算接口逻辑正确结果<typeof 接口逻辑实现>

let 接口错误类型描述 = z.enum(['未登录', '用户不存在'])
let 接口正确类型描述 = z.object({
  total: z.number(),
  items: z.array(
    z.object({
      id: z.string(),
      externalId: z.string(),
      fullName: z.string(),
      description: z.string(),
      url: z.string(),
      stars: z.number(),
      language: z.string(),
      tags: z.array(z.string()),
      isPrivate: z.boolean(),
      isFork: z.boolean(),
      githubUpdatedAt: z.string(),
    }),
  ),
})

export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
