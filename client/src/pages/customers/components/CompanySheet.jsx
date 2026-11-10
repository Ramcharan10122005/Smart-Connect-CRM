import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagMultiSelect } from './TagMultiSelect';
import { OwnerSelect } from './OwnerSelect';

const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1000+ employees',
];

const INDUSTRIES = [
  'Technology & Software',
  'Healthcare & Life Sciences',
  'Financial Services',
  'Manufacturing',
  'Retail & E-commerce',
  'Professional Services',
  'Education',
  'Real Estate & Construction',
  'Media & Entertainment',
  'Other',
];

export function CompanySheet({ open, onOpenChange, company = null, onSuccess }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const isEditing = Boolean(company?.id);

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    industry: '',
    size: '',
    website: '',
    phone: '',
    ownerId: currentUser?.id || null,
    tagIds: [],
    addressLine1: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    notes: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (open) {
      setFieldErrors({});
      if (company) {
        setFormData({
          name: company.name || '',
          domain: company.domain || '',
          industry: company.industry || '',
          size: company.size || '',
          website: company.website || '',
          phone: company.phone || '',
          ownerId: company.ownerId || currentUser?.id || null,
          tagIds: company.tags ? company.tags.map((t) => t.tagId || t.tag?.id || t.id) : [],
          addressLine1: company.addressLine1 || '',
          city: company.city || '',
          state: company.state || '',
          country: company.country || '',
          postalCode: company.postalCode || '',
          notes: company.notes || '',
        });
      } else {
        setFormData({
          name: '',
          domain: '',
          industry: '',
          size: '',
          website: '',
          phone: '',
          ownerId: currentUser?.id || null,
          tagIds: [],
          addressLine1: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
          notes: '',
        });
      }
    }
  }, [open, company, currentUser]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Company name is required';
    if (formData.website?.trim()) {
      try {
        new URL(formData.website.trim().startsWith('http') ? formData.website.trim() : `https://${formData.website.trim()}`);
      } catch {
        errors.website = 'Please enter a valid website URL';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      let formattedWebsite = payload.website?.trim() || null;
      if (formattedWebsite && !formattedWebsite.startsWith('http')) {
        formattedWebsite = `https://${formattedWebsite}`;
      }

      const body = {
        ...payload,
        website: formattedWebsite,
        domain: payload.domain?.trim() || null,
        phone: payload.phone?.trim() || null,
        industry: payload.industry?.trim() || null,
        size: payload.size?.trim() || null,
        notes: payload.notes?.trim() || null,
      };

      if (isEditing) {
        const res = await api.patch(`/companies/${company.id}`, body);
        return res.data?.data;
      } else {
        const res = await api.post('/companies', body);
        return res.data?.data;
      }
    },
    onSuccess: (savedCompany) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        isEditing
          ? `Updated company "${savedCompany.name}"`
          : `Created company "${savedCompany.name}"`
      );
      onOpenChange(false);
      if (onSuccess) onSuccess(savedCompany);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save company account');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    saveMutation.mutate(formData);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b sticky top-0 bg-background/95 backdrop-blur-xs z-10">
          <SheetHeader>
            <SheetTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {isEditing ? 'Edit Company Account' : 'New Company Account'}
            </SheetTitle>
            <SheetDescription>
              {isEditing
                ? 'Update company profile, industry classification, and account team.'
                : 'Create a new corporate account profile to associate with contacts and deals.'}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-xs font-medium">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              placeholder="Acme Corporation"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={fieldErrors.name ? 'border-destructive' : ''}
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          {/* Domain & Website */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="domain" className="text-xs font-medium">
                Domain / TLD
              </Label>
              <Input
                id="domain"
                placeholder="acme.com"
                value={formData.domain}
                onChange={(e) => handleChange('domain', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-xs font-medium">
                Website URL
              </Label>
              <Input
                id="website"
                placeholder="https://www.acme.com"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className={fieldErrors.website ? 'border-destructive' : ''}
              />
              {fieldErrors.website && (
                <p className="text-[11px] text-destructive">{fieldErrors.website}</p>
              )}
            </div>
          </div>

          {/* Industry & Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Industry</Label>
              <Select
                value={formData.industry || '__none__'}
                onValueChange={(val) => handleChange('industry', val === '__none__' ? '' : val)}
              >
                <SelectTrigger className="w-full rounded-crm text-sm h-9 bg-background">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground italic text-xs">
                    (Select industry)
                  </SelectItem>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Company Size</Label>
              <Select
                value={formData.size || '__none__'}
                onValueChange={(val) => handleChange('size', val === '__none__' ? '' : val)}
              >
                <SelectTrigger className="w-full rounded-crm text-sm h-9 bg-background">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground italic text-xs">
                    (Select employee range)
                  </SelectItem>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Phone & Owner */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="compPhone" className="text-xs font-medium">
                HQ Phone Number
              </Label>
              <Input
                id="compPhone"
                type="tel"
                placeholder="+1 (800) 555-0199"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Account Owner</Label>
              <OwnerSelect
                value={formData.ownerId}
                onChange={(newOwnerId) => handleChange('ownerId', newOwnerId)}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Account Tags</Label>
            <TagMultiSelect
              value={formData.tagIds}
              onChange={(newTags) => handleChange('tagIds', newTags)}
            />
          </div>

          {/* Address */}
          <div className="pt-2 border-t space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Headquarters Location
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="compAddress" className="text-xs font-medium">
                Street Address
              </Label>
              <Input
                id="compAddress"
                placeholder="500 Howard Street, Suite 1200"
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="compCity" className="text-xs font-medium">
                  City
                </Label>
                <Input
                  id="compCity"
                  placeholder="San Francisco"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="compState" className="text-xs font-medium">
                  State / Region
                </Label>
                <Input
                  id="compState"
                  placeholder="CA"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="compCountry" className="text-xs font-medium">
                  Country
                </Label>
                <Input
                  id="compCountry"
                  placeholder="United States"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="compZip" className="text-xs font-medium">
                  Postal / Zip Code
                </Label>
                <Input
                  id="compZip"
                  placeholder="94105"
                  value={formData.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-2 border-t space-y-1.5">
            <Label htmlFor="compNotes" className="text-xs font-medium">
              Internal Account Notes
            </Label>
            <Textarea
              id="compNotes"
              placeholder="Enterprise tier agreement, key decision makers, contract terms..."
              rows={3}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t bg-card mt-auto flex items-center justify-end gap-3 sticky bottom-0">
          <Button
            type="button"
            variant="outline"
            disabled={saveMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="min-w-28"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Create Company'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CompanySheet;
