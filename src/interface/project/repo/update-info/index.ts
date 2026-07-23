import { JSON参数解析插件, 常用接口返回器, 接口, 接口逻辑 } from '@lsby/net-core'
import { Left, Right } from '@lsby/ts-fp-data'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let 接口路径 = '/api/project/repo/update-info' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [
        new JSON参数解析插件(
          z.object({
            id: z.string(),
            full_name: z.string().optional(),
            description: z.string().optional(),
            is_private: z.boolean().optional(),
          }),
          {},
        ),
        kysely插件,
      ],
      async (参数, 逻辑附加参数, 请求附加参数) => {
        let _log = 请求附加参数.log.extend(接口路径)
        let userId = 逻辑附加参数.userId
        let db = 参数.kysely.获得句柄()

        let repoInfo = await db
          .selectFrom('git_repo')
          .innerJoin('git_provider_config', 'git_repo.provider_id', 'git_provider_config.id')
          .select([
            'git_repo.full_name',
            'git_repo.description',
            'git_provider_config.provider_type',
            'git_provider_config.token',
          ])
          .where('git_repo.id', '=', 参数.json.id)
          .where('git_repo.user_id', '=', userId)
          .executeTakeFirst()

        if (repoInfo === undefined) {
          return new Left('仓库不存在' as const)
        }

        let updateData: any = {}
        if (参数.json.full_name !== undefined) {
          updateData.full_name = 参数.json.full_name
        }
        if (参数.json.description !== undefined) {
          updateData.description = 参数.json.description
        }
        if (参数.json.is_private !== undefined) {
          updateData.is_private = 参数.json.is_private ? 1 : 0
        }

        if (Object.keys(updateData).length > 0) {
          if (repoInfo.provider_type.toLowerCase() === 'github') {
            let githubApiData: any = {}
            if (参数.json.full_name !== undefined) {
              let parts = 参数.json.full_name.split('/')
              githubApiData.name = parts.length > 1 ? parts[1] : 参数.json.full_name
              updateData.url = `https://github.com/${参数.json.full_name}`
            }
            if (参数.json.description !== undefined) {
              githubApiData.description = 参数.json.description
            }
            if (参数.json.is_private !== undefined) {
              githubApiData.private = 参数.json.is_private
            }

            let res = await fetch(`https://api.github.com/repos/${repoInfo.full_name}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${repoInfo.token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
              body: JSON.stringify(githubApiData),
            })
            if (res.status !== 200) {
              await _log.error('GitHub API 错误:', await res.text())
              return new Left('同步到 GitHub 失败' as const)
            }
          }

          await db
            .updateTable('git_repo')
            .set(updateData)
            .where('id', '=', 参数.json.id)
            .where('user_id', '=', userId)
            .execute()
        }

        return new Right({ success: true })
      },
    ),
  )

let 接口错误类型描述 = z.enum(['未登录', '用户不存在', '仓库不存在', '同步到 GitHub 失败'])
let 接口正确类型描述 = z.object({ success: z.boolean() })
export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
