import { NetCoreExportType } from '@lsby/net-core'

export type FcaTreeNodeData = {
  id: string
  name?: string | undefined
  children: FcaTreeNodeData[]
  objectCount: number
  hasChildren?: boolean | undefined
}

type 导出 = NetCoreExportType<'FcaTreeNodeData', FcaTreeNodeData>
export default 导出
