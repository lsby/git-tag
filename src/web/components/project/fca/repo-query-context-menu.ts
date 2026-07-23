import { API管理器 } from '../../../global/manager/api-manager'
import { 显示删除确认对话框, 显示确认对话框, 显示输入对话框 } from '../../../global/manager/dialog-manager'
import { 成功提示 } from '../../../global/manager/toast-manager'
import { 创建元素 } from '../../../global/tools/create-element'
import { 仓库卡片数据 } from './repo-card'

export class 仓库查询右键菜单 {
  private 菜单元素 = 创建元素('div', {
    style: {
      position: 'fixed',
      display: 'none',
      background: 'var(--次要背景颜色)',
      border: '1px solid var(--边框颜色)',
      borderRadius: '6px',
      padding: '4px 0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '1000',
      minWidth: '150px',
    },
  })

  public constructor(
    private 获取选中的IDs: () => Set<string>,
    private 获取当前数据: () => 仓库卡片数据[],
    private 回调: {
      全选: () => void
      重绘卡片: (数据: 仓库卡片数据) => void
      展示批量修改标签: () => void
      从界面移除卡片: (ids: string[]) => void
      清空选中: () => void
      根据筛选条件移除或重绘卡片: (数据: 仓库卡片数据) => void
    },
  ) {
    window.addEventListener('click', () => {
      this.隐藏()
    })
  }

  public 挂载到(父元素: HTMLElement | ShadowRoot): void {
    父元素.appendChild(this.菜单元素)
  }

  public 绑定滚动隐藏(滚动容器: HTMLElement): void {
    滚动容器.addEventListener('scroll', () => {
      this.隐藏()
    })
  }

  public 隐藏(): void {
    this.菜单元素.style.display = 'none'
  }

  public 显示(clientX: number, clientY: number): void {
    this.更新内容()
    this.菜单元素.style.display = 'block'
    this.菜单元素.style.left = `${clientX}px`
    this.菜单元素.style.top = `${clientY}px`

    let rect = this.菜单元素.getBoundingClientRect()
    if (clientX + rect.width > window.innerWidth) {
      this.菜单元素.style.left = `${window.innerWidth - rect.width}px`
    }
    if (clientY + rect.height > window.innerHeight) {
      this.菜单元素.style.top = `${window.innerHeight - rect.height}px`
    }
  }

  private 创建菜单项(文本: string, 点击事件: () => void, 危险: boolean = false): HTMLElement {
    let 项 = 创建元素('div', {
      style: { padding: '8px 16px', cursor: 'pointer', fontSize: '13px', color: 危险 ? '#ff4d4f' : 'var(--文本颜色)' },
      onmouseover: (e) => ((e.target as HTMLElement).style.background = 'var(--主要背景颜色)'),
      onmouseout: (e) => ((e.target as HTMLElement).style.background = 'transparent'),
      onclick: () => {
        this.隐藏()
        点击事件()
      },
    })
    项.textContent = 文本
    return 项
  }

  private 创建分割线(): HTMLElement {
    return 创建元素('div', { style: { height: '1px', background: 'var(--边框颜色)', margin: '4px 0' } })
  }

