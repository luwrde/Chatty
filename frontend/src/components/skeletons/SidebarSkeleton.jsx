import { Users } from "lucide-react";

const SidebarSkeleton = () => {
  // Create 8 skeleton items
  const skeletonContacts = Array(8).fill(null);

  return (
    <aside
      className="h-full w-[4.5rem] lg:w-72 shrink-0 flex flex-col overflow-hidden rounded-box
    border border-base-300/60 bg-base-100 shadow-soft transition-all duration-200"
    >
      {/* Header */}
      <div className="border-b border-base-300/70 w-full p-3 lg:p-5">
        <div className="flex items-center justify-center lg:justify-start gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Users className="w-5 h-5" />
          </span>
          <span className="font-semibold hidden lg:block">Contacts</span>
        </div>
      </div>

      {/* Skeleton Contacts */}
      <div className="overflow-y-auto w-full p-2 space-y-1">
        {skeletonContacts.map((_, idx) => (
          <div key={idx} className="w-full p-2 flex items-center gap-3">
            {/* Avatar skeleton */}
            <div className="relative mx-auto lg:mx-0">
              <div className="skeleton size-11 rounded-full" />
            </div>

            {/* User info skeleton - only visible on larger screens */}
            <div className="hidden lg:block text-left min-w-0 flex-1">
              <div className="skeleton h-4 w-32 mb-2" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;
