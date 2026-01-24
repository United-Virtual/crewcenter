'use client';

import { MoreHorizontal, Tags, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  deleteBulkTypeRatingsAction,
  deleteTypeRatingAction,
} from '@/actions/typerating/delete-typerating';
import { getTypeRatingAircraftAction } from '@/actions/typerating/get-typerating-aircraft';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataPagination } from '@/components/ui/data-pagination';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';
import { useSession } from '@/lib/auth-client';
import { isOwnerOrAdmin } from '@/lib/roles';

import EditTypeRatingDialog from './edit-typerating-dialog';

interface TypeRatingRow {
  id: string;
  name: string;
  createdAt: string | Date;
}

interface TypeRatingsTableProps {
  typeRatings: TypeRatingRow[];
  total: number;
  limit?: number;
}

export function TypeRatingsTable({
  typeRatings,
  total,
  limit = 10,
}: TypeRatingsTableProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const canBulkDelete = isOwnerOrAdmin(session?.user?.role ?? null);
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const { dialogStyles } = useResponsiveDialog({
    maxWidth: 'sm:max-w-[420px]',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeRatingToDelete, setTypeRatingToDelete] =
    useState<TypeRatingRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [typeRatingToEdit, setTypeRatingToEdit] =
    useState<TypeRatingRow | null>(null);
  const [editAircraftIds, setEditAircraftIds] = useState<string[]>([]);
  const [selectedTypeRatingIds, setSelectedTypeRatingIds] = useState<
    Set<string>
  >(new Set());
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  const { execute: deleteTypeRating, isExecuting } = useAction(
    deleteTypeRatingAction,
    {
      onSuccess: ({ data }) => {
        toast.success(data?.message || 'Type rating deleted successfully');
        setDeleteDialogOpen(false);
        setTypeRatingToDelete(null);
        setSelectedTypeRatingIds(new Set());
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to delete type rating');
      },
    }
  );

  const { execute: deleteBulkTypeRatings, isExecuting: isBulkDeleting } =
    useAction(deleteBulkTypeRatingsAction, {
      onSuccess: ({ data }) => {
        toast.success(data?.message || 'Type ratings deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedTypeRatingIds(new Set());
        setIsBulkDelete(false);
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to delete type ratings');
      },
    });

  const { execute: fetchTypeRatingAircraft } = useAction(
    getTypeRatingAircraftAction,
    {
      onSuccess: ({ data }) => {
        if (data?.success && 'aircraftIds' in data) {
          setEditAircraftIds(data.aircraftIds);
          setEditDialogOpen(true);
        } else {
          toast.error('Failed to fetch type rating aircraft');
        }
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || 'Failed to fetch type rating aircraft'
        );
      },
    }
  );

  const handleDeleteClick = (typeRating: TypeRatingRow) => {
    setTypeRatingToDelete(typeRating);
    setIsBulkDelete(false);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedTypeRatingIds.size === 0) {
      return;
    }
    setIsBulkDelete(true);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (isBulkDelete) {
      deleteBulkTypeRatings({ ids: Array.from(selectedTypeRatingIds) });
    } else if (typeRatingToDelete) {
      deleteTypeRating({ id: typeRatingToDelete.id });
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTypeRatingToDelete(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTypeRatingIds(new Set(typeRatings.map((r) => r.id)));
    } else {
      setSelectedTypeRatingIds(new Set());
    }
  };

  const handleSelectTypeRating = (typeRatingId: string, checked: boolean) => {
    const newSelected = new Set(selectedTypeRatingIds);
    if (checked) {
      newSelected.add(typeRatingId);
    } else {
      newSelected.delete(typeRatingId);
    }
    setSelectedTypeRatingIds(newSelected);
  };

  const allSelected =
    typeRatings.length > 0 &&
    typeRatings.every((r) => selectedTypeRatingIds.has(r.id));
  const someSelected = typeRatings.some((r) => selectedTypeRatingIds.has(r.id));

  const handleEditClick = (typeRating: TypeRatingRow) => {
    setTypeRatingToEdit({ ...typeRating });
    fetchTypeRatingAircraft({ typeRatingId: typeRating.id });
  };

  const totalPages = Math.ceil(total / limit);

  const handlePageChange = async (newPage: number) => {
    await setPage(newPage);
    router.refresh();
  };

  return (
    <>
      {canBulkDelete && someSelected && (
        <div className="mb-4 flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">
              {selectedTypeRatingIds.size} type rating
              {selectedTypeRatingIds.size === 1 ? '' : 's'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDeleteClick}
              disabled={isExecuting || isBulkDeleting}
              className="flex w-full items-center justify-center gap-2 sm:w-auto"
            >
              <Trash className="h-4 w-4" />
              Delete All
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border bg-panel shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {canBulkDelete && (
                <TableHead className="w-[50px] bg-muted/50">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={isExecuting || isBulkDeleting}
                  />
                </TableHead>
              )}
              <TableHead className="bg-muted/50 font-semibold text-foreground">
                Type Rating Name
              </TableHead>
              <TableHead className="bg-muted/50 font-semibold text-foreground">
                Date Added
              </TableHead>
              <TableHead className="w-[50px] bg-muted/50" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {typeRatings.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-6 py-12 text-center text-foreground"
                  colSpan={canBulkDelete ? 4 : 3}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Tags className="h-6 w-6 text-foreground" />
                    <p>No type ratings found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              typeRatings.map((typeRating) => (
                <TableRow
                  className="transition-colors hover:bg-muted/30"
                  key={typeRating.id}
                >
                  {canBulkDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selectedTypeRatingIds.has(typeRating.id)}
                        onCheckedChange={(checked) =>
                          handleSelectTypeRating(
                            typeRating.id,
                            checked as boolean
                          )
                        }
                        disabled={isExecuting || isBulkDeleting}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium text-foreground">
                    {typeRating.name}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {new Date(typeRating.createdAt).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="h-8 w-8 p-0 text-foreground"
                          disabled={isExecuting}
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={isExecuting}
                          onClick={() => handleEditClick(typeRating)}
                        >
                          Edit Type Rating
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isExecuting}
                          onClick={() => handleDeleteClick(typeRating)}
                        >
                          Delete Type Rating
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent
          className={dialogStyles.className}
          style={dialogStyles.style}
          showCloseButton
          transitionFrom="top-right"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Delete {isBulkDelete ? 'Type Ratings' : 'Type Rating'}
            </DialogTitle>
            <DialogDescription className="text-foreground">
              {isBulkDelete
                ? `Are you sure you want to delete ${selectedTypeRatingIds.size} type rating${
                    selectedTypeRatingIds.size === 1 ? '' : 's'
                  }? This action cannot be undone.`
                : `Are you sure you want to delete "${typeRatingToDelete?.name}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <ResponsiveDialogFooter
            primaryButton={{
              label: isExecuting || isBulkDeleting ? 'Deleting...' : 'Delete',
              onClick: handleConfirmDelete,
              disabled: isExecuting || isBulkDeleting,
              loading: isExecuting || isBulkDeleting,
              loadingLabel: 'Deleting...',
              className:
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            }}
            secondaryButton={{
              label: 'Cancel',
              onClick: handleCancelDelete,
              disabled: isExecuting || isBulkDeleting,
            }}
          />
        </DialogContent>
      </Dialog>

      {typeRatingToEdit && (
        <EditTypeRatingDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          typeRating={{
            ...typeRatingToEdit,
            aircraftIds: editAircraftIds,
          }}
        />
      )}

      {totalPages > 1 && (
        <DataPagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={limit}
          itemLabelPlural="type ratings"
          onPageChange={handlePageChange}
          className="mt-4"
        />
      )}
    </>
  );
}
