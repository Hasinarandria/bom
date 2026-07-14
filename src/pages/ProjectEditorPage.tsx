import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Project, Block, Panel } from '../types';
import { calculateProject } from '../lib/calculations';
import { exportExcel, exportPDF, exportCSV } from '../lib/exports';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, type TabItem } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { BOMTable } from '../components/BOMTable';
import { View2D } from '../components/views/View2D';
import { View3D } from '../components/views/View3D';
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileText,
  FileDown,
  Loader2,
  Copy,
  Zap,
  Layers,
  Settings2,
  Table,
  Box,
  Eye,
} from 'lucide-react';

const ROOF_TYPES: { value: string; label: string }[] = [
  { value: 'bac_acier', label: 'Bac acier' },
  { value: 'tole_trapezoidale', label: 'Tôle trapézoïdale' },
  { value: 'tuile', label: 'Tuile' },
  { value: 'terrasse', label: 'Terrasse' },
  { value: 'sol', label: 'Sol' },
];

const RAIL_LENGTHS = [2100, 3870, 4200, 5400, 6000];

export function ProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('blocks');
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: projData }, { data: blockData }, { data: panelData }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).maybeSingle(),
      supabase.from('blocks').select('*').eq('project_id', id).order('created_at'),
      supabase.from('panels').select('*').order('manufacturer'),
    ]);
    setProject(projData as Project | null);
    setBlocks((blockData as Block[]) ?? []);
    setPanels((panelData as Panel[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-save
  const scheduleSave = useCallback(
    (updates: Partial<Project>) => {
      if (!project) return;
      const updated = { ...project, ...updates };
      setProject(updated);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        await supabase.from('projects').update({
          ...updates,
          updated_at: new Date().toISOString(),
        }).eq('id', project.id);
        setSaving(false);
      }, 1000);
    },
    [project],
  );

  const updateBlock = useCallback(
    async (blockId: string, updates: Partial<Block>) => {
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b)));
      await supabase.from('blocks').update(updates).eq('id', blockId);
    },
    [],
  );

  const addBlock = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('blocks')
      .insert({
        project_id: id,
        name: `Bloc ${blocks.length + 1}`,
        columns: 2,
        rows: 1,
        orientation: 'portrait',
        roof_type: 'bac_acier',
        num_purlins: 3,
        purlin_spacing: 1000,
        screws_per_lfoot: 2,
        num_rails: 2,
        rail_overhang_left: 300,
        rail_overhang_right: 300,
        horizontal_spacing: 20,
        vertical_spacing: 20,
        commercial_rail_length: 2100,
      })
      .select()
      .single();
    if (!error && data) {
      setBlocks((prev) => [...prev, data as Block]);
      setExpandedBlockId(data.id);
    }
  };

  const duplicateBlock = async (block: Block) => {
    const { data, error } = await supabase
      .from('blocks')
      .insert({
        project_id: block.project_id,
        name: `${block.name} (copie)`,
        columns: block.columns,
        rows: block.rows,
        orientation: block.orientation,
        panel_id: block.panel_id,
        roof_type: block.roof_type,
        num_purlins: block.num_purlins,
        purlin_spacing: block.purlin_spacing,
        screws_per_lfoot: block.screws_per_lfoot,
        num_rails: block.num_rails,
        rail_overhang_left: block.rail_overhang_left,
        rail_overhang_right: block.rail_overhang_right,
        horizontal_spacing: block.horizontal_spacing,
        vertical_spacing: block.vertical_spacing,
        commercial_rail_length: block.commercial_rail_length,
      })
      .select()
      .single();
    if (!error && data) {
      setBlocks((prev) => [...prev, data as Block]);
    }
  };

  const deleteBlock = async (blockId: string) => {
    await supabase.from('blocks').delete().eq('id', blockId);
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    if (expandedBlockId === blockId) setExpandedBlockId(null);
  };

  const calc = project
    ? calculateProject(blocks, panels, project.margin_pct)
    : null;

  const tabItems: TabItem[] = [
    { value: 'blocks', label: 'Blocs', icon: <Layers className="h-4 w-4" /> },
    { value: 'bom', label: 'BOM', icon: <Table className="h-4 w-4" /> },
    { value: 'view2d', label: 'Vue 2D', icon: <Eye className="h-4 w-4" /> },
    { value: 'view3d', label: 'Vue 3D', icon: <Box className="h-4 w-4" /> },
    { value: 'settings', label: 'Paramètres', icon: <Settings2 className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">Projet introuvable</p>
        <Button className="mt-4" onClick={() => navigate('/dashboard')}>
          Retour au dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              {saving && (
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sauvegarde...
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {project.reference || 'Sans référence'} · {blocks.length} bloc(s)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => calc && exportExcel(project, blocks, panels, calc)}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => calc && exportPDF(project, blocks, panels, calc)}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => calc && exportCSV(calc)}>
            <FileDown className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {calc && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Modules totaux</p>
                <p className="text-xl font-bold">{calc.totalModules}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Puissance totale</p>
                <p className="text-xl font-bold">{(calc.totalPower / 1000).toFixed(2)} kWc</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Table className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Longueur rails</p>
                <p className="text-xl font-bold">{(calc.totalRailLength / 1000).toFixed(1)} m</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Articles BOM</p>
                <p className="text-xl font-bold">{calc.bom.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs items={tabItems} value={activeTab} onValueChange={setActiveTab} />

      {/* Blocks Tab */}
      {activeTab === 'blocks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Blocs photovoltaïques</h2>
            <Button onClick={addBlock}>
              <Plus className="h-4 w-4" />
              Ajouter un bloc
            </Button>
          </div>

          {blocks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">Aucun bloc. Ajoutez votre premier bloc pour commencer.</p>
                <Button className="mt-4" onClick={addBlock}>
                  <Plus className="h-4 w-4" />
                  Créer un bloc
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {blocks.map((block) => {
                const panel = panels.find((p) => p.id === block.panel_id);
                const blockCalc = calc?.blocks.find((bc) => bc.blockId === block.id);
                const isExpanded = expandedBlockId === block.id;
                return (
                  <Card key={block.id}>
                    <CardContent className="p-4">
                      <div
                        className="flex cursor-pointer items-center justify-between"
                        onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{block.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {block.columns}×{block.rows} · {blockCalc?.moduleCount ?? 0} modules ·{' '}
                              {panel ? `${panel.manufacturer} ${panel.model}` : 'Pas de panneau'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); duplicateBlock(block); }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Nom du bloc</Label>
                            <Input
                              value={block.name}
                              onChange={(e) => updateBlock(block.id, { name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Panneau</Label>
                            <Select
                              value={block.panel_id ?? ''}
                              onChange={(e) => updateBlock(block.id, { panel_id: e.target.value || null })}
                            >
                              <option value="">— Sélectionner —</option>
                              {panels.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.manufacturer} {p.model} ({p.power_w}W)
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Orientation</Label>
                            <Select
                              value={block.orientation}
                              onChange={(e) => updateBlock(block.id, { orientation: e.target.value as 'portrait' | 'landscape' })}
                            >
                              <option value="portrait">Portrait</option>
                              <option value="landscape">Paysage</option>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Colonnes</Label>
                            <Input
                              type="number"
                              min={1}
                              value={block.columns}
                              onChange={(e) => updateBlock(block.id, { columns: Math.max(1, parseInt(e.target.value) || 1) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Rangées</Label>
                            <Input
                              type="number"
                              min={1}
                              value={block.rows}
                              onChange={(e) => updateBlock(block.id, { rows: Math.max(1, parseInt(e.target.value) || 1) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Type de toiture</Label>
                            <Select
                              value={block.roof_type}
                              onChange={(e) => updateBlock(block.id, { roof_type: e.target.value as Block['roof_type'] })}
                            >
                              {ROOF_TYPES.map((rt) => (
                                <option key={rt.value} value={rt.value}>{rt.label}</option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Nombre de pannes</Label>
                            <Input
                              type="number"
                              min={1}
                              value={block.num_purlins}
                              onChange={(e) => updateBlock(block.id, { num_purlins: Math.max(1, parseInt(e.target.value) || 1) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Entraxe des pannes (mm)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={block.purlin_spacing}
                              onChange={(e) => updateBlock(block.id, { purlin_spacing: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Vis par L-Foot</Label>
                            <Input
                              type="number"
                              min={1}
                              value={block.screws_per_lfoot}
                              onChange={(e) => updateBlock(block.id, { screws_per_lfoot: Math.max(1, parseInt(e.target.value) || 1) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Nombre de rails</Label>
                            <Select
                              value={block.num_rails}
                              onChange={(e) => updateBlock(block.id, { num_rails: parseInt(e.target.value) })}
                            >
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Dépassement rail gauche (mm)</Label>
                            <Input
                              type="number"
                              value={block.rail_overhang_left}
                              onChange={(e) => updateBlock(block.id, { rail_overhang_left: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Dépassement rail droit (mm)</Label>
                            <Input
                              type="number"
                              value={block.rail_overhang_right}
                              onChange={(e) => updateBlock(block.id, { rail_overhang_right: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Espacement horizontal (mm)</Label>
                            <Input
                              type="number"
                              value={block.horizontal_spacing}
                              onChange={(e) => updateBlock(block.id, { horizontal_spacing: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Espacement vertical (mm)</Label>
                            <Input
                              type="number"
                              value={block.vertical_spacing}
                              onChange={(e) => updateBlock(block.id, { vertical_spacing: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Longueur commerciale rail (mm)</Label>
                            <Select
                              value={block.commercial_rail_length}
                              onChange={(e) => updateBlock(block.id, { commercial_rail_length: parseFloat(e.target.value) })}
                            >
                              {RAIL_LENGTHS.map((l) => (
                                <option key={l} value={l}>{l} mm</option>
                              ))}
                            </Select>
                          </div>

                          {blockCalc && (
                            <Card className="sm:col-span-2 lg:col-span-3 bg-secondary/30">
                              <CardContent className="p-4">
                                <h4 className="mb-3 text-sm font-semibold">Résultats du calcul</h4>
                                <div className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
                                  <CalcResult label="Modules" value={blockCalc.moduleCount} />
                                  <CalcResult label="Puissance" value={`${(blockCalc.totalPower / 1000).toFixed(2)} kWc`} />
                                  <CalcResult label="Long. rangée" value={`${(blockCalc.rowLength / 1000).toFixed(2)} m`} />
                                  <CalcResult label="Long. rail" value={`${(blockCalc.railLength / 1000).toFixed(2)} m`} />
                                  <CalcResult label="Nb rails" value={blockCalc.numRails} />
                                  <CalcResult label="Rails commerciaux" value={blockCalc.numCommercialRails} />
                                  <CalcResult label="Rail Splices" value={blockCalc.railSplices} />
                                  <CalcResult label="End Clamps" value={blockCalc.endClamps} />
                                  <CalcResult label="Mid Clamps" value={blockCalc.midClamps} />
                                  <CalcResult label="L-Foot" value={blockCalc.lFootCount} />
                                  <CalcResult label="Vis toiture" value={blockCalc.roofScrews} />
                                  <CalcResult label="Boulons" value={blockCalc.bolts} />
                                  <CalcResult label="Rondelles" value={blockCalc.washers} />
                                  <CalcResult label="Écrous" value={blockCalc.nuts} />
                                  <CalcResult label="Rail End Caps" value={blockCalc.railEndCaps} />
                                  <CalcResult label="Earthing Clips" value={blockCalc.earthingClips} />
                                  <CalcResult label="Earthing Lugs" value={blockCalc.earthingLugs} />
                                  <CalcResult label="Ground Kits" value={blockCalc.groundKits} />
                                  <CalcResult label="Cable Clips" value={blockCalc.cableClips} />
                                  <CalcResult label="Cable Tray" value={`${(blockCalc.cableTrayLength / 1000).toFixed(1)} m`} />
                                  <CalcResult label="CT Connecteurs" value={blockCalc.cableTrayConnectors} />
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BOM Tab */}
      {activeTab === 'bom' && calc && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Nomenclature (BOM)</h2>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Marge (%)</Label>
              <Input
                type="number"
                className="w-20"
                value={project.margin_pct}
                onChange={(e) => scheduleSave({ margin_pct: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <BOMTable bom={calc.bom} marginPct={project.margin_pct} />
        </div>
      )}

      {/* 2D View Tab */}
      {activeTab === 'view2d' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Visualisation 2D</h2>
          <View2D blocks={blocks} panels={panels} />
        </div>
      )}

      {/* 3D View Tab */}
      {activeTab === 'view3d' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Visualisation 3D</h2>
          <div className="h-[600px] rounded-lg border border-border">
            <View3D blocks={blocks} panels={panels} />
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Paramètres du projet</h2>
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom du projet</Label>
                  <Input value={project.name} onChange={(e) => scheduleSave({ name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Référence</Label>
                  <Input value={project.reference} onChange={(e) => scheduleSave({ reference: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Input value={project.client} onChange={(e) => scheduleSave({ client: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Société</Label>
                  <Input value={project.company} onChange={(e) => scheduleSave({ company: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Ingénieur</Label>
                  <Input value={project.engineer} onChange={(e) => scheduleSave({ engineer: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Localisation</Label>
                  <Input value={project.location} onChange={(e) => scheduleSave({ location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={project.date ?? ''}
                    onChange={(e) => scheduleSave({ date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marge (%)</Label>
                  <Input
                    type="number"
                    value={project.margin_pct}
                    onChange={(e) => scheduleSave({ margin_pct: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={project.notes}
                    onChange={(e) => scheduleSave({ notes: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function CalcResult({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
