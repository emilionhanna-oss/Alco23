import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { buildApiUrl } from '../config/api.config';
import { PencilLine, Trash2, Plus, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

interface Sede {
  id: number;
  nombre: string;
  region: string;
}

export default function AdminSedes() {
  const navigate = useNavigate();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSede, setEditingSede] = useState<Partial<Sede>>({});

  const fetchSedes = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/sedes'));
      const data = await res.json();
      setSedes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSedes();
  }, []);

  const handleSave = async () => {
    if (!editingSede.nombre) return alert('El nombre es obligatorio');
    const token = localStorage.getItem('token') || '';
    const method = editingSede.id ? 'PUT' : 'POST';
    const url = editingSede.id ? `/api/sedes/${editingSede.id}` : '/api/sedes';

    try {
      const res = await fetch(buildApiUrl(url), {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editingSede)
      });
      if (!res.ok) throw new Error('Error guardando sede');
      setIsModalOpen(false);
      fetchSedes();
    } catch (err) {
      alert('Error guardando sede');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar esta sede? Puede que haya usuarios asignados a ella.')) return;
    const token = localStorage.getItem('token') || '';
    try {
      const res = await fetch(buildApiUrl(`/api/sedes/${id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error eliminando sede');
      fetchSedes();
    } catch (err) {
      alert('Error eliminando sede');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Volver
            </Button>
            <h1 className="text-2xl font-bold">Gestión de Sedes</h1>
          </div>
          <Button onClick={() => { setEditingSede({}); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Nueva Sede
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre de la Sede</TableHead>
                  <TableHead>Región</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-4">Cargando...</TableCell></TableRow>
                ) : sedes.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-4">No hay sedes registradas</TableCell></TableRow>
                ) : (
                  sedes.map(sede => (
                    <TableRow key={sede.id}>
                      <TableCell className="font-medium">{sede.nombre}</TableCell>
                      <TableCell>{sede.region || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingSede(sede); setIsModalOpen(true); }}>
                          <PencilLine className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(sede.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSede.id ? 'Editar Sede' : 'Nueva Sede'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de la Sede</Label>
              <Input value={editingSede.nombre || ''} onChange={(e) => setEditingSede({ ...editingSede, nombre: e.target.value })} placeholder="Ej: Sede Norte" />
            </div>
            <div className="space-y-2">
              <Label>Región (Opcional)</Label>
              <Input value={editingSede.region || ''} onChange={(e) => setEditingSede({ ...editingSede, region: e.target.value })} placeholder="Ej: RM" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
