import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Panel, Component, ComponentType } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, type TabItem } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  Loader2,
  Sun,
  Wrench,
} from 'lucide-react';

const COMPONENT_TYPES: ComponentType[] = [
  'Rail', 'Rail Splice', 'Mid Clamp', 'End Clamp', 'L-Foot',
  'Hook', 'Screw', 'Bolt', 'Washer', 'Nut',
  'Rail End Cap', 'Earthing Clip', 'Earthing Lug', 'Ground Kit',
  'Cable Clip', 'Cable Tray', 'Cable Tray Connector',
];

const MANUFACTURERS = ['K2 Systems', 'Schletter', 'Clenergy', 'Renusol', 'Esdec', 'Unirac'];
const PANEL_MANUFACTURERS = ['JA Solar', 'Jinko Solar', 'LONGi', 'Trina Solar', 'Canadian Solar'];

export function LibraryPage() {
  const [tab, setTab] = useState('panels');
  const [panels, setPanels] = useState<Panel[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editPanel, setEditPanel] = useState<Partial<Panel> | null>(null);
  const [editComponent, setEditComponent] = useState<Partial<Component> | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: panelData }, { data: compData }] = await Promise.all([
      supabase.from('panels').select('*').order('manufacturer'),
      supabase.from('components').select('*').order('manufacturer'),
    ]);
    setPanels((panelData as Panel[]) ?? []);
    setComponents((compData as Component[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const savePanel = async () => {
    if (!editPanel) return;
    if (editPanel.id) {
      await supabase.from('panels').update({
        manufacturer: editPanel.manufacturer,
        model: editPanel.model,
        power_w: editPanel.power_w,
        length_mm: editPanel.length_mm,
        width_mm: editPanel.width_mm,
        thickness_mm: editPanel.thickness_mm,
        weight_kg: editPanel.weight_kg,
      }).eq('id', editPanel.id);
    } else {
      await supabase.from('panels').insert({
        manufacturer: editPanel.manufacturer || 'Custom',
        model: editPanel.model || 'Custom',
        power_w: editPanel.power_w || 400,
        length_mm: editPanel.length_mm || 2000,
        width_mm: editPanel.width_mm || 1000,
        thickness_mm: editPanel.thickness_mm || 35,
        weight_kg: editPanel.weight_kg || 22,
        is_custom: true,
      });
    }
    setEditPanel(null);
    fetchAll();
  };

  const saveComponent = async () => {
    if (!editComponent) return;
    if (editComponent.id) {
      await supabase.from('components').update({
        manufacturer: editComponent.manufacturer,
        type: editComponent.type,
        reference: editComponent.reference,
        designation: editComponent.designation,
        unit: editComponent.unit,
      }).eq('id', editComponent.id);
    } else {
      await supabase.from('components').insert({
        manufacturer: editComponent.manufacturer || 'Custom',
        type: editComponent.type || 'Rail',
        reference: editComponent.reference || '',
        designation: editComponent.designation || '',
        unit: editComponent.unit || 'pcs',
        is_custom: true,
      });
    }
    setEditComponent(null);
    fetchAll();
  };

  const deletePanel = async (id: string) => {
    await supabase.from('panels').delete().eq('id', id);
    fetchAll();
  };

  const deleteComponent = async (id: string) => {
    await supabase.from('components').delete().eq('id', id);
    fetchAll();
  };

  const filteredPanels = panels.filter(
    (p) =>
      p.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      p.model.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredComponents = components.filter(
    (c) =>
      c.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      c.designation.toLowerCase().includes(search.toLowerCase()) ||
      c.reference.toLowerCase().includes(search.toLowerCase()),
  );

  const tabItems: TabItem[] = [
    { value: 'panels', label: 'Panneaux PV', icon: <Sun className="h-4 w-4" /> },
    { value: 'components', label: 'Composants', icon: <Wrench className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bibliothèque</h1>
          <p className="text-sm text-muted-foreground">
            Gestion des panneaux et composants
          </p>
        </div>
      </div>

      <Tabs items={tabItems} value={tab} onValueChange={setTab} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tab === 'panels' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setEditPanel({ manufacturer: PANEL_MANUFACTURERS[0], power_w: 450, length_mm: 2000, width_mm: 1000, thickness_mm: 35, weight_kg: 22 })}>
              <Plus className="h-4 w-4" />
              Ajouter un panneau
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPanels.map((panel) => (
              <Card key={panel.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{panel.manufacturer}</h3>
                        {panel.is_custom && <Badge variant="secondary">Custom</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{panel.model}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" onClick={() => setEditPanel(panel)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deletePanel(panel.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Spec label="Puissance" value={`${panel.power_w} W`} />
                    <Spec label="Poids" value={`${panel.weight_kg} kg`} />
                    <Spec label="Dimensions" value={`${panel.length_mm}×${panel.width_mm}mm`} />
                    <Spec label="Épaisseur" value={`${panel.thickness_mm}mm`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setEditComponent({ manufacturer: MANUFACTURERS[0], type: 'Rail', unit: 'pcs' })}>
              <Plus className="h-4 w-4" />
              Ajouter un composant
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-4 py-3 text-left font-semibold">Fabricant</th>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Référence</th>
                      <th className="px-4 py-3 text-left font-semibold">Désignation</th>
                      <th className="px-4 py-3 text-center font-semibold">Unité</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComponents.map((comp) => (
                      <tr key={comp.id} className="border-b border-border transition-colors hover:bg-secondary/30">
                        <td className="px-4 py-3 font-medium">{comp.manufacturer}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{comp.type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{comp.reference}</td>
                        <td className="px-4 py-3">{comp.designation}</td>
                        <td className="px-4 py-3 text-center">{comp.unit}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setEditComponent(comp)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteComponent(comp.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Panel Dialog */}
      <Dialog open={!!editPanel} onOpenChange={() => setEditPanel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPanel?.id ? 'Modifier le panneau' : 'Nouveau panneau'}</DialogTitle>
            <DialogDescription>Renseignez les caractéristiques du panneau.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fabricant</Label>
              <Select
                value={editPanel?.manufacturer ?? ''}
                onChange={(e) => setEditPanel({ ...editPanel!, manufacturer: e.target.value })}
              >
                {PANEL_MANUFACTURERS.map((m) => <option key={m} value={m}>{m}</option>)}
                <option value="Custom">Personnalisé</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modèle</Label>
              <Input value={editPanel?.model ?? ''} onChange={(e) => setEditPanel({ ...editPanel!, model: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Puissance (W)</Label>
              <Input type="number" value={editPanel?.power_w ?? ''} onChange={(e) => setEditPanel({ ...editPanel!, power_w: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input type="number" value={editPanel?.weight_kg ?? ''} onChange={(e) => setEditPanel({ ...editPanel!, weight_kg: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Longueur (mm)</Label>
              <Input type="number" value={editPanel?.length_mm ?? ''} onChange={(e) => setEditPanel({ ...editPanel!, length_mm: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Largeur (mm)</Label>
              <Input type="number" value={editPanel?.width_mm ?? ''} onChange={(e) => setEditPanel({ ...editPanel!, width_mm: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Épaisseur (mm)</Label>
              <Input type="number" value={editPanel?.thickness_mm ?? ''} onChange={(e) => setEditPanel({ ...editPanel!, thickness_mm: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPanel(null)}>Annuler</Button>
            <Button onClick={savePanel}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Component Dialog */}
      <Dialog open={!!editComponent} onOpenChange={() => setEditComponent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editComponent?.id ? 'Modifier le composant' : 'Nouveau composant'}</DialogTitle>
            <DialogDescription>Renseignez les caractéristiques du composant.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fabricant</Label>
              <Select
                value={editComponent?.manufacturer ?? ''}
                onChange={(e) => setEditComponent({ ...editComponent!, manufacturer: e.target.value })}
              >
                {MANUFACTURERS.map((m) => <option key={m} value={m}>{m}</option>)}
                <option value="Custom">Personnalisé</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={editComponent?.type ?? ''}
                onChange={(e) => setEditComponent({ ...editComponent!, type: e.target.value as ComponentType })}
              >
                {COMPONENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input value={editComponent?.reference ?? ''} onChange={(e) => setEditComponent({ ...editComponent!, reference: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Unité</Label>
              <Input value={editComponent?.unit ?? ''} onChange={(e) => setEditComponent({ ...editComponent!, unit: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Désignation</Label>
              <Input value={editComponent?.designation ?? ''} onChange={(e) => setEditComponent({ ...editComponent!, designation: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditComponent(null)}>Annuler</Button>
            <Button onClick={saveComponent}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