  private 更新内容(): void {
    this.菜单元素.innerHTML = ''

    let 选中的IDs = this.获取选中的IDs()
    let 选中的数量 = 选中的IDs.size
    if (选中的数量 === 0) return

    let 当前数据 = this.获取当前数据()

    let 当前仓库: 仓库卡片数据 | undefined
    if (选中的数量 === 1) {
      let id = Array.from(选中的IDs)[0]
      当前仓库 = 当前数据.find((i) => i.id === id)
    }

    let 获取克隆信息 = async (当前仓库: 仓库卡片数据): Promise<{ targetPath: string; cloneUrl: string } | null> => {
      let config = await API管理器.请求postJson并处理错误('/api/user/get-user-config', {})
      let clone_protocol = config.clone_protocol
      let default_clone_path = config.default_clone_path

      if (default_clone_path === '') {
        await 显示确认对话框('未配置克隆协议或默认克隆路径，请前往设置中进行配置。')
        return null
      }

      let httpsUrl = 当前仓库.url.endsWith('.git') ? 当前仓库.url : 当前仓库.url + '.git'
      let sshUrl = ''
      try {
        let u = new URL(当前仓库.url)
        sshUrl = `git@${u.host}:${u.pathname.substring(1)}${当前仓库.url.endsWith('.git') ? '' : '.git'}`
      } catch (_e) {
        sshUrl = httpsUrl
      }

      let cloneUrl = clone_protocol === 'ssh' ? sshUrl : httpsUrl
      let folderName = 当前仓库.fullName.split('/').pop() ?? 当前仓库.fullName
      let targetPath = default_clone_path.replace(/\\/g, '/').replace(/\/$/, '') + '/' + folderName

      return { targetPath, cloneUrl }
    }

    let 执行克隆操作 = async (当前仓库: 仓库卡片数据, targetPath: string, cloneUrl: string): Promise<boolean> => {
      return new Promise(async (resolve) => {
        let 遮罩层 = 创建元素('div', {
          style: {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'var(--遮罩颜色)',
            zIndex: '9999',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          },
        })
        let 对话框 = 创建元素('div', {
          style: {
            backgroundColor: 'var(--卡片背景颜色)',
            padding: '20px',
            borderRadius: '8px',
            width: '80%',
            height: '80%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          },
        })

        let 标题 = 创建元素('h3', { textContent: `正在克隆 ${当前仓库.fullName}...`, style: { margin: '0' } })
        对话框.appendChild(标题)

        let 日志容器 = 创建元素('div', { style: { flex: '1', overflow: 'hidden' } })
        let 日志组件实例 = document.createElement('lsby-log') as HTMLElement & { 添加日志: (消息: string) => void }
        日志容器.appendChild(日志组件实例)
        对话框.appendChild(日志容器)

        let ws发送消息: ((data: any) => void) | null = null
        let 克隆已完成 = false
        let 成功 = false

        let 关闭按钮 = 创建元素('button', {
          textContent: '关闭',
          style: { alignSelf: 'flex-end', padding: '8px 16px', cursor: 'pointer' },
          onclick: async () => {
            if (克隆已完成) {
              document.body.removeChild(遮罩层)
            } else {
              let 确认 = await 显示确认对话框('克隆正在进行中，是否终止？')
              if (确认) {
                if (ws发送消息 !== null) {
                  ws发送消息({ abort: true })
                }
                document.body.removeChild(遮罩层)
                resolve(false)
              }
            }
          },
        })
        对话框.appendChild(关闭按钮)

        遮罩层.appendChild(对话框)
        document.body.appendChild(遮罩层)

        try {
          await API管理器.请求postJson并处理错误(
            '/api/project/repo/clone-repo',
            { targetPath, cloneUrl },
            async (data: any) => {
              if (typeof (日志组件实例 as any).添加日志 === 'function') {
                日志组件实例.添加日志(data.data)
              }
            },
            async (发送消息) => {
              ws发送消息 = 发送消息
            },
          )
          成功 = true
        } catch (_e) {
          成功 = false
        } finally {
          克隆已完成 = true
          resolve(成功)
        }
      })
    }

    // 分组 1: 本地操作
    if (选中的数量 === 1 && 当前仓库 !== undefined) {
      let _当前仓库 = 当前仓库
      let 打开文件夹 = this.创建菜单项('打开文件夹', async () => {
        let info = await 获取克隆信息(_当前仓库)
        if (info === null) return

        let checkRes = await API管理器.请求postJson并处理错误('/api/project/repo/check-clone-dir', {
          targetPath: info.targetPath,
          expectedUrl: info.cloneUrl,
        })

        let 需要打开 = false

        if (checkRes.status === 'NOT_EXIST') {
          let 确认 = await 显示确认对话框('对应文件夹不存在，请先克隆。是否立即克隆？')
          if (确认) {
            let 成功 = await 执行克隆操作(_当前仓库, info.targetPath, info.cloneUrl)
            if (成功) {
              需要打开 = true
            }
          }
        } else {
          需要打开 = true
        }

        if (需要打开) {
          await API管理器.请求postJson并处理错误('/api/project/repo/open-folder', { targetPath: info.targetPath })
        }
      })
      this.菜单元素.appendChild(打开文件夹)

      let 克隆 = this.创建菜单项('克隆', async () => {
        let info = await 获取克隆信息(_当前仓库)
        if (info === null) return

        let checkRes = await API管理器.请求postJson并处理错误('/api/project/repo/check-clone-dir', {
          targetPath: info.targetPath,
          expectedUrl: info.cloneUrl,
        })

        if (checkRes.status === 'EXIST_AND_MATCH') {
          await 显示确认对话框('目标文件夹已存在，并且与预期仓库地址一致。')
          return
        } else if (checkRes.status === 'EXIST_AND_MISMATCH') {
          await 显示确认对话框('目标文件夹已存在，但远程仓库地址不一致。')
          return
        } else if (checkRes.status === 'EXIST_NO_GIT') {
          await 显示确认对话框('目标文件夹已存在，但不是一个 Git 仓库。')
          return
        }

        await 执行克隆操作(_当前仓库, info.targetPath, info.cloneUrl)
      })
      this.菜单元素.appendChild(克隆)

      this.菜单元素.appendChild(this.创建分割线())
    }

    // 分组 2: 复制操作
    let 复制名称 = this.创建菜单项('复制名称', () => {
      let 名称列表 = Array.from(选中的IDs)
        .map((id) => {
          return 当前数据.find((i) => i.id === id)?.fullName ?? ''
        })
        .filter((n) => n !== '')
      void navigator.clipboard.writeText(名称列表.join('\n'))
      成功提示('已复制到剪贴板')
    })
    this.菜单元素.appendChild(复制名称)

    if (选中的数量 === 1 && 当前仓库 !== undefined) {
      let _当前仓库 = 当前仓库
      let 复制http地址 = this.创建菜单项('复制http地址', () => {
        let httpsUrl = _当前仓库.url.endsWith('.git') ? _当前仓库.url : _当前仓库.url + '.git'
        void navigator.clipboard.writeText(httpsUrl)
        成功提示('已复制http地址')
      })
      this.菜单元素.appendChild(复制http地址)

      let 复制ssh地址 = this.创建菜单项('复制ssh地址', () => {
        try {
          let u = new URL(_当前仓库.url)
          let sshUrl = `git@${u.host}:${u.pathname.substring(1)}${_当前仓库.url.endsWith('.git') ? '' : '.git'}`
          void navigator.clipboard.writeText(sshUrl)
          成功提示('已复制ssh地址')
        } catch (_e) {
          成功提示('解析URL失败')
        }
      })
      this.菜单元素.appendChild(复制ssh地址)
    }

    this.菜单元素.appendChild(this.创建分割线())

    // 分组 3: 编辑操作
    if (选中的数量 === 1 && 当前仓库 !== undefined) {
      let _当前仓库 = 当前仓库
      let 编辑名称 = this.创建菜单项('编辑名称', async () => {
        let 新名称 = await 显示输入对话框(
          '请输入新的仓库名称',
          _当前仓库.fullName,
          undefined,
          '我已知晓此操作会同步修改远程仓库名称, 这会导致url变化',
        )
        if (新名称 !== null && 新名称 !== _当前仓库.fullName) {
          await API管理器.请求postJson并处理错误('/api/project/repo/update-info', {
            id: _当前仓库.id,
            full_name: 新名称,
          })
          let 旧名称 = _当前仓库.fullName
          _当前仓库.fullName = 新名称
          if (_当前仓库.url.endsWith(旧名称)) {
            _当前仓库.url = _当前仓库.url.substring(0, _当前仓库.url.length - 旧名称.length) + 新名称
          }
          成功提示('名称已更新')
          this.回调.重绘卡片(_当前仓库)
        }
      })
      this.菜单元素.appendChild(编辑名称)

      let 编辑简介 = this.创建菜单项('编辑简介', async () => {
        let 新简介 = await 显示输入对话框('请输入新的仓库简介', _当前仓库.description)
        if (新简介 !== null && 新简介 !== _当前仓库.description) {
          await API管理器.请求postJson并处理错误('/api/project/repo/update-info', {
            id: _当前仓库.id,
            description: 新简介,
          })
          _当前仓库.description = 新简介
          成功提示('简介已更新')
          this.回调.重绘卡片(_当前仓库)
        }
      })
      this.菜单元素.appendChild(编辑简介)

      let 设置公有私有 = this.创建菜单项(_当前仓库.isPrivate ? '设为公开' : '设为私有', async () => {
        let 确认 = await 显示确认对话框(
          `确定要将仓库设置为${_当前仓库.isPrivate ? '公开' : '私有'}吗？\n注意: 此操作会同步修改 GitHub 上的仓库状态，请谨慎操作。`,
        )
        if (确认) {
          let 新状态 = !_当前仓库.isPrivate
          await API管理器.请求postJson并处理错误('/api/project/repo/update-info', {
            id: _当前仓库.id,
            is_private: 新状态,
          })
          _当前仓库.isPrivate = 新状态
          成功提示(`已设置为${新状态 ? '私有' : '公开'}`)
          this.回调.根据筛选条件移除或重绘卡片(_当前仓库)
        }
      })
      this.菜单元素.appendChild(设置公有私有)
    }

    let 修改标签 = this.创建菜单项('修改标签', () => {
      this.回调.展示批量修改标签()
    })
    this.菜单元素.appendChild(修改标签)

    this.菜单元素.appendChild(this.创建分割线())

    // 分组 4: 全选
    let 全选 = this.创建菜单项('全选', () => {
      this.回调.全选()
    })
    this.菜单元素.appendChild(全选)

    this.菜单元素.appendChild(this.创建分割线())

    // 分组 5: 危险操作
    let 屏蔽 = this.创建菜单项(
      '屏蔽',
      async () => {
        let 确认 = await 显示确认对话框(`确定要屏蔽选中的 ${选中的数量} 个仓库吗？\n屏蔽后不再显示，且同步时会跳过。`)
        if (确认) {
          let ids = Array.from(选中的IDs)
          try {
            await API管理器.请求postJson并处理错误('/api/project/repo/ignore', { ids })
            成功提示('屏蔽成功')
            this.回调.从界面移除卡片(ids)
            this.回调.清空选中()
          } catch (_e) {
            // 错误已被 api manager 拦截并提示
          }
        }
      },
      true,
    )
    this.菜单元素.appendChild(屏蔽)

    let 删除 = this.创建菜单项(
      '删除',
      async () => {
        let 结果 = await 显示删除确认对话框(`确定要删除选中的 ${选中的数量} 个仓库吗？\n删除后不可恢复。`)
        if (结果.确认) {
          let 有失败 = false
          let 成功的IDs: string[] = []
          for (let id of 选中的IDs) {
            try {
              await API管理器.请求postJson并处理错误('/api/project/repo/delete', {
                id,
                deleteRemote: 结果.同步删除远程,
              })
              成功的IDs.push(id)
            } catch (_e) {
              有失败 = true
            }
          }
          if (成功的IDs.length > 0) {
            this.回调.从界面移除卡片(成功的IDs)
            this.回调.清空选中()
          }
          if (!有失败 && 成功的IDs.length > 0) {
            成功提示('删除成功')
          }
        }
      },
      true,
    )
    this.菜单元素.appendChild(删除)
  }
}
