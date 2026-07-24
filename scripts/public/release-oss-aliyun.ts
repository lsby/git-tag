import OSS from 'ali-oss'
import { execSync } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import readline from 'readline/promises'
import { fileURLToPath } from 'url'
import { z } from 'zod'

let __当前文件名 = fileURLToPath(import.meta.url)
let __当前目录名 = path.dirname(__当前文件名)
let 项目根目录 = path.resolve(__当前目录名, '../../')
let 本地同步目录 = path.join(项目根目录, 'dist/src/web')

let 配置文件路径 = path.join(__当前目录名, 'release-oss-aliyun-config.json')
let 阿里云配置校验器 = z.object({
  region: z.string(),
  accessKeyId: z.string(),
  accessKeySecret: z.string(),
  bucket: z.string(),
  云端目标目录: z.string(),
})
let 阿里云配置 = 阿里云配置校验器.parse(JSON.parse(fs.readFileSync(配置文件路径, 'utf-8')))

let 云端目标目录 = 阿里云配置.云端目标目录 // 同步的目标目录，须以 / 结尾，若直接同步到根目录，可设为空字符串 ''

function 获取MIME类型(文件路径: string): string {
  let 后缀 = path.extname(文件路径).toLowerCase()
  let 映射: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.wasm': 'application/wasm',
  }
  let MIME = 映射[后缀]
  if (MIME !== undefined) {
    return MIME
  }
  return 'application/octet-stream'
}

function 计算文件MD5(文件路径: string): string {
  let 内容 = fs.readFileSync(文件路径)
  return crypto.createHash('md5').update(内容).digest('hex').toLowerCase()
}

function 递归获取本地文件(目录路径: string, 根目录路径: string): string[] {
  let 结果: string[] = []
  if (fs.existsSync(目录路径) === false) {
    return 结果
  }
  let 所有项 = fs.readdirSync(目录路径, { withFileTypes: true })
  for (let 项 of 所有项) {
    let 绝对路径 = path.join(目录路径, 项.name)
    if (项.isDirectory() === true) {
      结果.push(...递归获取本地文件(绝对路径, 根目录路径))
    } else {
      结果.push(绝对路径)
    }
  }
  return 结果
}

