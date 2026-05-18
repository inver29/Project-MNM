import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { PageIntro } from "@/components/PageParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataPagination from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import { Product, Space } from "@/types/domain";

const PRODUCTS_PER_PAGE = 8;

const Products = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    void Promise.all([apiRequest<Product[]>("/items"), apiRequest<Space[]>("/spaces")])
      .then(([loadedProducts, loadedSpaces]) => {
        setProducts(loadedProducts);
        setSpaces(loadedSpaces);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.space.slug_token === selectedCategory;
      const normalizedQuery = searchQuery.toLowerCase().trim();
      const matchesSearch =
        normalizedQuery.length === 0 ||
        product.title.toLowerCase().includes(normalizedQuery) ||
        product.summary_text.toLowerCase().includes(normalizedQuery) ||
        product.material_note.toLowerCase().includes(normalizedQuery) ||
        product.space.space_name.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  if (isLoading) {
    return <div className="page-shell py-12">Đang tải danh mục sản phẩm...</div>;
  }

  const selectedSpace = spaces.find((space) => space.slug_token === selectedCategory);

  return (
    <div className="page-shell page-stack">
      <PageIntro
        eyebrow="Danh mục sản phẩm"
        title="Tìm sản phẩm theo không gian."
      />

      <section className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="section-shell h-fit p-5 xl:sticky xl:top-28">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Tìm theo tên hoặc mô tả"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="grid gap-2.5">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSelectedCategory("all")}
              >
                <LayoutGrid className="h-4 w-4" />
                Tất cả sản phẩm
              </Button>
              {spaces.map((space) => (
                <Button
                  key={space.space_id}
                  variant={selectedCategory === space.slug_token ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedCategory(space.slug_token)}
                >
                  {space.space_name}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[0.98rem] leading-7 text-muted-foreground">
              {selectedCategory === "all"
                ? "Đang hiển thị toàn bộ sản phẩm hiện có."
                : `Đang lọc theo ${selectedSpace?.space_name || selectedCategory}.`}
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-[0.92rem]">
                {filteredProducts.length} sản phẩm
              </Badge>
              {selectedCategory !== "all" ? (
                <Badge variant="outline" className="rounded-full px-3 py-1.5 text-[0.92rem]">
                  {selectedSpace?.space_name || selectedCategory}
                </Badge>
              ) : null}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="section-shell border-dashed px-6 py-14 text-center text-muted-foreground">
              Không có sản phẩm nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.item_id} product={product} />
                ))}
              </div>

              <DataPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Products;
