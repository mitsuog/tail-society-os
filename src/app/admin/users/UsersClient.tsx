'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Key, Trash2, UserCog, ShieldAlert } from 'lucide-react';
import { toast } from "sonner";
import { adminCreateUser, adminResetPassword, adminDeleteUser } from '@/app/actions/admin-auth';

export default function UsersClient() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [passLoading, setPassLoading] = useState(false);

  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: 'employee' });
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Error cargando usuarios");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async () => {
    if(!formData.email || !formData.password || !formData.fullName) return toast.error("Completa todos los campos");
    
    setPassLoading(true);
    try {
      const data = new FormData();
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('fullName', formData.fullName);
      data.append('role', formData.role);

      const res = await adminCreateUser(data); 

      if (!res.success) {
        toast.error(res.error); 
      } else {
        toast.success("Usuario creado exitosamente");
        setIsCreateOpen(false);
        setFormData({ fullName: '', email: '', password: '', role: 'employee' });
        fetchUsers();
      }
    } catch (e: any) {
      toast.error("Error de conexión");
    } finally {
      setPassLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if(!newPassword || newPassword.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    
    setPassLoading(true);
    try {
      const res = await adminResetPassword(selectedUser.id, newPassword);

      if (!res.success) {
        toast.error(res.error);
      } else {
        toast.success(`Contraseña actualizada para ${selectedUser.full_name}`);
        setIsResetOpen(false);
        setNewPassword('');
      }
    } catch (e: any) {
      toast.error("Error de conexión");
    } finally {
      setPassLoading(false);
    }
  };

  const handleDelete = async (user: any) => {
    if(!confirm(`¿Estás seguro de eliminar a ${user.full_name}?`)) return;
    
    try {
        const res = await adminDeleteUser(user.id);

        if (!res.success) {
            toast.error(res.error);
        } else {
            toast.success("Usuario eliminado");
            fetchUsers();
        }
    } catch (e: any) {
        toast.error("Error de conexión");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
        <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <UserCog className="h-6 w-6 text-slate-700"/> Gestión de Usuarios
            </h1>
            <p className="text-slate-500">Administra accesos y contraseñas del sistema</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 text-white hover:bg-slate-800">
                    <Plus className="mr-2 h-4 w-4"/> Nuevo Usuario
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Nombre Completo</Label>
                        <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Ej. Juan Pérez" />
                    </div>
                    <div className="space-y-2">
                        <Label>Correo Electrónico</Label>
                        <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="juan@tailsociety.mx" type="email" />
                    </div>
                    <div className="space-y-2">
                        <Label>Contraseña Inicial</Label>
                        <Input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div className="space-y-2">
                        <Label>Rol de Sistema</Label>
                        <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="employee">Empleado (Staff)</SelectItem>
                                <SelectItem value="receptionist">Recepción</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreateUser} disabled={passLoading}>
                        {passLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Crear Usuario
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>ID de Sistema</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">Cargando...</TableCell>
                    </TableRow>
                ) : users.map(user => (
                    <TableRow key={user.id}>
                        <TableCell className="font-medium text-slate-900">{user.full_name || 'Sin Nombre'}</TableCell>
                        <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : user.role === 'receptionist' ? 'secondary' : 'outline'}>
                                {user.role === 'admin' ? 'Administrador' : user.role === 'receptionist' ? 'Recepción' : 'Staff'}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{user.id}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button 
                                    size="sm" variant="outline" 
                                    onClick={() => { setSelectedUser(user); setIsResetOpen(true); }}
                                    title="Cambiar Contraseña"
                                >
                                    <Key className="h-4 w-4 text-orange-600"/>
                                </Button>
                                <Button 
                                    size="sm" variant="ghost" 
                                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => handleDelete(user)}
                                >
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </div>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-orange-500"/> Cambiar Contraseña
                </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
                <p className="text-sm text-slate-600">
                    Estás a punto de cambiar la contraseña para <strong>{selectedUser?.full_name}</strong>.
                    La nueva contraseña será efectiva inmediatamente.
                </p>
                <div className="space-y-2">
                    <Label>Nueva Contraseña</Label>
                    <Input 
                        type="text" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Escribe la nueva contraseña..."
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsResetOpen(false)}>Cancelar</Button>
                <Button onClick={handleResetPassword} disabled={passLoading} className="bg-orange-600 hover:bg-orange-700 text-white">
                    {passLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Actualizar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}