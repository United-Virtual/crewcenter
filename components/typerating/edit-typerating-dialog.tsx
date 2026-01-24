'use client';

import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { editTypeRatingAction } from '@/actions/typerating/edit-typerating';
import { getTypeRatingFormDataAction } from '@/actions/typerating/get-typerating-form-data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';
import {
  ActionErrorResponse,
  extractActionErrorMessage,
} from '@/lib/error-handler';

import { TypeRatingForm } from './create-typerating-dialog';

interface EditTypeRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeRating: {
    id: string;
    name: string;
    aircraftIds: string[];
  };
}

export default function EditTypeRatingDialog({
  open,
  onOpenChange,
  typeRating,
}: EditTypeRatingDialogProps) {
  const [aircraft, setAircraft] = useState<
    { id: string; name: string; livery: string }[] | null
  >(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { dialogStyles } = useResponsiveDialog({
    maxWidth: 'sm:max-w-[500px]',
  });

  const { execute, isPending } = useAction(editTypeRatingAction, {
    onSuccess: (args) => {
      const { data } = args;
      if (data?.success) {
        toast.success(data.message);
        onOpenChange(false);
      }
    },
    onError: (errorResponse) => {
      const errorMessage = extractActionErrorMessage(
        errorResponse as ActionErrorResponse,
        'Failed to update type rating'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={dialogStyles.className}
        style={dialogStyles.style}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Edit Type Rating
          </DialogTitle>
          <DialogDescription className="text-foreground">
            Update type rating details and aircraft permissions.
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
              name: typeRating.name,
              selectedAircraftIds: typeRating.aircraftIds,
            }}
            onSubmit={({ name, selectedAircraftIds }) => {
              execute({
                id: typeRating.id,
                name: name.trim(),
                aircraftIds: selectedAircraftIds,
              });
            }}
            onCancel={() => onOpenChange(false)}
            isPending={isPending}
            aircraft={aircraft}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
