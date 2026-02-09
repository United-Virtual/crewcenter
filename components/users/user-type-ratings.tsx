'use client';

import { AddTypeRatingDropdown } from '@/components/users/typeratings/add-typerating-dropdown';
import { RemoveTypeRatingButton } from '@/components/users/typeratings/remove-typerating-button';

interface UserTypeRatingsProps {
  user: {
    id: string;
    name: string | null;
  };
  typeRatings: Array<{ id: string; name: string }>;
  userTypeRating: { id: string; name: string } | null;
  canManageTypeRatings: boolean;
  typeRatingChangeDivisor: number;
}

export function UserTypeRatings({
  user,
  typeRatings,
  userTypeRating,
  canManageTypeRatings,
  typeRatingChangeDivisor,
}: UserTypeRatingsProps) {
  const availableTypeRatings = userTypeRating
    ? typeRatings.filter((rating) => rating.id !== userTypeRating.id)
    : typeRatings;
  const currentTypeRatingName = userTypeRating?.name;
  const hasExistingRating = Boolean(userTypeRating);

  return (
    <div className="rounded-lg border border-input bg-panel p-6">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Type Ratings
          </p>
          <h3 className="text-xl font-semibold text-foreground">
            Manage Aircraft Eligibility
          </h3>
        </div>

        <div className="flex flex-wrap gap-3">
          {userTypeRating && (
            <div className="group relative">
              <div className="inline-flex items-center px-4 py-2 rounded-lg bg-panel text-panel-foreground border border-input hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium">
                <span>{userTypeRating.name}</span>
                {canManageTypeRatings && (
                  <div className="ml-3">
                    <RemoveTypeRatingButton
                      userId={user.id}
                      typeRatingId={userTypeRating.id}
                      typeRatingName={userTypeRating.name}
                      userName={user.name || undefined}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {canManageTypeRatings && (
            <AddTypeRatingDropdown
              userId={user.id}
              availableTypeRatings={availableTypeRatings}
              hasExistingRating={hasExistingRating}
              currentTypeRatingName={currentTypeRatingName}
              typeRatingChangeDivisor={typeRatingChangeDivisor}
            />
          )}

          {!userTypeRating && (
            <div className="text-sm text-muted-foreground flex items-center gap-3">
              <span>No type ratings assigned</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
