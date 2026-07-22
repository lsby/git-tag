import {
  JSON参数解析插件,
  WebSocket插件,
  常用接口返回器,
  接口,
  接口逻辑,
  计算接口逻辑JSON参数,
  计算接口逻辑正确结果,
  计算接口逻辑错误结果,
  集线器监听器宿主,
} from '@lsby/net-core'
import { Right } from '@lsby/ts-fp-data'
import { spawn } from 'child_process'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let 接口路径 = '/api/project/repo/clone-repo' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [
        new JSON参数解析插件(z.object({ targetPath: z.string(), cloneUrl: z.string() }), {}),
        new WebSocket插件(
          z.object({ data: z.string(), isDone: z.boolean().optional(), isError: z.boolean().optional() }),
          z.object({ abort: z.boolean().optional() }),
        ),
      ],
      async (参数, _逻辑附加参数, 请求附加参数) => {
        let _log = 请求附加参数.log.extend(接口路径)
        let 目标路径 = 参数.json.targetPath
        let 克隆地址 = 参数.json.cloneUrl

        let 监听器宿主 = new 集线器监听器宿主()
        let 是否被中止 = false

        try {
          await 参数.ws操作?.发送ws信息({ data: `开始克隆: git clone ${克隆地址} ${目标路径}` })

          await new Promise<void>((resolve, reject) => {
            // git clone 会向 stderr 打印进度，我们需要把 stdout 和 stderr 都转发
            // 添加 --progress 强制输出进度，避免被认为卡死
            let 子进程 = spawn('git', ['clone', '--progress', 克隆地址, 目标路径])

            if (参数.ws操作 !== null) {
              void 参数.ws操作.监听ws信息(async (消息) => {
                if (消息.abort === true) {
                  是否被中止 = true
                  if (process.platform === 'win32') {
                    if (子进程.pid !== undefined) {
                      spawn('taskkill', ['/pid', 子进程.pid.toString(), '/T', '/F'])
                    }
                  } else {
                    子进程.kill('SIGKILL')
                  }
                }
              }, 监听器宿主)
            }

            子进程.stdout.on('data', async (数据块) => {
              let 文本 = String(数据块)
              await 参数.ws操作?.发送ws信息({ data: 文本 }).catch(() => {})
            })

            子进程.stderr.on('data', async (数据块) => {
              let 文本 = String(数据块)
              await 参数.ws操作?.发送ws信息({ data: 文本 }).catch(() => {})
            })

            子进程.on('close', async (状态码) => {
              if (状态码 === 0) {
                await 参数.ws操作?.发送ws信息({ data: '克隆完成！', isDone: true }).catch(() => {})
                resolve()
              } else {
                if (是否被中止) {
                  await 参数.ws操作?.发送ws信息({ data: '克隆已取消', isError: true, isDone: true }).catch(() => {})
                  resolve()
                } else {
                  let 错误信息 = `git clone 失败，退出码: ${状态码}`
                  await 参数.ws操作?.发送ws信息({ data: 错误信息, isError: true, isDone: true }).catch(() => {})
                  reject(new Error(错误信息))
                }
              }
            })

            子进程.on('error', async (错误: Error) => {
              let 错误信息 = `无法启动 git 命令: ${错误.message}`
              await 参数.ws操作?.发送ws信息({ data: 错误信息, isError: true, isDone: true }).catch(() => {})
              reject(错误)
            })
          })
        } catch (_e) {
          // 异常在上面已经 push 给前端
        }

        监听器宿主.解绑()

        return new Right({})
      },
      async (参数) => {
        await 参数.ws操作?.关闭ws连接()
      },
    ),
  )

type _接口逻辑JSON参数 = 计算接口逻辑JSON参数<typeof 接口逻辑实现>
type _接口逻辑错误返回 = 计算接口逻辑错误结果<typeof 接口逻辑实现>
type _接口逻辑正确返回 = 计算接口逻辑正确结果<typeof 接口逻辑实现>

let 接口错误类型描述 = z.enum(['未登录', '输入参数错误'])
let 接口正确类型描述 = z.object({})

export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
