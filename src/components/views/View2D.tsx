import type { Block, Panel } from '../../types';
import { calculateBlock } from '../../lib/calculations';

interface Props {
  blocks: Block[];
  panels: Panel[];
}

export function View2D({ blocks, panels }: Props) {
  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        const panel = panels.find((p) => p.id === block.panel_id) ?? null;
        const calc = calculateBlock(block, panel);
        if (!panel) {
          return (
            <div key={block.id} className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {block.name} — Aucun panneau sélectionné
            </div>
          );
        }

        const isPortrait = block.orientation === 'portrait';
        const panelW = isPortrait ? panel.width_mm : panel.length_mm;
        const panelH = isPortrait ? panel.length_mm : panel.width_mm;
        const hSpacing = block.horizontal_spacing;
        const vSpacing = block.vertical_spacing;

        const blockWidth = block.columns * panelW + (block.columns - 1) * hSpacing;
        const blockHeight = block.rows * panelH + (block.rows - 1) * vSpacing;

        const padding = 80;
        const scale = Math.min(1, (800 - padding * 2) / Math.max(blockWidth, 1));
        const svgWidth = blockWidth * scale + padding * 2;
        const svgHeight = blockHeight * scale + padding * 2;

        return (
          <div key={block.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{block.name}</h3>
              <span className="text-xs text-muted-foreground">
                {block.columns}×{block.rows} · {calc.moduleCount} modules · {(blockWidth / 1000).toFixed(2)}m × {(blockHeight / 1000).toFixed(2)}m
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-card p-4">
              <svg width={svgWidth} height={svgHeight} className="mx-auto">
                {/* Purlins */}
                {Array.from({ length: block.num_purlins }).map((_, i) => {
                  const purlinSpacing = block.purlin_spacing * scale;
                  const totalDepth = (block.num_purlins - 1) * purlinSpacing;
                  const py = padding + (blockHeight * scale - totalDepth) / 2 + i * purlinSpacing;
                  return (
                    <line
                      key={`purlin-${i}`}
                      x1={padding - 20}
                      y1={py}
                      x2={padding + blockWidth * scale + 20}
                      y2={py}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                    />
                  );
                })}

                {/* Rails */}
                {Array.from({ length: block.num_rails }).map((_, r) => {
                  const railSpacing = (blockHeight * scale) / block.num_rails;
                  const y = padding + (r + 0.5) * railSpacing;
                  const railLength = calc.railLength * scale;
                  const railX = padding - (block.rail_overhang_left * scale);
                  return (
                    <g key={`rail-${r}`}>
                      <line
                        x1={railX}
                        y1={y}
                        x2={railX + railLength}
                        y2={y}
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                      />
                      {/* End clamps */}
                      <rect x={railX - 2} y={y - 4} width={4} height={8} fill="hsl(var(--warning))" />
                      <rect x={railX + railLength - 2} y={y - 4} width={4} height={8} fill="hsl(var(--warning))" />
                    </g>
                  );
                })}

                {/* Panels */}
                {Array.from({ length: block.rows }).map((_, row) =>
                  Array.from({ length: block.columns }).map((_, col) => {
                    const x = padding + col * (panelW + hSpacing) * scale;
                    const y = padding + row * (panelH + vSpacing) * scale;
                    const w = panelW * scale;
                    const h = panelH * scale;
                    return (
                      <g key={`panel-${row}-${col}`}>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="hsl(199 89% 48% / 0.15)"
                          stroke="hsl(var(--primary))"
                          strokeWidth={1}
                          rx={2}
                        />
                        {/* Panel cells representation */}
                        {isPortrait && (
                          <g>
                            {Array.from({ length: 6 }).map((_, ci) => (
                              <line
                                key={`cell-${ci}`}
                                x1={x + 2}
                                y1={y + ((ci + 1) * h) / 7}
                                x2={x + w - 2}
                                y2={y + ((ci + 1) * h) / 7}
                                stroke="hsl(var(--primary) / 0.2)"
                                strokeWidth={0.5}
                              />
                            ))}
                          </g>
                        )}
                        {/* Mid clamps between panels */}
                        {col < block.columns - 1 && (
                          <rect
                            x={x + w + (hSpacing * scale) / 2 - 1.5}
                            y={y - 2}
                            width={3}
                            height={h + 4}
                            fill="hsl(var(--destructive))"
                            rx={1}
                          />
                        )}
                      </g>
                    );
                  }),
                )}

                {/* L-Foot markers */}
                {Array.from({ length: block.num_purlins }).map((_, p) =>
                  Array.from({ length: block.num_rails }).map((_, r) => {
                    const purlinSpacing = block.purlin_spacing * scale;
                    const totalDepth = (block.num_purlins - 1) * purlinSpacing;
                    const py = padding + (blockHeight * scale - totalDepth) / 2 + p * purlinSpacing;
                    const px = padding - (block.rail_overhang_left * scale) + 20 + (p / Math.max(1, block.num_purlins - 1)) * (calc.railLength * scale - 40);
                    return (
                      <circle
                        key={`lfoot-${p}-${r}`}
                        cx={px}
                        cy={py}
                        r={3}
                        fill="hsl(var(--success))"
                      />
                    );
                  }),
                )}

                {/* Dimensions */}
                <text
                  x={padding + (blockWidth * scale) / 2}
                  y={padding - 25}
                  textAnchor="middle"
                  className="fill-foreground text-xs font-medium"
                >
                  {(blockWidth / 1000).toFixed(2)} m
                </text>
                <text
                  x={padding - 40}
                  y={padding + (blockHeight * scale) / 2}
                  textAnchor="middle"
                  className="fill-foreground text-xs font-medium"
                  transform={`rotate(-90, ${padding - 40}, ${padding + (blockHeight * scale) / 2})`}
                >
                  {(blockHeight / 1000).toFixed(2)} m
                </text>
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}
