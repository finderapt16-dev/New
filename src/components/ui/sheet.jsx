"use client";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";
import { cn } from "./utils";
function Sheet({ ...props }) {
    return <SheetPrimitive.Root data-slot="sheet" {...props}/>;
}
const SheetTrigger = React.forwardRef(({ ...props }, ref) => (<SheetPrimitive.Trigger ref={ref} data-slot="sheet-trigger" {...props}/>));
SheetTrigger.displayName = "SheetTrigger";
const SheetClose = React.forwardRef(({ ...props }, ref) => (<SheetPrimitive.Close ref={ref} data-slot="sheet-close" {...props}/>));
SheetClose.displayName = "SheetClose";
function SheetPortal({ ...props }) {
    return <SheetPrimitive.Portal data-slot="sheet-portal" {...props}/>;
}
const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (<SheetPrimitive.Overlay ref={ref} data-slot="sheet-overlay" className={cn("ui-sheet-overlay", className)} {...props}/>));
SheetOverlay.displayName = "SheetOverlay";
const SheetContent = React.forwardRef(({ className, children, side = "right", ...props }, ref) => (<SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content ref={ref} data-slot="sheet-content" className={cn("ui-sheet-content", side === "right" &&
        "ui-sheet-right", side === "left" &&
        "ui-sheet-left", side === "top" &&
        "ui-sheet-top", side === "bottom" &&
        "ui-sheet-bottom", className)} {...props}>
      {children}
      <SheetPrimitive.Close className="ui-sheet-close">
        <XIcon className="ui-sheet-close-icon"/>
        <span className="ui-sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>));
SheetContent.displayName = "SheetContent";
function SheetHeader({ className, ...props }) {
    return (<div data-slot="sheet-header" className={cn("ui-sheet-header", className)} {...props}/>);
}
function SheetFooter({ className, ...props }) {
    return (<div data-slot="sheet-footer" className={cn("ui-sheet-footer", className)} {...props}/>);
}
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (<SheetPrimitive.Title ref={ref} data-slot="sheet-title" className={cn("ui-sheet-title", className)} {...props}/>));
SheetTitle.displayName = "SheetTitle";
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (<SheetPrimitive.Description ref={ref} data-slot="sheet-description" className={cn("ui-sheet-description", className)} {...props}/>));
SheetDescription.displayName = "SheetDescription";
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger };
