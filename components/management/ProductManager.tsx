"use client";

import { useState } from "react";
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
import WarehouseManagerModal from "./WarehouseManagerModal";
import DigitalAssetManagerModal from "./DigitalAssetManagerModal";

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
  const [warehousesOpen, setWarehousesOpen] = useState(false);
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

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#EEEFE0] to-[#D1D8BE]/30">
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
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* HEADER */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Product Management</h1>
        <p className="text-muted-foreground">
          Manage all products in one place
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white shadow">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <h3 className="text-2xl font-bold">{filtered.length}</h3>
            </div>
            <Layers className="h-8 w-8 text-[#819A91]" />
          </CardContent>
        </Card>
      </div>

      {/* SEARCH + ADD */}
      <Card className="mb-8 bg-white shadow">
        <CardContent className="p-6 flex flex-col md:flex-row gap-4 md:items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              onClick={() => setWarehousesOpen(true)}
            >
              Warehouses
            </Button>
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
        <p className="text-center">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((p: any) => (
            <Card
              key={p.id}
              className="bg-white shadow hover:shadow-xl transition rounded-2xl overflow-hidden"
            >
              <div className="relative h-60 bg-gray-100">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-[#819A91]">
                    <ImageIcon className="h-12 w-12 text-white/70" />
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
                  {p.type === "PHYSICAL" && <p>Stock: {calculateStock(p)}</p>}
                </div>

                <p className="font-semibold text-lg mb-4">৳{p.basePrice}</p>

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
                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="p-10 text-center bg-white shadow">
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

      {warehousesOpen && (
        <WarehouseManagerModal
          open={warehousesOpen}
          onClose={() => setWarehousesOpen(false)}
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
