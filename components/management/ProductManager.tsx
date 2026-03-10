"use client";

import { useState } from "react";
import { getInventoryStatus } from "@/lib/stock-status";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import ProductAddModal from "./ProductAddModal";
import ProductRelationsModal from "./ProductRelationsModal";
import AttributesManagerModal from "./AttributesManagerModal";
import DigitalAssetManagerModal from "./DigitalAssetManagerModal";
import SpotlightCard from "../SpotlightCard";
import type { InventoryStatus } from "@/lib/stock-status";

export default function ProductManager({
  products,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  writers,
  publishers,
  categories,
  brands,
  vatClasses,
  digitalAssets,
}: any) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [managingProduct, setManagingProduct] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [attributesOpen, setAttributesOpen] = useState(false);
  const [digitalAssetsOpen, setDigitalAssetsOpen] = useState(false);

  const filtered = products
    ?.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p: any) => p.category !== null);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (product: any) => {
    setEditing(product);
    setModalOpen(true);
  };

  const openDeleteModal = (product: any) => {
    setDeletingProduct(product);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletingProduct(null);
  };

  const openManage = (product: any) => {
    setManagingProduct(product);
    setManageOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;

    try {
      setIsDeleting(true);
      await onDelete(deletingProduct.id);
      toast.success("Product deleted successfully");
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  const calculateStock = (product: any) => {
    if (!product.variants || product.variants.length === 0) return 0;
    return product.variants.reduce(
      (acc: number, v: any) => acc + (v.stock || 0),
      0,
    );
  };

  const getProductInventorySummary = (product: any) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (product?.type !== "PHYSICAL" || variants.length === 0) {
      return { totalStock: 0, status: "IN_STOCK" as const, lowCount: 0, outCount: 0 };
    }

    const totalStock = calculateStock(product);
    const statuses = variants.map((variant: any) =>
      getInventoryStatus(variant?.stock, variant?.lowStockThreshold ?? product?.lowStockThreshold),
    );
    const lowCount = statuses.filter((status: InventoryStatus) => status === "LOW_STOCK").length;
    const outCount = statuses.filter((status: InventoryStatus) => status === "OUT_OF_STOCK").length;

    const status: InventoryStatus =
      totalStock <= 0 ? "OUT_OF_STOCK" : lowCount > 0 || outCount > 0 ? "LOW_STOCK" : "IN_STOCK";

    return {
      totalStock,
      status,
      lowCount,
      outCount,
    };
  };

  const getStatusBadgeClasses = (status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK") => {
    if (status === "OUT_OF_STOCK") return "border-destructive/20 bg-destructive/10 text-destructive";
    if (status === "LOW_STOCK") return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  };

  const getStatusLabel = (status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK") => {
    if (status === "OUT_OF_STOCK") return "Out of Stock";
    if (status === "LOW_STOCK") return "Low Stock";
    return "In Stock";
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      {/* DELETE MODAL */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingProduct?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* HEADER */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Product Management</h1>
        <p className="text-muted-foreground">
          Manage all products in one place
        </p>
      </div>

      {/* SEARCH + ADD */}
      <Card className="mb-2 bg-card flex justify-between shadow-sm border">
        <CardContent className="p-6 flex gap-4 justify-between items-center">
          <Layers className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Total Products</p>
            <h3 className="text-2xl font-bold">{filtered.length}</h3>
          </div>
        </CardContent>
        <CardContent className="p-6 flex flex-col md:flex-row gap-4 md:items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAttributesOpen(true)}
            >
              Attributes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDigitalAssetsOpen(true)}
            >
              Digital Assets
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> New Product
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LOADING */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <Card
              key={`skeleton-${index}`}
              className="bg-card shadow-sm rounded-2xl overflow-hidden border"
            >
              {/* Image Skeleton */}
              <div className="relative h-60 bg-muted">
                <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse" />
              </div>

              {/* Content Skeleton */}
              <CardContent className="p-5">
                {/* Title Skeleton */}
                <div className="h-6 bg-muted rounded animate-pulse mb-2" />

                {/* Product Info Skeletons */}
                <div className="space-y-2 mb-3">
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
                </div>

                {/* Price Skeleton */}
                <div className="h-6 bg-muted rounded w-1/3 animate-pulse mb-4" />

                {/* Buttons Skeleton */}
                <div className="flex gap-2">
                  <div className="h-9 bg-muted rounded flex-1 animate-pulse" />
                  <div className="h-9 bg-muted rounded flex-1 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((p: any) => (
            <Card
              key={p.id}
              className="bg-card shadow-sm hover:shadow-lg transition-all duration-200 rounded-2xl overflow-hidden border hover:border-primary/50"
            >
              <SpotlightCard
                className="!p-0 !border-border !bg-card !rounded-xl overflow-hidden"
                spotlightColor="rgba(0, 229, 255, 0.1)"
              >
                <div className="relative h-60 bg-muted">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                <CardContent className="p-5">
                  <h3 className="font-bold text-lg mb-2">{p.name}</h3>

                  <div className="text-sm text-muted-foreground space-y-1 mb-3">
                    <p>Category: {p.category?.name || "-"}</p>
                    <p>Brand: {p.brand?.name || "-"}</p>
                    <p>Type: {p.type || "-"}</p>
                    <p>SKU: {p.sku || "-"}</p>
                    <p>Available: {p.available ? "Yes" : "No"}</p>
                    <p>Featured: {p.featured ? "Yes" : "No"}</p>
                    {p.type === "PHYSICAL" && <p>Stock: {getProductInventorySummary(p).totalStock}</p>}
                    {p.type === "PHYSICAL" && <p>Threshold: {p.lowStockThreshold ?? 10}</p>}
                  </div>

                  <p className="font-semibold text-lg mb-4">৳{p.basePrice}</p>

                  {p.type === "PHYSICAL" && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClasses(getProductInventorySummary(p).status)}`}>
                        {getStatusLabel(getProductInventorySummary(p).status)}
                      </span>
                      {getProductInventorySummary(p).lowCount > 0 && (
                        <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                          {getProductInventorySummary(p).lowCount} low variant{getProductInventorySummary(p).lowCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {getProductInventorySummary(p).outCount > 0 && (
                        <span className="inline-flex items-center rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                          {getProductInventorySummary(p).outCount} out
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEdit(p)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Edit3 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      onClick={() => openManage(p)}
                      variant="outline"
                      className="flex-1"
                    >
                      Manage
                    </Button>
                    <Button
                      onClick={() => openDeleteModal(p)}
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </SpotlightCard>
            </Card>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="p-10 text-center bg-card shadow-sm border">
          <h3 className="text-xl font-bold mb-2">No products found</h3>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        </Card>
      )}

      {modalOpen && (
        <ProductAddModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          editing={editing}
          onSubmit={editing ? onUpdate : onCreate}
          categories={categories}
          brands={brands}
          writers={writers}
          publishers={publishers}
          vatClasses={vatClasses}
          digitalAssets={digitalAssets}
        />
      )}

      {manageOpen && (
        <ProductRelationsModal
          open={manageOpen}
          onClose={() => {
            setManageOpen(false);
            setManagingProduct(null);
          }}
          product={
            managingProduct
              ? {
                  id: managingProduct.id,
                  name: managingProduct.name,
                  type: managingProduct.type,
                }
              : null
          }
        />
      )}

      {attributesOpen && (
        <AttributesManagerModal
          open={attributesOpen}
          onClose={() => setAttributesOpen(false)}
        />
      )}

      {digitalAssetsOpen && (
        <DigitalAssetManagerModal
          open={digitalAssetsOpen}
          onClose={() => setDigitalAssetsOpen(false)}
        />
      )}
    </div>
  );
}
