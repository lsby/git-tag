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
import { match } from 'pinyin-pro'
import { z } from 'zod'
import { jwt插件, kysely插件 } from '../../../../global/plugin'
import { 检查登录 } from '../../../../interface-logic/check/check-login-jwt'

let 接口路径 = '/api/project/tag/search' as const
let 接口方法 = 'post' as const

let 接口逻辑实现 = 接口逻辑
  .空逻辑()
  .绑定(new 检查登录([jwt插件.解析器, kysely插件], () => ({ 表名: 'user', id字段: 'id' })))
  .绑定(
    接口逻辑.构造(
      [new JSON参数解析插件(z.object({ keyword: z.string() }), {}), kysely插件],
      async (参数, _逻辑附加参数, _请求附加参数) => {
        let db = 参数.kysely.获得句柄()
        let keyword = 参数.json.keyword.trim().toLowerCase()

        let result = await db.selectFrom('git_tag').select('name').execute()
        let allTags = result.map((row) => row.name)
        let matchedTags: string[] = []

        if (keyword !== '') {
          matchedTags = allTags.filter((tag) => {
            let lowerTag = tag.toLowerCase()
            if (lowerTag.includes(keyword)) return true
            // check pinyin match if the keyword contains English letters
            let pinyinMatch = match(tag, keyword)
            if (pinyinMatch !== null && pinyinMatch.length > 0) return true
            return false
          })
        } else {
          matchedTags = allTags
        }

        let tags = matchedTags.slice(0, 10)

        return new Right({ tags })
      },
    ),
  )

type _接口逻辑JSON参数 = 计算接口逻辑JSON参数<typeof 接口逻辑实现>
type _接口逻辑错误返回 = 计算接口逻辑错误结果<typeof 接口逻辑实现>
type _接口逻辑正确返回 = 计算接口逻辑正确结果<typeof 接口逻辑实现>

let 接口错误类型描述 = z.enum(['未登录', '用户不存在'])
let 接口正确类型描述 = z.object({ tags: z.array(z.string()) })

export default new 接口(接口路径, 接口方法, 接口逻辑实现, new 常用接口返回器(接口错误类型描述, 接口正确类型描述))
