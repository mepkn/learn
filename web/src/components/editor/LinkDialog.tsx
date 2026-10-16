import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function LinkDialog({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSubmit: (href: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed so each opening starts from the current link. */}
        {open && <LinkForm key={initial} initial={initial} onClose={onClose} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}

function LinkForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial: string;
  onClose: () => void;
  onSubmit: (href: string) => void;
}) {
  const [href, setHref] = useState(initial);
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(href.trim());
    onClose();
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Link</DialogTitle>
      </DialogHeader>
      <Input autoFocus placeholder="https://react.dev" value={href} onChange={(e) => setHref(e.target.value)} />
      <DialogFooter>
        {initial && (
          <Button type="button" variant="ghost" onClick={() => (onSubmit(""), onClose())}>
            Remove link
          </Button>
        )}
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}
