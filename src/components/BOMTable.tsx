import type { BOMLine } from '../types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface Props {
  bom: BOMLine[];
  marginPct: number;
}

export function BOMTable({ bom, marginPct }: Props) {
  const totalItems = bom.reduce((s, l) => s + l.quantityFinal, 0);

  const categoryColors: Record<string, string> = {
    module: 'default',
    rail: 'secondary',
    accessory: 'outline',
    cable: 'warning',
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-semibold">Désignation</th>
                <th className="px-4 py-3 text-left font-semibold">Référence</th>
                <th className="px-4 py-3 text-left font-semibold">Fabricant</th>
                <th className="px-4 py-3 text-center font-semibold">Unité</th>
                <th className="px-4 py-3 text-right font-semibold">Qté calculée</th>
                <th className="px-4 py-3 text-center font-semibold">Marge</th>
                <th className="px-4 py-3 text-right font-semibold">Qté finale</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((line, i) => (
                <tr
                  key={i}
                  className="border-b border-border transition-colors hover:bg-secondary/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={categoryColors[line.category] as 'default' | 'secondary' | 'outline' | 'warning'}>
                        {line.category === 'module' ? 'Module' : line.category === 'rail' ? 'Rail' : line.category === 'cable' ? 'Câble' : 'Accessoire'}
                      </Badge>
                      <span className="font-medium">{line.designation}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{line.reference || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{line.manufacturer || '—'}</td>
                  <td className="px-4 py-3 text-center">{line.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{line.quantityCalculated.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-center">
                    {line.hasMargin ? (
                      <Badge variant="success">+{marginPct}%</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{line.quantityFinal.toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-secondary/50">
                <td colSpan={5} className="px-4 py-3 font-semibold text-right">
                  Total articles :
                </td>
                <td className="px-4 py-3 text-center font-bold">{totalItems.toLocaleString('fr-FR')}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
