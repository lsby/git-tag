import { JSON参数解析插件, 常用接口返回器, 接口, 接口逻辑 } from '@lsby/net-core'
import { Right } from '@lsby/ts-fp-data'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let 接口路径 = '/api/project/repo/get-ignored-list' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造([new JSON参数解析插件(z.object({}), {}), kysely插件], async (参数, 逻辑附加参数, 请求附加参数) => {
      let _log = 请求附加参数.log.extend(接口路径)
      let userId = 逻辑附加参数.userId
      let db = 参数.kysely.获得句柄()

      let ignoredRepos = await db
        .selectFrom('git_ignored_repo')
        .where('user_id', '=', userId)
        .select(['id', 'full_name'])
        .execute()

      let list = ignoredRepos.map((repo) => ({ id: repo.id, fullName: repo.full_name }))

      return new Right({ list })
    }),
  )

let 接口错误类型描述 = z.enum(['未登录', '用户不存在'])
let 接口正确类型描述 = z.object({ list: z.array(z.object({ id: z.string(), fullName: z.string() })) })
export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
