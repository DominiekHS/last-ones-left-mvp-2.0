import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SUSPENSION_REASONS, type MerchantStatus } from "@/lib/merchant-status";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface MerchantStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  merchantName: string;
  action: "suspend" | "block" | "activate";
}

export function MerchantStatusModal({ open, onOpenChange, merchantId, merchantName, action }: MerchantStatusModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [suspendedUntil, setSuspendedUntil] = useState("");
  const [dealsOffline, setDealsOffline] = useState(true);
  const [loading, setLoading] = useState(false);

  const actionLabels = {
    suspend: "Schorsen",
    block: "Blokkeren",
    activate: "Activeren",
  };

  const handleSubmit = async () => {
    if (action !== "activate" && !reason) {
      toast({ title: "Reden is verplicht", variant: "destructive" });
      return;
    }
    if (action === "suspend" && !suspendedUntil) {
      toast({ title: "Einddatum is verplicht bij schorsen", variant: "destructive" });
      return;
    }
    if (action === "suspend" && new Date(suspendedUntil) <= new Date()) {
      toast({ title: "Einddatum moet in de toekomst liggen", variant: "destructive" });
      return;
    }
    if (reason === "other" && !notes.trim()) {
      toast({ title: "Toelichting is verplicht bij 'Anders'", variant: "destructive" });
      return;
    }

    setLoading(true);

    const newStatus: MerchantStatus = action === "suspend" ? "suspended" : action === "block" ? "blocked" : "active";
    const reasonLabel = SUSPENSION_REASONS.find(r => r.value === reason)?.label || reason;

    const { error } = await supabase
      .from("merchants")
      .update({
        status: newStatus,
        blocked: newStatus === "blocked",
        suspended_until: action === "suspend" ? suspendedUntil : null,
        status_reason: action === "activate" ? notes || "Geactiveerd door admin" : reasonLabel,
        status_notes: notes || null,
        status_updated_at: new Date().toISOString(),
        status_updated_by: user?.id || null,
      })
      .eq("id", merchantId);

    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Log admin action
    await supabase.from("admin_actions").insert({
      admin_id: user?.id || "",
      action_type: `merchant_${action}`,
      target_type: "merchant",
      target_id: merchantId,
      reason: reasonLabel,
      notes,
      metadata: { suspended_until: suspendedUntil || null, deals_offline: dealsOffline },
    });

    queryClient.invalidateQueries({ queryKey: ["admin-merchant", merchantId] });
    queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
    toast({ title: `${merchantName} is nu ${newStatus === "active" ? "actief" : newStatus === "suspended" ? "geschorst" : "geblokkeerd"}` });
    onOpenChange(false);
    setReason("");
    setNotes("");
    setSuspendedUntil("");
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{actionLabels[action]}: {merchantName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {action !== "activate" && (
            <div className="space-y-2">
              <Label>Reden</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Selecteer een reden..." /></SelectTrigger>
                <SelectContent>
                  {SUSPENSION_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === "suspend" && (
            <div className="space-y-2">
              <Label>Geschorst tot en met</Label>
              <Input
                type="datetime-local"
                value={suspendedUntil}
                onChange={e => setSuspendedUntil(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{action === "activate" ? "Reden / notitie" : "Interne notitie"} {action !== "activate" && "(optioneel)"}</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={action === "activate" ? "Waarom wordt de schorsing/blokkade opgeheven?" : "Eventuele toelichting..."}
              rows={3}
            />
          </div>

          {action !== "activate" && (
            <div className="flex items-center gap-2">
              <Checkbox id="deals-offline" checked={dealsOffline} onCheckedChange={(c) => setDealsOffline(!!c)} />
              <Label htmlFor="deals-offline" className="text-sm">Zet alle actieve deals direct offline</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button
            variant={action === "activate" ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Bezig..." : actionLabels[action]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
