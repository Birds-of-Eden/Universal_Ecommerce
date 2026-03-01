import ShipmentCreateForm from "@/components/admin/shipments/ShipmentCreateForm";

export default function AdminShipmentsPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-foreground">Shipment Integration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dynamic courier-based shipment creation.
        </p>

        <div className="mt-6">
          <ShipmentCreateForm />
        </div>
      </div>
    </div>
  );
}
