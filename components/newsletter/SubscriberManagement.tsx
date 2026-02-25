"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Mail, Trash2, Download } from "lucide-react";

interface Subscriber {
  email: string;
  status: string;
}

interface SubscribersResponse {
  success: boolean;
  data: Subscriber[];
  count: number;
}

const API_BASE = "/api/newsletter/subscribers";

export default function SubscriberManagement() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");

  const showToast = useCallback((title: string, description: string, variant: string = "default") => {
    toast({
      title,
      description,
      variant: variant as "default" | "destructive",
    });
  }, []);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data: SubscribersResponse = await response.json();
        if (data.success) {
          setSubscribers(data.data);
        } else {
          throw new Error("Failed to fetch subscribers");
        }
      } else {
        throw new Error("Failed to fetch subscribers");
      }
    } catch (error) {
      console.error("Failed to fetch subscribers:", error);
      showToast("Error", "Failed to fetch subscribers", "destructive");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newEmail }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast("Success", "Subscriber added successfully");
        setNewEmail("");
        setIsAddDialogOpen(false);
        fetchSubscribers();
      } else {
        throw new Error(result.error || "Failed to add subscriber");
      }
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to add subscriber",
        "destructive"
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmail) return;

    try {
      const response = await fetch(`${API_BASE}?email=${deletingEmail}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast("Success", "Subscriber deleted successfully");
        fetchSubscribers();
      } else {
        throw new Error(result.error || "Failed to delete subscriber");
      }
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to delete subscriber",
        "destructive"
      );
    } finally {
      setDeletingEmail(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = useCallback((email: string) => {
    setDeletingEmail(email);
    setIsDeleteDialogOpen(true);
  }, []);

  const exportSubscribers = useCallback(() => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Email,Status", ...subscribers.map(sub => `${sub.email},${sub.status}`)].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "subscribers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Success", "Subscribers exported successfully");
  }, [subscribers, showToast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E4B4B] mx-auto mb-4"></div>
          <p className="text-[#0D1414]">Loading subscribers...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#0D1414]">
            Subscriber Management
          </h2>
          <p className="text-[#2D4A3C]/70 text-sm">
            Total {subscribers.length} subscribers
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            onClick={exportSubscribers}
            variant="outline"
            className="border-[#0E4B4B] text-[#0E4B4B] hover:bg-[#0E4B4B] hover:text-white rounded-lg transition-all duration-300 w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="sm:hidden">Export</span>
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#0E4B4B] hover:bg-[#086666] text-white font-semibold px-6 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-105 border border-[#0E4B4B] w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Subscriber
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4 bg-white/95 backdrop-blur-sm border border-[#D1D8BE] rounded-2xl shadow-2xl">
              <DialogHeader className="border-b border-[#D1D8BE] pb-4">
                <DialogTitle className="text-lg sm:text-xl font-semibold text-[#0D1414]">
                  Add New Subscriber
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubscriber} className="space-y-6 pt-4">
                <div>
                  <Label htmlFor="email" className="text-[#0D1414] font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] placeholder-[#2D4A3C]/50 transition-colors duration-300"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#0E4B4B] to-[#086666] hover:from-[#0A3A3A] hover:to-[#065252] text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 border border-[#0E4B4B]"
                >
                  Add Subscriber
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Subscribers List */}
      <div className="grid gap-4">
        {subscribers.map((subscriber, index) => (
          <Card
            key={index}
            className="bg-white/90 backdrop-blur-sm border border-[#D1D8BE] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#0E4B4B] to-[#086666] rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#0D1414] text-sm sm:text-base break-words">
                      {subscriber.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          subscriber.status === "subscribed"
                            ? "bg-[#A7C1A8]"
                            : "bg-[#C0704D]"
                        }`}
                      />
                      <span
                        className={`text-xs font-medium ${
                          subscriber.status === "subscribed"
                            ? "text-[#0E4B4B]"
                            : "text-[#C0704D]"
                        }`}
                      >
                        {subscriber.status === "subscribed" ? "Subscribed" : "Unsubscribed"}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openDeleteDialog(subscriber.email)}
                  className="bg-[#C0704D] hover:bg-[#A85D3F] text-white border-[#C0704D] hover:border-[#A85D3F] rounded-lg transition-all duration-300 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {subscribers.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#EEEFE0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-[#819A91]" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-[#0D1414] mb-2">
            No subscribers yet
          </h3>
          <p className="text-[#2D4A3C]/70 mb-6 text-sm sm:text-base">
            Add your first subscriber to get started
          </p>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-[#0E4B4B] hover:bg-[#086666] text-white font-semibold px-6 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-105 border border-[#0E4B4B] w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Subscriber
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm mx-4 bg-white/95 backdrop-blur-sm border border-[#D1D8BE] rounded-2xl shadow-2xl p-4 sm:p-6">
          <DialogHeader className="border-b border-[#D1D8BE] pb-3 mb-4">
            <DialogTitle className="text-lg sm:text-xl font-semibold text-[#C0704D]">
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-[#0D1414] mb-6 text-sm sm:text-base">
            Are you sure you want to remove <strong className="break-words">{deletingEmail}</strong> from subscribers?
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              onClick={() => setIsDeleteDialogOpen(false)}
              className="bg-[#EEEFE0] text-[#0D1414] hover:bg-[#D1D8BE] rounded-lg transition-all w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-[#C0704D] hover:bg-[#A85D3F] text-white rounded-lg transition-all w-full sm:w-auto"
            >
              Remove Subscriber
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}