import {
  JSON参数解析插件,
  常用接口返回器,
  接口,
  接口逻辑,
  计算接口逻辑JSON参数,
  计算接口逻辑正确结果,
  计算接口逻辑错误结果,
} from '@lsby/net-core'
import { Left, Right } from '@lsby/ts-fp-data'
import crypto from 'node:crypto'
import { domainToASCII } from 'node:url'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let 接口路径 = '/api/project/repo/update-tags' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [new JSON参数解析插件(z.object({ repoId: z.string(), tags: z.array(z.string()) }), {}), kysely插件],
      async (参数, 逻辑附加参数, 请求附加参数) => {
        let _log = 请求附加参数.log.extend(接口路径)

        let db = 参数.kysely.获得句柄()
        let userId = 逻辑附加参数.userId

        let repo = await db
          .selectFrom('git_repo')
          .where('id', '=', 参数.json.repoId)
          .where('user_id', '=', userId)
          .selectAll()
          .executeTakeFirst()
        if (repo === undefined) {
          return new Left('仓库不存在' as const)
        }

        let provider = await db
          .selectFrom('git_provider_config')
          .where('id', '=', repo.provider_id)
          .where('user_id', '=', userId)
          .selectAll()
          .executeTakeFirst()
        if (provider === undefined) {
          return new Left('服务商配置不存在' as const)
        }

        let newTags = 参数.json.tags
        let newTagsAscii = newTags.map((t) => domainToASCII(t))

        let url = `https://api.github.com/repos/${repo.full_name}/topics`
        let res = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${provider.token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ names: newTagsAscii }),
        })

        if (res.status !== 200) {
          await _log.error('Failed to update topics', await res.text())
          return new Left('调用 GitHub API 失败' as const)
        }

        // 更新本地数据库 (使用原始中文标签, 而不是 Punycode)
        await db.transaction().execute(async (tx) => {
          // 1. 插入可能的新标签
          if (newTags.length > 0) {
            let tagRecords = newTags.map((t) => ({ id: crypto.randomUUID(), name: t }))
            await tx
              .insertInto('git_tag')
              .values(tagRecords)
              .onConflict((oc) => oc.column('name').doNothing())
              .execute()
          }

          // 2. 删除旧的关联关系
          await tx.deleteFrom('git_repo_tag_relation').where('repo_id', '=', repo.id).execute()

          // 3. 插入新的关联关系
          if (newTags.length > 0) {
            let tagsFromDb = await tx.selectFrom('git_tag').where('name', 'in', newTags).selectAll().execute()
            let relations = tagsFromDb.map((t) => ({ id: crypto.randomUUID(), repo_id: repo.id, tag_id: t.id }))
            await tx.insertInto('git_repo_tag_relation').values(relations).execute()
          }
        })

        return new Right({ success: true })
      },
    ),
  )

type _接口逻辑JSON参数 = 计算接口逻辑JSON参数<typeof 接口逻辑实现>
type _接口逻辑错误返回 = 计算接口逻辑错误结果<typeof 接口逻辑实现>
type _接口逻辑正确返回 = 计算接口逻辑正确结果<typeof 接口逻辑实现>

let 接口错误类型描述 = z.enum(['未登录', '用户不存在', '仓库不存在', '服务商配置不存在', '调用 GitHub API 失败'])
let 接口正确类型描述 = z.object({ success: z.boolean() })

export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
