import * as d3 from 'd3'

export interface ForceNode extends d3.SimulationNodeDatum {
  id: string
  intent: string[]
  extentCount: number
  label: string
  层级: number
  repos: string[]
}

export interface ForceLink extends d3.SimulationLinkDatum<ForceNode> {
  source: ForceNode
  target: ForceNode
}

export type LocalState = {
  zoom?: { x: number; y: number; k: number }
  nodes?: Record<string, { x: number; y: number }>
}
