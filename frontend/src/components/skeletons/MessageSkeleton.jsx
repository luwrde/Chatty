const MessageSkeleton = () => {
  // Create an array of 6 items for skeleton messages
  const skeletonMessages = Array(6).fill(null);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-5 space-y-4">
      {skeletonMessages.map((_, idx) => (
        <div key={idx} className={`flex items-start gap-2 ${idx % 2 === 0 ? "" : "flex-row-reverse"}`}>
          <div className="skeleton size-8 shrink-0 rounded-full" />

          <div className={`flex flex-col gap-1 ${idx % 2 === 0 ? "items-start" : "items-end"}`}>
            <div className="skeleton h-14 w-[200px] max-w-full rounded-2xl" />
            <div className="skeleton h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;
