import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { formatDate } from '../lib/utils';
import {
  Plus,
  Search,
  Copy,
  Trash2,
  FolderOpen,
  MapPin,
  Calendar,
  User,
  Loader2,
  Zap,
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    company: '',
    engineer: '',
    reference: '',
    location: '',
    notes: '',
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    setProjects((data as Project[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: newProject.name || 'Nouveau projet',
        client: newProject.client,
        company: newProject.company,
        engineer: newProject.engineer,
        reference: newProject.reference,
        location: newProject.location,
        notes: newProject.notes,
        date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();
    if (!error && data) {
      setCreateOpen(false);
      setNewProject({ name: '', client: '', company: '', engineer: '', reference: '', location: '', notes: '' });
      navigate(`/project/${data.id}`);
    }
  };

  const handleDuplicate = async (project: Project) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: `${project.name} (copie)`,
        client: project.client,
        company: project.company,
        engineer: project.engineer,
        reference: project.reference,
        location: project.location,
        notes: project.notes,
        margin_pct: project.margin_pct,
        date: project.date,
      })
      .select()
      .single();
    if (!error && data) {
      fetchProjects();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('projects').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchProjects();
  };

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenue, {user?.email?.split('@')[0] ?? 'Ingénieur'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouveau projet
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un projet..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Aucun projet</h3>
            <p className="text-sm text-muted-foreground">
              Créez votre premier projet BOM pour commencer.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Créer un projet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/30"
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold leading-tight">{project.name}</h3>
                      <p className="text-xs text-muted-foreground">{project.reference || '—'}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{project.margin_pct}%</Badge>
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                  {project.client && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span className="truncate">{project.client}</span>
                    </div>
                  )}
                  {project.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{project.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(project.date)}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(project);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Dupliquer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(project);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>
              Renseignez les informations du projet. Vous pourrez les modifier plus tard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-name">Nom du projet *</Label>
              <Input
                id="p-name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Centrale solaire 500kWc"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-ref">Référence</Label>
              <Input
                id="p-ref"
                value={newProject.reference}
                onChange={(e) => setNewProject({ ...newProject, reference: e.target.value })}
                placeholder="BE-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-client">Client</Label>
              <Input
                id="p-client"
                value={newProject.client}
                onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                placeholder="Nom du client"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-company">Société</Label>
              <Input
                id="p-company"
                value={newProject.company}
                onChange={(e) => setNewProject({ ...newProject, company: e.target.value })}
                placeholder="Nom de la société"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-engineer">Ingénieur</Label>
              <Input
                id="p-engineer"
                value={newProject.engineer}
                onChange={(e) => setNewProject({ ...newProject, engineer: e.target.value })}
                placeholder="Nom de l'ingénieur"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-location">Localisation</Label>
              <Input
                id="p-location"
                value={newProject.location}
                onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                placeholder="Paris, France"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-notes">Notes</Label>
              <Textarea
                id="p-notes"
                value={newProject.notes}
                onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
                placeholder="Notes techniques..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate}>Créer le projet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le projet</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer « {deleteTarget?.name} » ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
