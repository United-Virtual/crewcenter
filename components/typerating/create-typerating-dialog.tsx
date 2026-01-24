'use client';

import { Search, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createTypeRatingAction } from '@/actions/typerating/create-typerating';
import { getTypeRatingFormDataAction } from '@/actions/typerating/get-typerating-form-data';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog-footer';
import { Skeleton } from '@/components/ui/skeleton';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';
import {
  ActionErrorResponse,
  extractActionErrorMessage,
} from '@/lib/error-handler';

interface CreateTypeRatingDialogProps {
  children: React.ReactNode;
}

interface TypeRatingFormProps {
  initialValues: {
    name: string;
    selectedAircraftIds: string[];
  };
  onSubmit: (values: { name: string; selectedAircraftIds: string[] }) => void;
  onCancel: () => void;
  isPending: boolean;
  aircraft: { id: string; name: string; livery: string }[];
}

export function TypeRatingForm({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
  aircraft,
}: TypeRatingFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [selectedAircraftIds, setSelectedAircraftIds] = useState<string[]>(
    initialValues.selectedAircraftIds
  );
  const [aircraftSearch, setAircraftSearch] = useState('');

  const toggleAircraft = (id: string) => {
    setSelectedAircraftIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const removeAircraft = (id: string) => {
    setSelectedAircraftIds((prev) => prev.filter((a) => a !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Type rating name is required');
      return;
    }
    if (name.trim().length > 15) {
      toast.error('Type rating name must be 15 characters or less');
      return;
    }
    if (selectedAircraftIds.length === 0) {
      toast.error('Select at least one aircraft');
      return;
    }
    onSubmit({
      name: name.trim(),
      selectedAircraftIds,
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="name">Type Rating Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="A320"
          maxLength={15}
          required
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Aircraft Permissions
        </p>
        {!aircraft || aircraft.length === 0 ? (
          <div className="flex items-center justify-center border border-border p-4 rounded-md bg-background text-muted-foreground">
            <p className="text-sm">
              No aircraft in fleet. Add aircraft before creating type ratings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search aircraft..."
                value={aircraftSearch}
                onChange={(e) => setAircraftSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedAircraftIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedAircraftIds.map((id) => {
                  const ac = aircraft.find((a) => a.id === id);
                  return ac ? (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {ac.name} - {ac.livery}
                      <button
                        type="button"
                        className="ml-1 rounded hover:bg-primary/20 focus:outline-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAircraft(id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
            <div className="max-h-48 overflow-y-auto border border-border rounded-md bg-background">
              {aircraft
                .filter((ac) => !selectedAircraftIds.includes(ac.id))
                .filter(
                  (ac) =>
                    ac.name
                      .toLowerCase()
                      .includes(aircraftSearch.toLowerCase()) ||
                    ac.livery
                      .toLowerCase()
                      .includes(aircraftSearch.toLowerCase())
                )
                .map((ac) => (
                  <label
                    key={ac.id}
                    className="flex items-center gap-2 p-2 text-sm hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedAircraftIds.includes(ac.id)}
                      onCheckedChange={() => toggleAircraft(ac.id)}
                      id={ac.id}
                    />
                    <span className="flex-1">
                      {ac.name} - {ac.livery}
                    </span>
                  </label>
                ))}
              {aircraft
                .filter((ac) => !selectedAircraftIds.includes(ac.id))
                .filter(
                  (ac) =>
                    ac.name
                      .toLowerCase()
                      .includes(aircraftSearch.toLowerCase()) ||
                    ac.livery
                      .toLowerCase()
                      .includes(aircraftSearch.toLowerCase())
                ).length === 0 && (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  {aircraftSearch
                    ? `No aircraft found matching "${aircraftSearch}"`
                    : 'All aircraft selected'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ResponsiveDialogFooter
        primaryButton={{
          label: 'Save',
          disabled: isPending,
          loading: isPending,
          loadingLabel: 'Saving...',
          type: 'submit',
        }}
        secondaryButton={{
          label: 'Cancel',
          onClick: onCancel,
          disabled: isPending,
        }}
      />
    </form>
  );
}

export default function CreateTypeRatingDialog({
  children,
}: CreateTypeRatingDialogProps) {
  const [open, setOpen] = useState(false);
  const [aircraft, setAircraft] = useState<
    { id: string; name: string; livery: string }[] | null
  >(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { dialogStyles } = useResponsiveDialog({
    maxWidth: 'sm:max-w-[500px]',
  });

  const { execute, isPending } = useAction(createTypeRatingAction, {
    onSuccess: (args) => {
      const { data } = args;
      if (data?.success) {
        toast.success(data.message);
        setOpen(false);
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: (errorResponse) => {
      const errorMessage = extractActionErrorMessage(
        errorResponse as ActionErrorResponse,
        'Failed to add type rating'
      );
      toast.error(errorMessage);
    },
  });

  useEffect(() => {
    if (open && aircraft === null && !isLoadingData) {
      setIsLoadingData(true);
      getTypeRatingFormDataAction()
        .then((result) => {
          if (result?.data) {
            setAircraft(result.data.aircraft);
          } else {
            setAircraft([]);
          }
        })
        .catch((error) => {
          const errorMessage = extractActionErrorMessage(
            error as ActionErrorResponse,
            'Failed to load form data'
          );
          toast.error(errorMessage);
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    }
  }, [open, aircraft, isLoadingData]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={`${dialogStyles.className} max-w-[400px]`}
        style={dialogStyles.style}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Add New Type Rating
          </DialogTitle>
          <DialogDescription className="text-foreground">
            Enter type rating details and configure aircraft permissions.
          </DialogDescription>
        </DialogHeader>
        {isLoadingData || aircraft === null ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : (
          <TypeRatingForm
            initialValues={{
              name: '',
              selectedAircraftIds: [],
            }}
            onSubmit={({ name, selectedAircraftIds }) => {
              execute({
                name: name.trim(),
                aircraftIds: selectedAircraftIds,
              });
            }}
            onCancel={() => setOpen(false)}
            isPending={isPending}
            aircraft={aircraft}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
