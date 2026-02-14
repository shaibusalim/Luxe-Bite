import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || '';

const AdminSettings = () => {
  const { data: settings, isLoading } = useDeliverySettings();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    delivery_fee: 10,
    is_delivery_enabled: true,
    is_pay_on_delivery_enabled: true,
    opening_time: '10:00',
    closing_time: '22:00',
    delivery_area: 'Tamale',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        delivery_fee: settings.delivery_fee,
        is_delivery_enabled: settings.is_delivery_enabled,
        is_pay_on_delivery_enabled: settings.is_pay_on_delivery_enabled,
        opening_time: settings.opening_time.slice(0, 5),
        closing_time: settings.closing_time.slice(0, 5),
        delivery_area: settings.delivery_area,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/delivery-settings/${settings?.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          delivery_fee: formData.delivery_fee,
          is_delivery_enabled: formData.is_delivery_enabled,
          is_pay_on_delivery_enabled: formData.is_pay_on_delivery_enabled,
          opening_time: formData.opening_time + ':00',
          closing_time: formData.closing_time + ':00',
          delivery_area: formData.delivery_area,
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      
      queryClient.invalidateQueries({ queryKey: ['delivery-settings'] });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-0.5">Configure your restaurant settings</p>
      </motion.div>

      <motion.div
        className="max-w-xl"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <div className="card-elevated p-6 rounded-xl space-y-6">
          <h2 className="font-display text-xl font-bold text-foreground">Delivery Settings</h2>

          <div className="grid gap-4">
            <div>
              <Label className="text-foreground">Delivery Fee (GHC)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.delivery_fee}
                onChange={(e) =>
                  setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })
                }
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-foreground">Delivery Area</Label>
              <Input
                value={formData.delivery_area}
                onChange={(e) => setFormData({ ...formData, delivery_area: e.target.value })}
                placeholder="e.g., Tamale"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Opening Time</Label>
                <Input
                  type="time"
                  value={formData.opening_time}
                  onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-foreground">Closing Time</Label>
                <Input
                  type="time"
                  value={formData.closing_time}
                  onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/40">
              <div>
                <Label className="text-foreground font-medium">Enable Delivery</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Allow customers to order for delivery
                </p>
              </div>
              <Switch
                checked={formData.is_delivery_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_delivery_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/40">
              <div>
                <Label className="text-foreground font-medium">Pay on Delivery</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Allow customers to pay when order arrives
                </p>
              </div>
              <Switch
                checked={formData.is_pay_on_delivery_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_pay_on_delivery_enabled: checked })
                }
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full btn-primary-gradient h-11 font-medium" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSettings;
