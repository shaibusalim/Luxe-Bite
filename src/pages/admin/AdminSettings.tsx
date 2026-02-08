import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
      const { error } = await supabase
        .from('delivery_settings')
        .update({
          delivery_fee: formData.delivery_fee,
          is_delivery_enabled: formData.is_delivery_enabled,
          is_pay_on_delivery_enabled: formData.is_pay_on_delivery_enabled,
          opening_time: formData.opening_time + ':00',
          closing_time: formData.closing_time + ':00',
          delivery_area: formData.delivery_area,
        })
        .eq('id', settings?.id);

      if (error) throw error;
      
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
      <div className="mb-6">
        <h1 className="font-display text-2xl lg:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your restaurant settings</p>
      </div>

      <div className="max-w-xl">
        <div className="card-elevated p-6 space-y-6">
          <h2 className="font-display text-xl font-bold">Delivery Settings</h2>

          <div className="grid gap-4">
            <div>
              <Label>Delivery Fee (GHC)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.delivery_fee}
                onChange={(e) =>
                  setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>Delivery Area</Label>
              <Input
                value={formData.delivery_area}
                onChange={(e) => setFormData({ ...formData, delivery_area: e.target.value })}
                placeholder="e.g., Tamale"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Opening Time</Label>
                <Input
                  type="time"
                  value={formData.opening_time}
                  onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Closing Time</Label>
                <Input
                  type="time"
                  value={formData.closing_time}
                  onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Enable Delivery</Label>
                <p className="text-sm text-muted-foreground">
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

            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Pay on Delivery</Label>
                <p className="text-sm text-muted-foreground">
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

          <Button onClick={handleSave} className="w-full btn-primary-gradient" disabled={isSaving}>
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
      </div>
    </div>
  );
};

export default AdminSettings;
