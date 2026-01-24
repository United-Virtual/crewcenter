'use client';

import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import { addTypeRatingAction } from '@/actions/typerating/add-typerating';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AddTypeRatingDropdownProps {
  userId: string;
  availableTypeRatings: Array<{ id: string; name: string }>;
}

export function AddTypeRatingDropdown({
  userId,
  availableTypeRatings,
}: AddTypeRatingDropdownProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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

  const handleAddTypeRating = (typeRatingId: string) => {
    setIsLoading(true);
    execute({ userId, typeRatingId });
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
          Add Type Rating
          <ChevronDown className="ml-2 h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableTypeRatings.map((typeRating) => (
          <DropdownMenuItem
            key={typeRating.id}
            onClick={() => handleAddTypeRating(typeRating.id)}
            disabled={isLoading}
          >
            {typeRating.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
