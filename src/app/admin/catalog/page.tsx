'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Search, Scissors, ShoppingBag } from 'lucide-react';
import { toast } from "sonner";

export default function CatalogPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const supabase = createClient();

    const loadCatalog = async () => {
        setLoading(true);
        const { data } = await supabase.from('zettle_catalog').select('*').order('name');
        if (data) setProducts(data);
        setLoading(false);
    };

    useEffect(() => { loadCatalog(); }, []);

    const handleSync = async () => {
        setSyncing(true);
        toast.info("Descargando productos de Zettle...");
        try {
            const res = await fetch('/api/integrations/zettle/products');
            const json = await res.json();
            if (json.success) {
                toast.success(json.message);
                loadCatalog();
            } else {
                toast.error(json.error);
            }
        } catch (e) { toast.error("Error de conexión"); }
        finally { setSyncing(false); }
    };

    const toggleCategory = async (id: string, currentCategory: string) => {
        const newCategory = currentCategory === 'grooming' ? 'store' : 'grooming';
        
        // Optimistic UI update
        setProducts(prev => prev.map(p => p.id === id ? { ...p, category: newCategory } : p));

        const { error } = await supabase
            .from('zettle_catalog')
            .update({ category: newCategory })
            .eq('id', id);

        if (error) {
            toast.error("Error al guardar cambio");
            loadCatalog(); // Revertir
        } else {
            toast.success(`Cambiado a ${newCategory === 'grooming' ? 'Grooming' : 'Tienda'}`);
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h1>
                    <p className="text-slate-500">Define qué productos son Servicios (Grooming) y cuáles son Tienda.</p>
                </div>
                <Button onClick={handleSync} disabled={syncing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar con Zettle'}
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                        <Input 
                            placeholder="Buscar producto..." 
                            className="pl-8" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="w-[150px]">Tipo Actual</TableHead>
                                    <TableHead className="w-[100px] text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>
                                            {product.category === 'grooming' ? (
                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 gap-1">
                                                    <Scissors size={12}/> Grooming
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-600 gap-1">
                                                    <ShoppingBag size={12}/> Tienda
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Switch 
                                                checked={product.category === 'grooming'}
                                                onCheckedChange={() => toggleCategory(product.id, product.category)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="text-xs text-slate-400 mt-4 text-center">
                        Mostrando {filteredProducts.length} productos
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}