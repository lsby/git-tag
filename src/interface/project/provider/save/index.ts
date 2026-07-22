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
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let 接口路径 = '/api/project/provider/save' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [
        new JSON参数解析插件(z.object({ id: z.string().optional(), providerType: z.string(), token: z.string() }), {}),
        kysely插件,
      ],
      async (参数, 逻辑附加参数, 请求附加参数) => {
        let _log = 请求附加参数.log.extend(接口路径)

        if (参数.json.id !== undefined && 参数.json.id !== '') {
          await 参数.kysely
            .获得句柄()
            .updateTable('git_provider_config')
            .set({ token: 参数.json.token, updated_at: new Date().toISOString() })
            .where('id', '=', 参数.json.id)
            .where('user_id', '=', 逻辑附加参数.userId)
            .execute()
        } else {
          await 参数.kysely
            .获得句柄()
            .insertInto('git_provider_config')
            .values({
              id: randomUUID(),
              user_id: 逻辑附加参数.userId,
              provider_type: 参数.json.providerType,
              token: 参数.json.token,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .execute()
        }

        return new Right({ success: true })
      },
    ),
  )

type _接口逻辑JSON参数 = 计算接口逻辑JSON参数<typeof 接口逻辑实现>
type _接口逻辑错误返回 = 计算接口逻辑错误结果<typeof 接口逻辑实现>
type _接口逻辑正确返回 = 计算接口逻辑正确结果<typeof 接口逻辑实现>

let 接口错误类型描述 = z.enum(['未登录', '用户不存在'])
let 接口正确类型描述 = z.object({ success: z.boolean() })

export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
