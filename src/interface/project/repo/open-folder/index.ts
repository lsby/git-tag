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
import * as fs from 'fs/promises'
import open from 'open'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let 接口路径 = '/api/project/repo/open-folder' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [new JSON参数解析插件(z.object({ targetPath: z.string() }), {})],
      async (参数, _逻辑附加参数, 请求附加参数): Promise<Right<never, { success: boolean }>> => {
        let _log = 请求附加参数.log.extend(接口路径)
        let 目标路径 = 参数.json.targetPath

        try {
          let stat = await fs.stat(目标路径)
          if (stat.isDirectory()) {
            await open(目标路径)
            return new Right({ success: true })
          } else {
            return new Right({ success: false })
          }
        } catch (_e) {
          return new Right({ success: false })
        }
      },
    ),
  )

type _接口逻辑JSON参数 = 计算接口逻辑JSON参数<typeof 接口逻辑实现>
type _接口逻辑错误返回 = 计算接口逻辑错误结果<typeof 接口逻辑实现>
type _接口逻辑正确返回 = 计算接口逻辑正确结果<typeof 接口逻辑实现>

let 接口错误类型描述 = z.enum(['未登录', '输入参数错误'])
let 接口正确类型描述 = z.object({ success: z.boolean() })

export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
