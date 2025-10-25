
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Phone, MapPin, Globe, Instagram, CheckCircle2 } from "lucide-react";

export default function ShopifyAdminCustomerModal() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metaobjectId, setMetaobjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company: '',
    email: '',
    phone: '',
    website: '',
    instagram: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    taxId: '',
    taxExempt: false,
    accountType: '',
    sampleSet: 'No',
    source: ''
  });

  useEffect(() => {
    // Get customer ID from Shopify App Bridge (passed via query params)
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('customerId');
    
    if (customerId) {
      fetchWholesaleAccount(customerId);
    }
  }, []);

  const fetchWholesaleAccount = async (customerId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customer/wholesale-account?customerId=${customerId}`);
      const data = await res.json();

      if (data.hasWholesaleAccount) {
        setMetaobjectId(data.clarityAccountId);
        setFormData(data.account);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching wholesale account:', err);
      toast({ title: "Error", description: "Failed to load wholesale account", variant: "destructive" });
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/wholesale-account/${metaobjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: formData })
      });

      if (!res.ok) throw new Error('Failed to update');

      toast({ title: "Success", description: "Wholesale account updated successfully" });
      setSaving(false);
    } catch (err) {
      console.error('Error saving:', err);
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 font-['Vazirmatn']">
        <p className="text-[#696A6D]">Loading wholesale account...</p>
      </div>
    );
  }

  if (!metaobjectId) {
    return (
      <div className="p-6 font-['Vazirmatn']">
        <p className="text-[#696A6D]">No wholesale account found for this customer.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#F3F1E9] font-['Vazirmatn']">
      <Card className="rounded-[16px]">
        <CardHeader>
          <CardTitle className="font-['Archivo'] text-[#212227] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#F2633A]" />
            Wholesale Account Details
          </CardTitle>
          <CardDescription className="font-['Vazirmatn'] text-[#696A6D]">
            Edit wholesale account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="font-['Vazirmatn']">Company Name</Label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="font-['Vazirmatn']"
              />
            </div>
            <div>
              <Label className="font-['Vazirmatn']">Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="font-['Vazirmatn']"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="font-['Vazirmatn']">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="font-['Vazirmatn']"
              />
            </div>
            <div>
              <Label className="font-['Vazirmatn']">Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="font-['Vazirmatn']"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="font-['Vazirmatn']">Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="font-['Vazirmatn']"
            />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="font-['Vazirmatn']">City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="font-['Vazirmatn']"
              />
            </div>
            <div>
              <Label className="font-['Vazirmatn']">State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="font-['Vazirmatn']"
              />
            </div>
            <div>
              <Label className="font-['Vazirmatn']">ZIP</Label>
              <Input
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="font-['Vazirmatn']"
              />
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#F2633A] hover:bg-[#F2633A]/90 rounded-[11px] font-['Vazirmatn']"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
