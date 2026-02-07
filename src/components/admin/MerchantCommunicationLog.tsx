import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Plus, Pencil, Trash2, MessageSquare } from "lucide-react";
import { CHANNEL_OPTIONS, OUTCOME_OPTIONS } from "@/lib/merchant-status";

interface Props {
  merchantId: string;
}

interface CommEntry {
  id: string;
  channel: string;
  subject: string;
  notes: string;
  outcome_status: string;
  contact_at: string;
  created_at: string;
  created_by: string;
}

export function MerchantCommunicationLog({ merchantId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommEntry | null>(null);
  const [form, setForm] = useState({ channel: "email", subject: "", notes: "", outcome_status: "open", contact_at: "" });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["merchant-comms", merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_communications")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("contact_at", { ascending: false });
      if (error) throw error;
      return data as CommEntry[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ channel: "email", subject: "", notes: "", outcome_status: "open", contact_at: new Date().toISOString().slice(0, 16) });
    setDialogOpen(true);
  };

  const openEdit = (entry: CommEntry) => {
    setEditing(entry);
    setForm({
      channel: entry.channel,
      subject: entry.subject,
      notes: entry.notes,
      outcome_status: entry.outcome_status,
      contact_at: entry.contact_at.slice(0, 16),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.subject.trim()) {
      toast({ title: "Onderwerp is verplicht", variant: "destructive" });
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from("merchant_communications")
        .update({ ...form, contact_at: form.contact_at })
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Fout", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase
        .from("merchant_communications")
        .insert({ ...form, merchant_id: merchantId, created_by: user?.id || "", contact_at: form.contact_at });
      if (error) {
        toast({ title: "Fout", description: error.message, variant: "destructive" });
        return;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["merchant-comms", merchantId] });
    toast({ title: editing ? "Contactmoment bijgewerkt" : "Contactmoment toegevoegd" });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Weet je zeker dat je dit contactmoment wilt verwijderen?")) return;
    const { error } = await supabase.from("merchant_communications").delete().eq("id", id);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["merchant-comms", merchantId] });
      toast({ title: "Contactmoment verwijderd" });
    }
  };

  const channelLabel = (val: string) => CHANNEL_OPTIONS.find(c => c.value === val)?.label || val;
  const outcomeLabel = (val: string) => OUTCOME_OPTIONS.find(o => o.value === val)?.label || val;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />Communicatie-log
        </h3>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nieuw contactmoment</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : entries && entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map(entry => (
            <Card key={entry.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{entry.subject}</span>
                    <Badge variant="outline" className="text-xs">{channelLabel(entry.channel)}</Badge>
                    <Badge
                      variant={entry.outcome_status === "completed" ? "default" : entry.outcome_status === "escalation" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {outcomeLabel(entry.outcome_status)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {entry.notes && <p className="text-sm text-muted-foreground">{entry.notes}</p>}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(entry.contact_at), "d MMMM yyyy HH:mm", { locale: nl })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Nog geen contactmomenten vastgelegd.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Contactmoment bewerken" : "Nieuw contactmoment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kanaal</Label>
                <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.outcome_status} onValueChange={v => setForm(f => ({ ...f, outcome_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OUTCOME_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Datum/tijd</Label>
              <Input type="datetime-local" value={form.contact_at} onChange={e => setForm(f => ({ ...f, contact_at: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Onderwerp</Label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Kort onderwerp..." />
            </div>
            <div className="space-y-2">
              <Label>Notities / samenvatting</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Details van het contactmoment..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSave}>{editing ? "Opslaan" : "Toevoegen"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
