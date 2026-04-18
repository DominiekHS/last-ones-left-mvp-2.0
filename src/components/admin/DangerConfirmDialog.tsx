import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface DangerConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Word de gebruiker moet typen om te bevestigen. Default: "VERWIJDER" */
  confirmWord?: string;
  /** Label van de bevestig-knop. Default: "Verwijderen" */
  actionLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Bevestigingsdialoog voor destructieve acties.
 * Vereist dat de gebruiker een specifiek woord typt (default "VERWIJDER")
 * voordat de actie-knop actief wordt. Voorkomt accidentele clicks.
 */
export function DangerConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord = "VERWIJDER",
  actionLabel = "Verwijderen",
  loading = false,
  onConfirm,
}: DangerConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const canConfirm = typed.trim() === confirmWord && !loading;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="danger-confirm-input" className="text-sm">
            Typ <span className="font-mono font-bold text-destructive">{confirmWord}</span> om te bevestigen
          </Label>
          <Input
            id="danger-confirm-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmWord}
            autoComplete="off"
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (canConfirm) onConfirm();
            }}
            disabled={!canConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Bezig..." : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
