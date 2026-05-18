import { cn } from "@/lib/utils";

type PageToken = number | "ellipsis";

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPageTokens(totalPages: number, currentPage: number): PageToken[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const tokens: PageToken[] = [1];
  const startPage = Math.max(2, currentPage - 1);
  const endPage = Math.min(totalPages - 1, currentPage + 1);

  if (startPage > 2) {
    tokens.push("ellipsis");
  }

  for (let page = startPage; page <= endPage; page += 1) {
    tokens.push(page);
  }

  if (endPage < totalPages - 1) {
    tokens.push("ellipsis");
  }

  tokens.push(totalPages);
  return tokens;
}

const segmentBaseClass =
  "flex h-11 items-center justify-center border-r border-primary/60 px-3 text-[0.95rem] font-semibold transition-colors last:border-r-0";

const DataPagination = ({ currentPage, totalPages, onPageChange, className }: DataPaginationProps) => {
  if (totalPages <= 1) {
    return null;
  }

  const pageTokens = getPageTokens(totalPages, currentPage);

  return (
    <nav aria-label="Phân trang" className={cn("flex justify-center", className)}>
      <div className="inline-flex flex-wrap items-center overflow-hidden rounded-[1.05rem] border border-primary/60 bg-background shadow-sm">
        <button
          type="button"
          className={cn(
            segmentBaseClass,
            "min-w-[4.8rem]",
            currentPage === 1
              ? "cursor-not-allowed bg-secondary/35 text-muted-foreground/70"
              : "text-primary hover:bg-secondary/55",
          )}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Trước
        </button>

        {pageTokens.map((token, index) =>
          token === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className={cn(segmentBaseClass, "min-w-[3rem] text-primary/65")}
            >
              ...
            </span>
          ) : (
            <button
              key={token}
              type="button"
              aria-current={token === currentPage ? "page" : undefined}
              className={cn(
                segmentBaseClass,
                "min-w-[3rem]",
                token === currentPage
                  ? "bg-primary text-primary-foreground"
                  : "text-primary hover:bg-secondary/55",
              )}
              onClick={() => onPageChange(token)}
            >
              {token}
            </button>
          ),
        )}

        <button
          type="button"
          className={cn(
            segmentBaseClass,
            "min-w-[4.4rem]",
            currentPage === totalPages
              ? "cursor-not-allowed bg-secondary/35 text-muted-foreground/70"
              : "text-primary hover:bg-secondary/55",
          )}
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Sau
        </button>
      </div>
    </nav>
  );
};

export default DataPagination;
