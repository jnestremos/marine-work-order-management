"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
  onOpenChange,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: "default" | "destructive" | "success"
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const [shown, setShown] = useState({ title, description, confirmLabel, confirmVariant })
  if (
    open &&
    (shown.title !== title ||
      shown.description !== description ||
      shown.confirmLabel !== confirmLabel ||
      shown.confirmVariant !== confirmVariant)
  ) {
    setShown({ title, description, confirmLabel, confirmVariant })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{shown.title}</DialogTitle>
          <DialogDescription>{shown.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant={shown.confirmVariant} onClick={onConfirm}>
            {shown.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
