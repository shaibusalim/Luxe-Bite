import { useState } from 'react';
import { Plus, Edit, Trash2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAllMenuItems, useAllCategories } from '@/hooks/useMenu';
import { MenuItem, MenuCategory } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || '';

const AdminMenu = () => {
  const { data: items, isLoading: itemsLoading } = useAllMenuItems();
  const { data: categories, isLoading: categoriesLoading } = useAllCategories();
  const queryClient = useQueryClient();

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    is_available: true,
    is_weekend_only: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      image_url: '',
      is_available: true,
      is_weekend_only: false,
    });
    setEditingItem(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsItemDialogOpen(true);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id,
      image_url: item.image_url || '',
      is_available: item.is_available,
      is_weekend_only: item.is_weekend_only,
    });
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const itemData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category_id: formData.category_id,
        image_url: formData.image_url || null,
        is_available: formData.is_available,
        is_weekend_only: formData.is_weekend_only,
      };

      if (editingItem) {
        const res = await fetch(`/api/menu-items/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(itemData),
        });
        if (!res.ok) throw new Error('Failed to update item');
        toast.success('Item updated successfully');
      } else {
        const res = await fetch(`/api/menu-items`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(itemData),
        });
        if (!res.ok) throw new Error('Failed to add item');
        toast.success('Item added successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['all-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      setIsItemDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`/api/menu-items/${itemId}`, { 
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete item');
      toast.success('Item deleted');
      queryClient.invalidateQueries({ queryKey: ['all-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/menu-items/${item.id}/availability`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ is_available: !item.is_available }),
      });
      if (!res.ok) throw new Error('Failed to update availability');
      queryClient.invalidateQueries({ queryKey: ['all-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success(`${item.name} is now ${!item.is_available ? 'available' : 'unavailable'}`);
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  if (itemsLoading || categoriesLoading) {
    return <LoadingSpinner />;
  }

  const groupedItems = items?.reduce((acc, item) => {
    const categoryName = item.category?.name || 'Uncategorized';
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>) || {};

  return (
    <div>
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Menu Management</h1>
          <p className="text-muted-foreground mt-0.5">{items?.length || 0} items</p>
        </div>
        <Button onClick={openAddDialog} className="btn-primary-gradient shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </motion.div>

      {Object.entries(groupedItems).map(([categoryName, categoryItems], catIndex) => (
        <motion.div
          key={categoryName}
          className="mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: catIndex * 0.05 }}
        >
          <h2 className="font-display text-xl font-bold mb-4 text-foreground">{categoryName}</h2>
          <div className="grid gap-3">
            {categoryItems.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card-elevated p-4 rounded-xl hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold truncate text-foreground">{item.name}</h3>
                      {item.is_weekend_only && (
                        <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">
                          Weekend Only
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.description}
                    </p>
                    <p className="font-bold text-primary mt-0.5">GHC {Number(item.price).toFixed(2)}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={() => handleToggleAvailability(item)}
                      />
                      <span className="text-sm text-muted-foreground hidden sm:inline">
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(item)}
                      className="h-10 w-10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Add/Edit Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Item name"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (GHC) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Image URL</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
                <Label>Available</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_weekend_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_weekend_only: checked })}
                />
                <Label>Weekend Only</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem} className="btn-primary-gradient">
              {editingItem ? 'Update' : 'Add'} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMenu;
