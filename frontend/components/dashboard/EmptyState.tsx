export function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="py-20 text-center">
      <h3 className="font-semibold text-text-strong">No prototypes found</h3>
      <p className="mt-1 text-sm text-text-muted">
        {hasQuery
          ? "Try a different search, or upload a new HTML prototype."
          : "Try a different search, or upload a new HTML prototype."}
      </p>
    </div>
  );
}
