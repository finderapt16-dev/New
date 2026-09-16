"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";
import { cn } from "./utils";
function Dialog({ ...props }) {
    return <DialogPrimitive.Root data-slot="dialog" {...props}/>;
}
const DialogTrigger = React.forwardRef((props, ref) => (<DialogPrimitive.Trigger ref={ref} data-slot="dialog-trigger" {...props}/>));
DialogTrigger.displayName = "DialogTrigger";
function DialogPortal({ ...props }) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props}/>;
}
const DialogClose = React.forwardRef((props, ref) => (<DialogPrimitive.Close ref={ref} data-slot="dialog-close" {...props}/>));
DialogClose.displayName = "DialogClose";
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => {
    return (<DialogPrimitive.Overlay ref={ref} data-slot="dialog-overlay" className={cn("ui-dialog-overlay", className)} {...props}/>);
});
DialogOverlay.displayName = "DialogOverlay";
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
    return (<DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content ref={ref} data-slot="dialog-content" className={cn("ui-dialog-content", className)} {...props}>
        {children}
        <DialogPrimitive.Close className="ui-dialog-close">
          <XIcon />
          <span className="ui-sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>);
});
DialogContent.displayName = "DialogContent";
function DialogHeader({ className, ...props }) {
    return (<div data-slot="dialog-header" className={cn("ui-dialog-header", className)} {...props}/>);
}
function DialogFooter({ className, ...props }) {
    return (<div data-slot="dialog-footer" className={cn("ui-dialog-footer", className)} {...props}/>);
}
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Title ref={ref} data-slot="dialog-title" className={cn("ui-dialog-title", className)} {...props}/>));
DialogTitle.displayName = "DialogTitle";
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Description ref={ref} data-slot="dialog-description" className={cn("ui-dialog-description", className)} {...props}/>));
DialogDescription.displayName = "DialogDescription";
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };
