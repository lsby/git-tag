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
import { exec } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import { promisify } from 'util'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let execAsync = promisify(exec)

let 接口路径 = '/api/project/repo/check-clone-dir' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [new JSON参数解析插件(z.object({ targetPath: z.string(), expectedUrl: z.string() }), {})],
      async (
        参数,
        _逻辑附加参数,
        请求附加参数,
      ): Promise<Right<never, { status: 'NOT_EXIST' | 'EXIST_AND_MATCH' | 'EXIST_AND_MISMATCH' | 'EXIST_NO_GIT' }>> => {
        let _log = 请求附加参数.log.extend(接口路径)
        let 目标路径 = 参数.json.targetPath
        let 预期地址 = 参数.json.expectedUrl

        try {
          let stat = await fs.stat(目标路径)
          if (stat.isDirectory() === false) {
            return new Right({ status: 'EXIST_NO_GIT' as const })
          }

          let gitDir = path.join(目标路径, '.git')
          let hasGit = false
          try {
            let gitStat = await fs.stat(gitDir)
            hasGit = gitStat.isDirectory()
          } catch (_e) {
            hasGit = false
          }

          if (hasGit === false) {
            return new Right({ status: 'EXIST_NO_GIT' as const })
          }

          try {
            let { stdout } = await execAsync('git remote -v', { cwd: 目标路径 })
            if (stdout.includes(预期地址)) {
              return new Right({ status: 'EXIST_AND_MATCH' as const })
            } else {
              return new Right({ status: 'EXIST_AND_MISMATCH' as const })
            }
          } catch (_e) {
            return new Right({ status: 'EXIST_NO_GIT' as const })
          }
        } catch (_e) {
          return new Right({ status: 'NOT_EXIST' as const })
        }
      },
    ),
  )

type _接口逻辑JSON参数 = 计算接口逻辑JSON参数<typeof 接口逻辑实现>
type _接口逻辑错误返回 = 计算接口逻辑错误结果<typeof 接口逻辑实现>
type _接口逻辑正确返回 = 计算接口逻辑正确结果<typeof 接口逻辑实现>

let 接口错误类型描述 = z.enum(['未登录', '输入参数错误'])
let 接口正确类型描述 = z.object({
  status: z.enum(['NOT_EXIST', 'EXIST_AND_MATCH', 'EXIST_AND_MISMATCH', 'EXIST_NO_GIT']),
})

export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
