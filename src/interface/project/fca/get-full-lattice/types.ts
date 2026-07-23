import { NetCoreExportType } from '@lsby/net-core'

export type FcaLatticeNode = { id: string; intent: string[]; extentCount: number; label: string }

export type FcaLatticeEdge = { from: string; to: string }

export type FcaLatticeData = {
  nodes: { id: string; intent: string[]; extentCount: number; label: string }[]
  edges: { from: string; to: string }[]
}

type 导出 = NetCoreExportType<'FcaLatticeData', FcaLatticeData>
export default 导出
