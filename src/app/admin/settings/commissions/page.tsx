'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from 'lucide-react';

export default function CommissionSettingsPage() {
    const [tiers, setTiers] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const { data: t } = await supabase.from('commission_tiers').select('*').order('type').order('min_sales');
        const { data: e } = await supabase.from('employees').select('id, first_name, last_name, role, commission_type, participation_pct').eq('active', true).order('first_name');
        if(t) setTiers(t);
        if(e) setEmployees(e);
    };

    const updateTier = async (id: string, field: string, value: any) => {
        const { error } = await supabase.from('commission_tiers').update({ [field]: value }).eq('id', id);
        if (error) toast.error("Error al guardar");
        else {
            toast.success("Escalón actualizado");
            loadData();
        }
    };

    const updateEmployee = async (id: string, field: string, value: any) => {
        const { error } = await supabase.from('employees').update({ [field]: value }).eq('id', id);
        if (error) toast.error("Error al guardar empleado");
        else {
            toast.success("Participación actualizada");
            loadData();
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Configuración de Comisiones</h1>

            {/* SECCIÓN 1: REPARTO DEL PASTEL (EMPLEADOS) */}
            <Card>
                <CardHeader><CardTitle>1. Participación (% del Pastel)</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Empleado</TableHead>
                                <TableHead>Juega en Pastel...</TableHead>
                                <TableHead>Su Porcentaje (%)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.first_name} {emp.last_name}</TableCell>
                                    <TableCell>
                                        <Select 
                                            defaultValue={emp.commission_type} 
                                            onValueChange={(v) => updateEmployee(emp.id, 'commission_type', v)}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="grooming">Solo Grooming</SelectItem>
                                                <SelectItem value="total">Total Tienda</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                className="w-24"
                                                defaultValue={emp.participation_pct}
                                                onBlur={(e) => updateEmployee(emp.id, 'participation_pct', parseFloat(e.target.value))}
                                            />
                                            <span>%</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* SECCIÓN 2: TAMAÑO DEL PASTEL (ESCALONES) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GROOMING TIERS */}
                <Card className="border-blue-200">
                    <CardHeader className="bg-blue-50"><CardTitle className="text-blue-800">Escalones GROOMING</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>Venta Min</TableHead><TableHead>Venta Max</TableHead><TableHead>Comisión (%)</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {tiers.filter(t => t.type === 'grooming').map((tier) => (
                                    <TableRow key={tier.id}>
                                        <TableCell><Input type="number" defaultValue={tier.min_sales} onBlur={(e) => updateTier(tier.id, 'min_sales', e.target.value)} /></TableCell>
                                        <TableCell><Input type="number" defaultValue={tier.max_sales} onBlur={(e) => updateTier(tier.id, 'max_sales', e.target.value)} /></TableCell>
                                        <TableCell><Input type="number" step="0.0001" defaultValue={tier.percentage} onBlur={(e) => updateTier(tier.id, 'percentage', e.target.value)} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* TOTAL TIERS */}
                <Card className="border-green-200">
                    <CardHeader className="bg-green-50"><CardTitle className="text-green-800">Escalones TOTAL (Recepción)</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>Venta Min</TableHead><TableHead>Venta Max</TableHead><TableHead>Comisión (%)</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {tiers.filter(t => t.type === 'total').map((tier) => (
                                    <TableRow key={tier.id}>
                                        <TableCell><Input type="number" defaultValue={tier.min_sales} onBlur={(e) => updateTier(tier.id, 'min_sales', e.target.value)} /></TableCell>
                                        <TableCell><Input type="number" defaultValue={tier.max_sales} onBlur={(e) => updateTier(tier.id, 'max_sales', e.target.value)} /></TableCell>
                                        <TableCell><Input type="number" step="0.0001" defaultValue={tier.percentage} onBlur={(e) => updateTier(tier.id, 'percentage', e.target.value)} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}