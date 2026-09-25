'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d'
import type { Investigation, InvestigationEdge, InvestigationNode } from '@/lib/types'
import { MONEY_STATUS, NODE_TYPE_META, RELATIONSHIP_META, SEVERITY_COLOR, maxSeverity, severityRank } from '@/lib/graph-style'

type GNode = NodeObject<InvestigationNode>
type GLink = LinkObject<InvestigationNode, InvestigationEdge & { edge: InvestigationEdge }>

interface Props {
  investigation: Investigation
  selectedNodeId: string | null
  selectedEdge: InvestigationEdge | null
  onNodeSelect: (id: string) => void
  onEdgeSelect: (edge: InvestigationEdge) => void
  nodeLabel: (id: string) => string
}

export function InvestigationGraph({ investigation, selectedNodeId, selectedEdge, onNodeSelect, onEdgeSelect, nodeLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods<GNode, GLink> | undefined>(undefined)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoverEdge, setHoverEdge] = useState<InvestigationEdge | null>(null)
  const [fontFamily, setFontFamily] = useState('sans-serif')
  const [textColor, setTextColor] = useState('#1b2a41')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setFontFamily(getComputedStyle(document.body).fontFamily)
    setTextColor(getComputedStyle(document.body).color)
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Spread the layout so labels and link names stay readable on dense networks.
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    g.d3Force('charge')?.strength(-420)
    ;(g.d3Force('link') as unknown as { distance?: (d: number) => void } | undefined)?.distance?.(110)
    g.d3ReheatSimulation()
  }, [size.width > 0, investigation])

  const graphData = useMemo(
    () => ({
      // Pin the public-money node on the left so money reads left to right into the network.
      nodes: investigation.nodes.map((n) => (n.id === 'public-money' ? { ...n, fx: -320, fy: 0 } : { ...n })) as GNode[],
      links: investigation.edges.map((e) => ({ ...e, edge: e })) as GLink[],
    }),
    [investigation],
  )

  return (
    <div ref={containerRef} className="relative flex-1">
      {size.width > 0 && (
        <ForceGraph2D<InvestigationNode, InvestigationEdge & { edge: InvestigationEdge }>
          ref={graphRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTicks={120}
          d3VelocityDecay={0.3}
          onEngineStop={() => graphRef.current?.zoomToFit(400, 80)}
          nodeRelSize={6}
          nodeLabel={(n) => n.label}
          nodeCanvasObject={(node, ctx, scale) => {
            const sev = maxSeverity(node)
            const sanctioned = node.type === 'sanctioned_entity' || node.sayari_pass_through?.sanctioned === true
            const r = 7 + severityRank(sev) * 1.5
            const x = node.x ?? 0
            const y = node.y ?? 0

            if (node.id === selectedNodeId) {
              ctx.beginPath()
              ctx.arc(x, y, r + 8, 0, Math.PI * 2)
              ctx.fillStyle = 'rgba(242, 181, 68, 0.25)'
              ctx.fill()
            }
            if (sanctioned) {
              ctx.beginPath()
              ctx.arc(x, y, r + 4, 0, Math.PI * 2)
              ctx.strokeStyle = SEVERITY_COLOR.CRITICAL
              ctx.lineWidth = 2.5
              ctx.stroke()
            }

            if (node.type === 'public_money') {
              // The entry point: a large $ tile, coloured by what happened to the money.
              const st = MONEY_STATUS[node.details?.money_status ?? 'none']
              const R = 16
              ctx.beginPath()
              ctx.roundRect(x - R, y - R, R * 2, R * 2, 6)
              ctx.fillStyle = st.color
              ctx.fill()
              ctx.font = `800 ${R * 1.3}px ${fontFamily}`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = '#1b130f'
              ctx.fillText('$', x, y + 1)
              ctx.font = `700 ${Math.max(11 / scale, 3)}px ${fontFamily}`
              ctx.textBaseline = 'top'
              ctx.fillStyle = st.color
              ctx.fillText(st.label.toUpperCase(), x, y + R + 4)
              ctx.fillStyle = '#f7e9d7'
              ctx.fillText(node.label.length > 44 ? node.label.slice(0, 42) + '…' : node.label, x, y + R + 4 + Math.max(13 / scale, 3.5))
              return
            }

            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fillStyle = NODE_TYPE_META[node.type]?.color ?? '#c9ad93'
            ctx.fill()
            if (sev) {
              ctx.strokeStyle = SEVERITY_COLOR[sev]
              ctx.lineWidth = 2
              ctx.stroke()
            }

            const fontSize = Math.max(11 / scale, 3)
            ctx.font = `700 ${fontSize}px ${fontFamily}`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillStyle = textColor
            const label = node.label.length > 30 ? node.label.slice(0, 28) + '…' : node.label
            ctx.fillText(label, x, y + r + 6)
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.beginPath()
            ctx.arc(node.x ?? 0, node.y ?? 0, 14, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
          }}
          linkColor={(l) => (l.money_status ? MONEY_STATUS[l.money_status].color : RELATIONSHIP_META[l.relationship_type]?.color ?? '#c9ad93')}
          linkWidth={(l) => (l.edge === selectedEdge || l.edge === hoverEdge ? 5 : l.money_status ? 4 : l.shipments ? Math.min(1.5 + l.shipments / 40, 6) : 2)}
          linkLineDash={(l) => ((l.money_status ? MONEY_STATUS[l.money_status].dashed : RELATIONSHIP_META[l.relationship_type]?.dashed) ? [4, 3] : null)}
          linkDirectionalParticles={(l) => (l.money_status === 'paid' || l.money_status === 'potential' ? 4 : l.shipments ? 2 : 0)}
          linkDirectionalParticleWidth={3}
          linkDirectionalParticleColor={(l) => (l.money_status ? MONEY_STATUS[l.money_status].color : '#d98c3f')}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={0.9}
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={(link, ctx, scale) => {
            // Label every link with its relationship type, so connections read without hovering.
            const s = link.source as GNode
            const t = link.target as GNode
            if (typeof s !== 'object' || typeof t !== 'object' || scale < 0.6) return
            const meta = link.money_status ? MONEY_STATUS[link.money_status] : RELATIONSHIP_META[link.relationship_type]
            const text = link.shipments ? `${link.shipments} shipments` : link.ownership_percentage != null ? `${meta?.label ?? ''} ${Math.round(link.ownership_percentage)}%` : meta?.label ?? ''
            const x = ((s.x ?? 0) + (t.x ?? 0)) / 2
            const y = ((s.y ?? 0) + (t.y ?? 0)) / 2
            const fontSize = Math.max(8 / scale, 2)
            ctx.font = `600 ${fontSize}px ${fontFamily}`
            const w = ctx.measureText(text).width
            ctx.fillStyle = 'rgba(34, 24, 20, 0.85)'
            ctx.fillRect(x - w / 2 - 2, y - fontSize / 2 - 1, w + 4, fontSize + 2)
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = meta?.color ?? '#c9ad93'
            ctx.fillText(text, x, y)
          }}
          linkHoverPrecision={8}
          onNodeClick={(n) => onNodeSelect(String(n.id))}
          onLinkClick={(l) => onEdgeSelect(l.edge)}
          onLinkHover={(l) => setHoverEdge(l ? l.edge : null)}
        />
      )}

      {hoverEdge && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-xs rounded-2xl border border-border bg-background/95 p-3 text-xs shadow-lg">
          <p className="font-heading text-sm font-semibold text-accent">{RELATIONSHIP_META[hoverEdge.relationship_type]?.label ?? hoverEdge.relationship_type}</p>
          <p className="text-muted-foreground">
            {nodeLabel(hoverEdge.source)} {'→'} {nodeLabel(hoverEdge.target)}
          </p>
          {hoverEdge.label && <p className="pt-1 italic text-foreground">&ldquo;{hoverEdge.label}&rdquo;</p>}
          {hoverEdge.former && <p className="text-sev-medium">Former relationship</p>}
          {hoverEdge.ownership_percentage != null && <p>Ownership: {hoverEdge.ownership_percentage}%</p>}
          {hoverEdge.provenance_ref && <p className="truncate text-muted-foreground">{hoverEdge.provenance_ref}</p>}
          <p className="pt-1 text-muted-foreground">Click to pin details</p>
        </div>
      )}
    </div>
  )
}