async function 执行同步(): Promise<void> {
  try {
    let 公共路径 = 云端目标目录
    if (公共路径 === '') {
      公共路径 = '/'
    }
    if (公共路径.startsWith('/') === false) {
      公共路径 = '/' + 公共路径
    }
    if (公共路径.endsWith('/') === false) {
      公共路径 = 公共路径 + '/'
    }

    console.log(`正在运行本地构建，资源公共路径 (public-url): ${公共路径} ...`)
    execSync(`npm run _clean:web`, { stdio: 'inherit', cwd: 项目根目录 })
    execSync(
      `npx parcel build --no-cache --no-source-maps src/web/page/**/*.html --dist-dir dist/src/web --public-url ${公共路径}`,
      { stdio: 'inherit', cwd: 项目根目录 },
    )
    console.log('本地构建完成！')

    if (fs.existsSync(本地同步目录) === false) {
      throw new Error(`本地打包目录不存在: ${本地同步目录}`)
    }

    if (
      阿里云配置.accessKeyId === '请填写 accessKeyId' ||
      阿里云配置.accessKeySecret === '请填写 accessKeySecret' ||
      阿里云配置.bucket === '请填写 bucket'
    ) {
      console.log('⚠️ 警告: 请先在配置文件中配置您的阿里云 OSS 密钥和 Bucket 名称！')
      process.exit(1)
    }

    let 客户端 = new OSS({
      region: 阿里云配置.region,
      accessKeyId: 阿里云配置.accessKeyId,
      accessKeySecret: 阿里云配置.accessKeySecret,
      bucket: 阿里云配置.bucket,
    })

    console.log('正在获取本地文件列表...')
    let 本地文件绝对路径列表 = 递归获取本地文件(本地同步目录, 本地同步目录)
    console.log(`本地共有 ${本地文件绝对路径列表.length} 个文件待处理。`)

    console.log('正在获取云端对象列表...')
    let 所有云端对象: OSS.ObjectMeta[] = []
    let 继续获取 = true
    let 下一个标记: string | undefined = undefined

    while (继续获取 === true) {
      let 查询参数: OSS.ListV2ObjectsQuery = { prefix: 云端目标目录, 'max-keys': 1000 }
      if (下一个标记 !== undefined) {
        查询参数['continuation-token'] = 下一个标记
      }
      let 结果: OSS.ListV2ObjectResult = await 客户端.listV2(查询参数, {})
      所有云端对象.push(...结果.objects)
      if (结果.isTruncated === true) {
        下一个标记 = 结果.nextContinuationToken
      } else {
        继续获取 = false
      }
    }
    console.log(`云端共有 ${所有云端对象.length} 个对象。`)

    // 建立云端文件映射方便对比
    let 云端映射 = new Map<string, OSS.ObjectMeta>()
    for (let 对象 of 所有云端对象) {
      云端映射.set(对象.name, 对象)
    }

    let 待上传列表: { 本地绝对路径: string; 云端Key: string }[] = []
    let 已处理的云端Key列表 = new Set<string>()

    for (let 本地绝对路径 of 本地文件绝对路径列表) {
      let 相对路径 = path.relative(本地同步目录, 本地绝对路径).replace(/\\/g, '/')
      let 云端Key = 云端目标目录 + 相对路径
      已处理的云端Key列表.add(云端Key)

      let 云端对象 = 云端映射.get(云端Key)
      if (云端对象 === undefined) {
        待上传列表.push({ 本地绝对路径, 云端Key })
      } else {
        let 本地MD5 = 计算文件MD5(本地绝对路径)
        let 云端ETag = 云端对象.etag.replace(/"/g, '').toLowerCase()
        if (本地MD5 !== 云端ETag) {
          待上传列表.push({ 本地绝对路径, 云端Key })
        }
      }
    }

    let 待删除云端Key列表: string[] = []
    for (let 对象 of 所有云端对象) {
      if (对象.name.endsWith('/') === true) {
        continue
      }
      if (已处理的云端Key列表.has(对象.name) === false) {
        待删除云端Key列表.push(对象.name)
      }
    }

    console.log(`发现有 ${待上传列表.length} 个文件需要上传/更新。`)
    console.log(`发现有 ${待删除云端Key列表.length} 个多余文件需要删除。`)

    // 开始上传文件 (限制并发数量)
    let 最大并发数 = 5
    let 当前同步索引 = 0
    let 错误列表: Error[] = []

    async function 运行上传任务(): Promise<void> {
      while (当前同步索引 < 待上传列表.length) {
        let 索引 = 当前同步索引
        当前同步索引 = 当前同步索引 + 1
        let 任务 = 待上传列表[索引]
        if (任务 === undefined) {
          continue
        }
        try {
          let MIME类型 = 获取MIME类型(任务.本地绝对路径)
          console.log(`[上传中] ${任务.云端Key} (${MIME类型})`)
          await 客户端.put(任务.云端Key, 任务.本地绝对路径, { headers: { 'content-type': MIME类型 } })
          console.log(`[成功] ${任务.云端Key}`)
        } catch (处理错误) {
          console.error(`❌ 上传失败 ${任务.云端Key}:`, 处理错误)
          if (处理错误 instanceof Error) {
            错误列表.push(处理错误)
          } else {
            错误列表.push(new Error(String(处理错误)))
          }
        }
      }
    }

    let 并发Promise列表: Promise<void>[] = []
    let 上传任务数 = Math.min(最大并发数, 待上传列表.length)
    let 计数 = 0
    while (计数 < 上传任务数) {
      并发Promise列表.push(运行上传任务())
      计数 = 计数 + 1
    }
    await Promise.all(并发Promise列表)

    // 开始删除多余云端文件
    if (待删除云端Key列表.length > 0) {
      console.log('\n--- 待删除云端多余文件列表 ---')
      for (let 键 of 待删除云端Key列表) {
        console.log(`[待删除] ${键}`)
      }
      console.log('------------------------------')

      let 终端 = readline.createInterface({ input: process.stdin, output: process.stdout })
      try {
        let 回答 = await 终端.question(
          `⚠️ 发现有 ${待删除云端Key列表.length} 个多余文件，是否确认删除云端上的这些文件？(y/N): `,
        )
        终端.close()
        let 确认输入 = 回答.trim().toLowerCase()
        if (确认输入 !== 'y' && 确认输入 !== 'yes') {
          console.log('已取消删除操作，跳过云端多余文件的清理。')
          return
        }
      } catch (交互错误) {
        终端.close()
        throw 交互错误
      }

      console.log(`开始删除多余的云端对象...`)
      // 阿里云 deleteMulti 接口限制单次最多 1000 个
      let 分片大小 = 1000
      let 偏移 = 0
      while (偏移 < 待删除云端Key列表.length) {
        let 当前分片 = 待删除云端Key列表.slice(偏移, 偏移 + 分片大小)
        偏移 = 偏移 + 分片大小
        try {
          console.log(`正在删除一批云端对象 (数量: ${当前分片.length})...`)
          await 客户端.deleteMulti(当前分片, { quiet: true })
          console.log(`已成功删除当前批次`)
        } catch (删除错误) {
          console.error('❌ 批量删除失败:', 删除错误)
          if (删除错误 instanceof Error) {
            错误列表.push(删除错误)
          } else {
            错误列表.push(new Error(String(删除错误)))
          }
        }
      }
    }

    if (错误列表.length > 0) {
      throw new Error(`同步过程中出现 ${错误列表.length} 个错误！`)
    }

    console.log('🎉 阿里云 OSS 同步完成！')
  } catch (外部错误) {
    console.error('❌ 同步终止，发生异常:', 外部错误)
    process.exit(1)
  }
}

执行同步().catch(console.error)
