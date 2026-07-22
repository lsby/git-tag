import { JSON参数解析插件, 常用接口返回器, 接口, 接口逻辑 } from '@lsby/net-core'
import { Left, Right } from '@lsby/ts-fp-data'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let 接口路径 = '/api/project/repo/delete' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [new JSON参数解析插件(z.object({ id: z.string(), deleteRemote: z.boolean().optional() }), {}), kysely插件],
      async (参数, 逻辑附加参数, 请求附加参数) => {
        let _log = 请求附加参数.log.extend(接口路径)
        let userId = 逻辑附加参数.userId
        let db = 参数.kysely.获得句柄()

        if (参数.json.deleteRemote === true) {
          let repo = await db
            .selectFrom('git_repo')
            .where('id', '=', 参数.json.id)
            .where('user_id', '=', userId)
            .selectAll()
            .executeTakeFirst()
          if (repo !== undefined) {
            let config = await db
              .selectFrom('git_provider_config')
              .where('id', '=', repo.provider_id)
              .where('user_id', '=', userId)
              .selectAll()
              .executeTakeFirst()
            if (config !== undefined) {
              let token = config.token
              let url = `https://api.github.com/repos/${repo.full_name}`
              let res = await fetch(url, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                },
              })
              if (res.status !== 204 && res.status !== 404) {
                let errorText = await res.text()
                await _log.error('GitHub API 删除失败:', errorText)
                return new Left('删除远程仓库失败，请检查 Token 是否具有 delete_repo 权限' as const)
              }
            }
          }
        }

        await db.deleteFrom('git_repo').where('id', '=', 参数.json.id).where('user_id', '=', userId).execute()

        return new Right({ success: true })
      },
    ),
  )

let 接口错误类型描述 = z.enum(['未登录', '用户不存在', '删除远程仓库失败，请检查 Token 是否具有 delete_repo 权限'])
let 接口正确类型描述 = z.object({ success: z.boolean() })
export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
