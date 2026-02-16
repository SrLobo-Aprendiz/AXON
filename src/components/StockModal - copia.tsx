import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Package, AlertTriangle, ShoppingCart, Pencil, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ReceptionRow } from '@/components/stock/ReceptionRow';
import { InventoryBatchRow } from '@/components/stock/InventoryBatchRow';
import { EditProductDialog } from '@/components/stock/EditProductDialog';
import { CATEGORY_CONFIG, safeDate } from '@/lib/types';
import type { InventoryItem, GroupedProduct, ProductDefinition } from '@/lib/types';

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
}

export const StockModal: React.FC<StockModalProps> = ({ isOpen, onClose, householdId }) => {
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState('reception');
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDefinition | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Reception form
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'uds' | 'kg' | 'g' | 'L' | 'ml'>('uds');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('Despensa');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Load data
  const loadInventory = async () => {
    if (!householdId) return;
    setIsLoading(true);
    
    try {
      // Fetch all inventory items with product definitions
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('*, product:product_definitions(*)')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by product_id
      const grouped: Record<string, GroupedProduct> = {};
      
      items?.forEach((item: any) => {
        const productDef = item.product;
        if (!productDef) return;

        if (!grouped[productDef.id]) {
          grouped[productDef.id] = {
            ...productDef,
            batches: [],
            total_quantity: 0,
            earliest_expiry: null,
            batch_count: 0,
            status: 'stocked',
          };
        }

        grouped[productDef.id].batches.push(item);
        grouped[productDef.id].total_quantity += item.quantity;
        grouped[productDef.id].batch_count++;

        // Track earliest expiry
        if (item.expiry_date) {
          if (!grouped[productDef.id].earliest_expiry || item.expiry_date < grouped[productDef.id].earliest_expiry) {
            grouped[productDef.id].earliest_expiry = item.expiry_date;
          }
        }
      });

      // Determine status
      Object.values(grouped).forEach((prod) => {
        if (prod.min_quantity) {
          if (prod.total_quantity === 0) {
            prod.status = 'panic';
          } else if (prod.total_quantity < prod.min_quantity) {
            prod.status = 'low';
          } else {
            prod.status = 'stocked';
          }
        }
      });

      setGroupedProducts(Object.values(grouped));
    } catch (err: any) {
      console.error('Error loading inventory:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInventory();
    }
  }, [isOpen, householdId]);

  // Add new batch
  const handleAddBatch = async () => {
    if (!selectedProductId || !quantity || Number(quantity) <= 0) {
      toast({ title: 'Datos incompletos', variant: 'destructive' });
      return;
    }

    const product = groupedProducts.find((p) => p.id === selectedProductId);
    if (!product) return;

    try {
      const { error } = await supabase.from('inventory_items').insert({
        household_id: householdId,
        product_id: product.id,
        quantity: Number(quantity),
        location,
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
        price: price ? Number(price) : null,
      });

      if (error) throw error;

      toast({ title: 'Lote añadido', description: `${quantity} ${unit} añadido a ${product.name}` });
      
      // Reset form
      setQuantity('');
      setPrice('');
      setExpiryDate(undefined);
      setLocation('Despensa');
      
      loadInventory();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Update batch
  const handleUpdateBatch = async (batchId: string, updates: Partial<InventoryItem>) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', batchId);

      if (error) throw error;
      
      toast({ title: 'Lote actualizado' });
      loadInventory();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Delete batch
  const handleDeleteBatch = async (batchId: string) => {
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', batchId);
      if (error) throw error;
      
      toast({ title: 'Lote eliminado' });
      loadInventory();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Move to shopping list
  const handleMoveToShopping = async (batchId: string) => {
    const batch = groupedProducts
      .flatMap((p) => p.batches)
      .find((b) => b.id === batchId);
    
    if (!batch) return;

    try {
      // Add to shopping list
      await supabase.from('shopping_list').insert({
        household_id: householdId,
        name: batch.name || 'Item',
        category: batch.category || 'Pantry',
        quantity: batch.quantity,
        unit: batch.unit || 'uds',
        checked: false,
      });

      // Delete from inventory
      await supabase.from('inventory_items').delete().eq('id', batchId);

      toast({ title: 'Movido a Lista de Compra' });
      loadInventory();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Filter products
  const filteredProducts = groupedProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Get products by status
  const stockedProducts = filteredProducts.filter((p) => p.status === 'stocked');
  const lowProducts = filteredProducts.filter((p) => p.status === 'low');
  const panicProducts = filteredProducts.filter((p) => p.status === 'panic');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[900px] h-[85vh] max-h-[600px] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-bold">Gestión de Stock</h2>
                <p className="text-xs text-zinc-500">
                  {groupedProducts.length} productos • {groupedProducts.reduce((sum, p) => sum + p.batch_count, 0)} lotes
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b border-zinc-800 bg-transparent px-6">
              <TabsTrigger value="reception" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400">
                <Plus className="h-4 w-4 mr-2" />
                Recepción
              </TabsTrigger>
              <TabsTrigger value="pantry" className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-400">
                <Package className="h-4 w-4 mr-2" />
                Despensa ({stockedProducts.length})
              </TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-400">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Alertas ({lowProducts.length + panicProducts.length})
              </TabsTrigger>
            </TabsList>

            {/* RECEPTION TAB */}
            <TabsContent value="reception" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {/* Product Selector */}
                  <div className="grid gap-2">
                    <label className="text-zinc-500 text-[10px] uppercase font-bold">Producto</label>
                    <select
                      value={selectedProductId || ''}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const prod = groupedProducts.find((p) => p.id === e.target.value);
                        if (prod) setUnit(prod.unit);
                      }}
                      className="h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                    >
                      <option value="">Selecciona un producto...</option>
                      {groupedProducts.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} ({prod.total_quantity} {prod.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProductId && (
                    <>
                      <ReceptionRow
                        quantity={quantity}
                        setQuantity={setQuantity}
                        unit={unit}
                        setUnit={setUnit}
                        price={price}
                        setPrice={setPrice}
                        location={location}
                        setLocation={setLocation}
                        expiryDate={expiryDate}
                        setExpiryDate={setExpiryDate}
                        householdId={householdId}
                      />

                      <Button
                        onClick={handleAddBatch}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Añadir Lote
                      </Button>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* PANTRY TAB */}
            <TabsContent value="pantry" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : stockedProducts.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay productos en stock</p>
                    </div>
                  ) : (
                    stockedProducts.map((product) => {
                      const categoryConfig = CATEGORY_CONFIG[product.category as keyof typeof CATEGORY_CONFIG];
                      const Icon = categoryConfig?.icon || Package;
                      
                      return (
                        <div key={product.id} className="border border-zinc-800 rounded-lg p-4 space-y-3">
                          {/* Product Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${categoryConfig?.color || 'bg-zinc-800'}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white">{product.name}</h3>
                                <p className="text-xs text-zinc-500">
                                  {product.total_quantity} {product.unit} en {product.batch_count} lote(s)
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowEditDialog(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Batches */}
                          <div className="space-y-2">
                            {product.batches.map((batch) => (
                              <InventoryBatchRow
                                key={batch.id}
                                batch={batch}
                                unit={product.unit}
                                householdId={householdId}
                                onUpdate={handleUpdateBatch}
                                onDelete={handleDeleteBatch}
                                onMoveToShopping={handleMoveToShopping}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ALERTS TAB */}
            <TabsContent value="alerts" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  {/* Panic Items */}
                  {panicProducts.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-red-400 uppercase">🔴 Crítico</h3>
                      {panicProducts.map((product) => (
                        <div key={product.id} className="p-4 border border-red-500/30 bg-red-500/5 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-white">{product.name}</h4>
                              <p className="text-xs text-zinc-400">
                                Stock: {product.total_quantity} {product.unit} (Mín: {product.min_quantity})
                              </p>
                            </div>
                            <Button size="sm" variant="outline" className="text-red-400 border-red-500/30">
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Comprar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Low Items */}
                  {lowProducts.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-orange-400 uppercase">🟠 Bajo Stock</h3>
                      {lowProducts.map((product) => (
                        <div key={product.id} className="p-4 border border-orange-500/30 bg-orange-500/5 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-white">{product.name}</h4>
                              <p className="text-xs text-zinc-400">
                                Stock: {product.total_quantity} {product.unit} (Mín: {product.min_quantity})
                              </p>
                            </div>
                            <Button size="sm" variant="outline" className="text-orange-400 border-orange-500/30">
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Comprar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {panicProducts.length === 0 && lowProducts.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay alertas de stock</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <EditProductDialog
        product={selectedProduct}
        isOpen={showEditDialog}
        onOpenChange={setShowEditDialog}
        onUpdated={loadInventory}
      />
    </>
  );
};
