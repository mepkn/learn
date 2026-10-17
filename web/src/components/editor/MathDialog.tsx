import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface MathEdit {
  latex: string;
  block: boolean;
  pos: number | null; // null inserts a new equation
}

export function MathDialog({
  edit,
  onClose,
  onSubmit,
}: {
  edit: MathEdit | null;
  onClose: () => void;
  onSubmit: (latex: string) => void;
}) {
  return (
    <Dialog open={!!edit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {edit && <MathForm key={`${edit.pos}`} edit={edit} onClose={onClose} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}

function MathForm({ edit, onClose, onSubmit }: { edit: MathEdit; onClose: () => void; onSubmit: (latex: string) => void }) {
  const [latex, setLatex] = useState(edit.latex);
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(latex.trim());
    onClose();
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Equation (LaTeX)</DialogTitle>
      </DialogHeader>
      <textarea
        autoFocus
        rows={3}
        placeholder="E = mc^2"
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
        }}
        className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <DialogFooter>
        {edit.pos !== null && (
          <Button type="button" variant="ghost" onClick={() => (onSubmit(""), onClose())}>
            Remove
          </Button>
        )}
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}
