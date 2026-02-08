'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, DollarSign, Wallet, Building2, Percent } from "lucide-react";
import { toast } from "sonner";
import { updateEmployeeFinancials } from '@/app/actions/staff-actions';

interface StaffFinancialsDialogProps {
  employee: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function StaffFinancialsDialog({ employee, isOpen, onClose }: StaffFinancialsDialogProps) {
  const contract = employee.contracts?.find((c: any) => c.is_active) || {};
  const metadata = contract.metadata || {};

  // Estado inicial
  const [formData, setFormData] = useState({
    commission_type: employee.commission_type || 'total',
    participation_pct: employee.participation_pct || 0,
    salary_bank: metadata.bank_dispersion || contract.base_salary_weekly || 0,
    salary_cash: metadata.cash_difference || 0
  });

  const [saving, setSaving] = useState(false);

  // Calculado dinámico
  const totalWeekly = Number(formData.salary_bank) + Number(formData.salary_cash);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmployeeFinancials(employee.id, formData);
      toast.success("Esquema financiero actualizado");
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-green-100 rounded-full text-green-700">
                <DollarSign className="w-5 h-5" />
            </div>
            Esquema de Pago
          </DialogTitle>
          <DialogDescription>
            Configura el sueldo base y las comisiones de {employee.first_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          
          {/* SECCIÓN 1: SUELDO BASE */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-slate-500" /> Sueldo Base Semanal
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Dispersion Banco (Fiscal)</Label>
                    <div className="relative">
                        <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                            type="number" 
                            className="pl-9" 
                            value={formData.salary_bank}
                            onChange={(e) => setFormData({...formData, salary_bank: e.target.value})}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Diferencia Efectivo</Label>
                    <div className="relative">
                        <Wallet className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                            type="number" 
                            className="pl-9" 
                            value={formData.salary_cash}
                            onChange={(e) => setFormData({...formData, salary_cash: e.target.value})}
                        />
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Total Semanal (Base):</span>
                <span className="text-lg font-bold text-slate-900">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalWeekly)}
                </span>
            </div>
          </div>

          <Separator />

          {/* SECCIÓN 2: COMISIONES */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-slate-500" /> Esquema de Comisiones
            </h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Tipo de Pool</Label>
                    <Select 
                        value={formData.commission_type} 
                        onValueChange={(val) => setFormData({...formData, commission_type: val})}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="grooming">Grooming (Estética)</SelectItem>
                            <SelectItem value="total">Tienda Total (Recepción)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">% Participación del Pool</Label>
                    <div className="relative">
                        <span className="absolute right-3 top-2.5 text-sm text-slate-400">%</span>
                        <Input 
                            type="number" 
                            value={formData.participation_pct}
                            onChange={(e) => setFormData({...formData, participation_pct: e.target.value})}
                        />
                    </div>
                </div>
            </div>
            
            <p className="text-[11px] text-slate-500 bg-blue-50 p-2 rounded text-center">
                Este empleado recibirá el <b>{formData.participation_pct}%</b> del dinero acumulado en el pool de <b>{formData.commission_type === 'grooming' ? 'Grooming' : 'Tienda Total'}</b>.
            </p>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}