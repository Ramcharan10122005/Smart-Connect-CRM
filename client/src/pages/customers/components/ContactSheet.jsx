import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, UserPlus } from 'lucide-react';
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
import { CompanyCombobox } from './CompanyCombobox';
import { TagMultiSelect } from './TagMultiSelect';
import { OwnerSelect } from './OwnerSelect';

export function ContactSheet({ open, onOpenChange, contact = null, onSuccess }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const isEditing = Boolean(contact?.id);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    companyId: null,
    lifecycleStage: 'PROSPECT',
    sourceId: null,
    ownerId: currentUser?.id || null,
    tagIds: [],
    linkedinUrl: '',
    addressLine1: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    notes: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Fetch lead sources
  const { data: sourcesData } = useQuery({
    queryKey: queryKeys.leadSources.all,
    queryFn: async () => {
      const res = await api.get('/lead-sources');
      return res.data?.data || [];
    },
  });
  const leadSources = sourcesData || [];

  // Reset or populate form when opened
  useEffect(() => {
    if (open) {
      setFieldErrors({});
      setDuplicateWarning(null);
      if (contact) {
        setFormData({
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email || '',
          phone: contact.phone || '',
          jobTitle: contact.jobTitle || '',
          companyId: contact.companyId || null,
          lifecycleStage: contact.lifecycleStage || 'PROSPECT',
          sourceId: contact.sourceId || null,
          ownerId: contact.ownerId || currentUser?.id || null,
          tagIds: contact.tags ? contact.tags.map((t) => t.tagId || t.tag?.id || t.id) : [],
          linkedinUrl: contact.linkedinUrl || '',
          addressLine1: contact.addressLine1 || '',
          city: contact.city || '',
          state: contact.state || '',
          country: contact.country || '',
          postalCode: contact.postalCode || '',
          notes: contact.notes || '',
        });
      } else {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          jobTitle: '',
          companyId: null,
          lifecycleStage: 'PROSPECT',
          sourceId: null,
          ownerId: currentUser?.id || null,
          tagIds: [],
          linkedinUrl: '',
          addressLine1: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
          notes: '',
        });
      }
    }
  }, [open, contact, currentUser]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
    if (field === 'email' && duplicateWarning) {
      setDuplicateWarning(null);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName?.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) errors.lastName = 'Last name is required';
    if (formData.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async ({ payload, force = false }) => {
      const body = {
        ...payload,
        email: payload.email?.trim() || null,
        phone: payload.phone?.trim() || null,
        jobTitle: payload.jobTitle?.trim() || null,
        linkedinUrl: payload.linkedinUrl?.trim() || null,
        notes: payload.notes?.trim() || null,
        force,
      };

      if (isEditing) {
        const res = await api.patch(`/contacts/${contact.id}`, body);
        return res.data?.data;
      } else {
        const res = await api.post('/contacts', body);
        return res.data?.data;
      }
    },
    onSuccess: (savedContact) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        isEditing
          ? `Updated contact ${savedContact.firstName} ${savedContact.lastName}`
          : `Created contact ${savedContact.firstName} ${savedContact.lastName}`
      );
      onOpenChange(false);
      if (onSuccess) onSuccess(savedContact);
    },
    onError: (err) => {
      if (err.status === 409 && err.details) {
        // Duplicate email returned from server!
        setDuplicateWarning({
          existingId: err.details.existingId,
          existingName: err.details.existingName || 'Existing Contact',
          email: formData.email,
        });
      } else {
        toast.error(err.message || 'Failed to save contact');
      }
    },
  });

  const handleSubmit = (e, force = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) return;
    saveMutation.mutate({ payload: formData, force });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b sticky top-0 bg-background/95 backdrop-blur-xs z-10">
          <SheetHeader>
            <SheetTitle className="text-xl flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {isEditing ? 'Edit Contact' : 'New Contact'}
            </SheetTitle>
            <SheetDescription>
              {isEditing
                ? 'Update contact record details, account associations, and lifecycle stage.'
                : 'Add a new individual contact to your CRM address book.'}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-5 flex-1">
          {/* Duplicate email alert banner */}
          {duplicateWarning && (
            <div className="rounded-card border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700/60 p-4 text-amber-900 dark:text-amber-200 text-sm space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Duplicate Email Detected
                  </p>
                  <p className="text-xs">
                    A contact with email <strong>&quot;{duplicateWarning.email}&quot;</strong> already exists as{' '}
                    <strong>{duplicateWarning.existingName}</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1 pl-6">
                <Link
                  to={`/customers/contact/${duplicateWarning.existingId}`}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                >
                  View existing record <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
                <span className="text-xs text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={() => handleSubmit(null, true)}
                  disabled={saveMutation.isPending}
                  className="text-xs font-medium text-amber-900 dark:text-amber-200 underline hover:opacity-80 cursor-pointer"
                >
                  Create anyway
                </button>
              </div>
            </div>
          )}

          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-medium">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="Jane"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={fieldErrors.firstName ? 'border-destructive' : ''}
              />
              {fieldErrors.firstName && (
                <p className="text-[11px] text-destructive">{fieldErrors.firstName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-medium">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={fieldErrors.lastName ? 'border-destructive' : ''}
              />
              {fieldErrors.lastName && (
                <p className="text-[11px] text-destructive">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jane.doe@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={fieldErrors.email ? 'border-destructive' : ''}
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-medium">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          {/* Job Title & Company */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle" className="text-xs font-medium">
                Job Title
              </Label>
              <Input
                id="jobTitle"
                placeholder="VP of Operations"
                value={formData.jobTitle}
                onChange={(e) => handleChange('jobTitle', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Company Account</Label>
              <CompanyCombobox
                value={formData.companyId}
                onChange={(newCompanyId) => handleChange('companyId', newCompanyId)}
              />
            </div>
          </div>

          {/* Lifecycle Stage & Source */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Lifecycle Stage</Label>
              <Select
                value={formData.lifecycleStage}
                onValueChange={(val) => handleChange('lifecycleStage', val)}
              >
                <SelectTrigger className="w-full rounded-crm text-sm h-9 bg-background">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROSPECT">Prospect (Lead)</SelectItem>
                  <SelectItem value="CUSTOMER">Customer (Active)</SelectItem>
                  <SelectItem value="INACTIVE">Inactive (Archived)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Lead Source</Label>
              <Select
                value={formData.sourceId || '__none__'}
                onValueChange={(val) => handleChange('sourceId', val === '__none__' ? null : val)}
              >
                <SelectTrigger className="w-full rounded-crm text-sm h-9 bg-background">
                  <SelectValue placeholder="Select lead source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground italic text-xs">
                    (None / Direct)
                  </SelectItem>
                  {leadSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Owner & Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Assigned Owner</Label>
              <OwnerSelect
                value={formData.ownerId}
                onChange={(newOwnerId) => handleChange('ownerId', newOwnerId)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tags</Label>
              <TagMultiSelect
                value={formData.tagIds}
                onChange={(newTags) => handleChange('tagIds', newTags)}
              />
            </div>
          </div>

          {/* LinkedIn URL */}
          <div className="space-y-1.5">
            <Label htmlFor="linkedinUrl" className="text-xs font-medium">
              LinkedIn Profile URL
            </Label>
            <Input
              id="linkedinUrl"
              placeholder="https://linkedin.com/in/janedoe"
              value={formData.linkedinUrl}
              onChange={(e) => handleChange('linkedinUrl', e.target.value)}
            />
          </div>

          {/* Address Section */}
          <div className="pt-2 border-t space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Address & Location
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="addressLine1" className="text-xs font-medium">
                Street Address
              </Label>
              <Input
                id="addressLine1"
                placeholder="100 Market St, Suite 400"
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-medium">
                  City
                </Label>
                <Input
                  id="city"
                  placeholder="San Francisco"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs font-medium">
                  State / Province
                </Label>
                <Input
                  id="state"
                  placeholder="CA"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-xs font-medium">
                  Country
                </Label>
                <Input
                  id="country"
                  placeholder="United States"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalCode" className="text-xs font-medium">
                  Postal / Zip Code
                </Label>
                <Input
                  id="postalCode"
                  placeholder="94105"
                  value={formData.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-2 border-t space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium">
              Internal Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Background notes, referral history, preferred channels..."
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
            onClick={(e) => handleSubmit(e, false)}
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
              'Create Contact'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ContactSheet;
