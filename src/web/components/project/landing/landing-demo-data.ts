export type 仓库 = { id: string; name: string; tags: string[] }
export type 剧本步骤 = { 解说: string; 仓库状态: 仓库[] }

export let 演示剧本: 剧本步骤[] = [
  {
    解说: '欢迎体验 Git-Tag！我们准备了四个示例项目（Vue.js、React、VS Code、Electron）。当前未标记任何标签，系统只生成了一个包含全部项目的根节点。点击“下一步”开始体验标签的演进过程。',
    仓库状态: [
      { id: 'repo1', name: 'Vue.js', tags: [] },
      { id: 'repo2', name: 'React', tags: [] },
      { id: 'repo3', name: 'VS Code', tags: [] },
      { id: 'repo4', name: 'Electron', tags: [] },
    ],
  },
  {
    解说: '首先，我们给 Vue.js 和 React 标记上“前端开发”。观察左侧的格图，系统自动识别出“前端开发”这一概念并创建了对应节点。',
    仓库状态: [
      { id: 'repo1', name: 'Vue.js', tags: ['前端开发'] },
      { id: 'repo2', name: 'React', tags: ['前端开发'] },
      { id: 'repo3', name: 'VS Code', tags: [] },
      { id: 'repo4', name: 'Electron', tags: [] },
    ],
  },
  {
    解说: '接下来，我们给 VS Code 和 Electron 标记上“桌面应用”。现在，格图中自动分化出“前端开发”与“桌面应用”两个平行的分类领域。',
    仓库状态: [
      { id: 'repo1', name: 'Vue.js', tags: ['前端开发'] },
      { id: 'repo2', name: 'React', tags: ['前端开发'] },
      { id: 'repo3', name: 'VS Code', tags: ['桌面应用'] },
      { id: 'repo4', name: 'Electron', tags: ['桌面应用'] },
    ],
  },
  {
    解说: '然后，我们为 Vue.js、React 和 VS Code 添加“TypeScript”标签。请注意，由于 VS Code 同时具有“桌面应用”与“TypeScript”属性，你可以通过“桌面应用->TypeScript”和“TypeScript->桌面应用”两条路径找到它！',
    仓库状态: [
      { id: 'repo1', name: 'Vue.js', tags: ['前端开发', 'TypeScript'] },
      { id: 'repo2', name: 'React', tags: ['前端开发', 'TypeScript'] },
      { id: 'repo3', name: 'VS Code', tags: ['桌面应用', 'TypeScript'] },
      { id: 'repo4', name: 'Electron', tags: ['桌面应用'] },
    ],
  },
  {
    解说: '最后，我们为 Electron 也标记“TypeScript”，并为 Vue.js 和 React 补充“UI框架”。此时由于所有项目都使用了 TypeScript，该属性会自动升级为最顶层的共享共性节点！总之，无论您如何打标签，系统都能自动计算出最合理的结构，为您建立秩序。',
    仓库状态: [
      { id: 'repo1', name: 'Vue.js', tags: ['前端开发', 'TypeScript', 'UI框架'] },
      { id: 'repo2', name: 'React', tags: ['前端开发', 'TypeScript', 'UI框架'] },
      { id: 'repo3', name: 'VS Code', tags: ['桌面应用', 'TypeScript'] },
      { id: 'repo4', name: 'Electron', tags: ['桌面应用', 'TypeScript'] },
    ],
  },
]
