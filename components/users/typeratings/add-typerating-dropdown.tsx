'use client';

import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import { addTypeRatingAction } from '@/actions/typerating/add-typerating';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog-footer';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';

interface AddTypeRatingDropdownProps {
  userId: string;
  availableTypeRatings: Array<{ id: string; name: string }>;
  hasExistingRating: boolean;
  currentTypeRatingName?: string;
  typeRatingChangeDivisor: number;
}

export function AddTypeRatingDropdown({
  userId,
  availableTypeRatings,
  hasExistingRating,
  currentTypeRatingName,
  typeRatingChangeDivisor,
}: AddTypeRatingDropdownProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTypeRating, setPendingTypeRating] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { dialogStyles } = useResponsiveDialog();

  const { execute } = useAction(addTypeRatingAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(data.message);
        router.refresh();
      }
      setIsLoading(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to add type rating');
      setIsLoading(false);
    },
  });

  const handleAddTypeRating = (typeRatingId: string, name: string) => {
    if (hasExistingRating) {
      setPendingTypeRating({ id: typeRatingId, name });
      setConfirmOpen(true);
      return;
    }
    setIsLoading(true);
    execute({ userId, typeRatingId });
  };

  const handleConfirmSwitch = () => {
    if (!pendingTypeRating) {
      return;
    }
    setIsLoading(true);
    execute({ userId, typeRatingId: pendingTypeRating.id });
    setConfirmOpen(false);
  };

  if (availableTypeRatings.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center px-4 py-2 rounded-lg bg-foreground text-background border border-input hover:bg-foreground/80 transition-colors text-sm font-medium disabled:opacity-50"
          disabled={isLoading}
        >
          {hasExistingRating ? 'Change Type Rating' : 'Set Type Rating'}
          <ChevronDown className="ml-2 h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableTypeRatings.map((typeRating) => (
          <DropdownMenuItem
            key={typeRating.id}
            onClick={() => handleAddTypeRating(typeRating.id, typeRating.name)}
            disabled={isLoading}
          >
            {typeRating.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className={dialogStyles.className}
          style={dialogStyles.style}
          showCloseButton
          transitionFrom="bottom-left"
        >
          <DialogHeader>
            <DialogTitle>Switch Type Rating</DialogTitle>
            <DialogDescription>
              {currentTypeRatingName
                ? `Switch from ${currentTypeRatingName} to ${pendingTypeRating?.name}?`
                : `Switch to ${pendingTypeRating?.name}?`}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Notice:</strong> Switching type ratings will divide career
              hours by {typeRatingChangeDivisor}.
            </p>
          </div>

          <ResponsiveDialogFooter
            primaryButton={{
              label: 'Switch Type Rating',
              onClick: handleConfirmSwitch,
              disabled: isLoading || !pendingTypeRating,
              loading: isLoading,
              loadingLabel: 'Switching...',
            }}
            secondaryButton={{
              label: 'Cancel',
              onClick: () => setConfirmOpen(false),
              disabled: isLoading,
            }}
          />
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
