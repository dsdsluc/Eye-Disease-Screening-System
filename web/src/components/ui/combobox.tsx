"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Combobox<Value>({ ...props }: ComboboxPrimitive.Root.Props<Value>) {
  return <ComboboxPrimitive.Root data-slot="combobox" {...props} />
}

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "h-11 w-full rounded-xl border border-border bg-background pr-3 pl-10.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function ComboboxContent({
  className,
  children,
  sideOffset = 6,
  ...props
}: Omit<ComboboxPrimitive.Positioner.Props, "children"> & { children?: ComboboxPrimitive.List.Props["children"] }) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        data-slot="combobox-positioner"
        sideOffset={sideOffset}
        className="z-50 w-(--anchor-width) outline-none"
        {...props}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-popup"
          className={cn(
            "glossy shadow-bubble max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-1 text-sm text-foreground outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
        >
          <ComboboxPrimitive.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
            Không tìm thấy thuốc phù hợp.
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List>{children}</ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "flex cursor-default items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none select-none data-highlighted:bg-secondary",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator>
        <CheckIcon className="h-3.5 w-3.5 text-teal-deep" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

export { Combobox, ComboboxInput, ComboboxContent, ComboboxItem }
