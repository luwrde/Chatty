// The store's order steps, as the backend reports them (status.step is an index here; -1 = cancelled or unknown)
export const ORDER_STEPS = ["Placed", "Packed", "To Ship", "In Transit", "Arrived at Hub", "To Receive", "Completed"];

export const isActiveOrder = (order) => !order.status.isCancelled && !order.status.isCompleted;

// Badge colors: waiting (amber), on the way (blue), done (green), cancelled (red)
export function getStatusBadgeClass(status) {
  if (status.isCancelled) return "bg-red-100 text-red-700";
  if (status.isCompleted) return "bg-green-100 text-green-800";
  if (status.step >= 3) return "bg-blue-100 text-blue-700";
  if (status.step >= 0) return "bg-amber-100 text-amber-800";
  return "bg-base-200 text-base-content/80";
}

// One line about what happens next
export function getStatusCaption(status) {
  if (status.isCancelled) return "This order was cancelled";
  if (status.isCompleted) return "Delivered";
  if (status.step < 0) return `Status: ${status.label}`;
  return `Step ${status.step + 1} of ${ORDER_STEPS.length} · Next: ${ORDER_STEPS[status.step + 1]}`;
}
