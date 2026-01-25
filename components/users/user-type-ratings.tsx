'use client';

import { AddTypeRatingDropdown } from '@/components/users/typeratings/add-typerating-dropdown';
import { RemoveTypeRatingButton } from '@/components/users/typeratings/remove-typerating-button';

interface UserTypeRatingsProps {
  user: {
    id: string;
    name: string | null;
  };
  typeRatings: Array<{ id: string; name: string }>;
  userTypeRatings: Array<{ id: string; name: string }>;
  canManageTypeRatings: boolean;
}

export function UserTypeRatings({
  user,
  typeRatings,
  userTypeRatings,
  canManageTypeRatings,
}: UserTypeRatingsProps) {
  const assignedIds = new Set(userTypeRatings.map((rating) => rating.id));
  const availableTypeRatings = typeRatings.filter(
    (rating) => !assignedIds.has(rating.id)
  );

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
          {userTypeRatings.map((rating) => (
            <div key={rating.id} className="group relative">
              <div className="inline-flex items-center px-4 py-2 rounded-lg bg-panel text-panel-foreground border border-input hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium">
                <span>{rating.name}</span>
                {canManageTypeRatings && (
                  <div className="ml-3">
                    <RemoveTypeRatingButton
                      userId={user.id}
                      typeRatingId={rating.id}
                      typeRatingName={rating.name}
                      userName={user.name || undefined}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {canManageTypeRatings && (
            <AddTypeRatingDropdown
              userId={user.id}
              availableTypeRatings={availableTypeRatings}
            />
          )}

          {userTypeRatings.length === 0 && (
            <div className="text-sm text-muted-foreground flex items-center gap-3">
              <span>No type ratings assigned</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
