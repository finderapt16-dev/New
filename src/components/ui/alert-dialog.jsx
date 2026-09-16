"use client";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";
import { buttonVariants } from "./button";
import { cn } from "./utils";
function AlertDialog({ ...props }) {
    return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props}/>;
}
const AlertDialogTrigger = React.forwardRef(({ ...props }, ref) => {
    return (<AlertDialogPrimitive.Trigger ref={ref} data-slot="alert-dialog-trigger" {...props}/>);
});
AlertDialogTrigger.displayName = "AlertDialogTrigger";
function AlertDialogPortal({ ...props }) {
    return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props}/>;
}
const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => {
    return (<AlertDialogPrimitive.Overlay ref={ref} data-slot="alert-dialog-overlay" className={cn("ui-alert-dialog-overlay", className)} {...props}/>);
});
AlertDialogOverlay.displayName = "AlertDialogOverlay";
const AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => {
    return (<AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content ref={ref} data-slot="alert-dialog-content" className={cn("ui-alert-dialog-content", className)} {...props}/>
    </AlertDialogPortal>);
});
AlertDialogContent.displayName = "AlertDialogContent";
const AlertDialogHeader = React.forwardRef(({ className, ...props }, ref) => {
    return (<div ref={ref} data-slot="alert-dialog-header" className={cn("ui-alert-dialog-header", className)} {...props}/>);
});
AlertDialogHeader.displayName = "AlertDialogHeader";
const AlertDialogFooter = React.forwardRef(({ className, ...props }, ref) => {
    return (<div ref={ref} data-slot="alert-dialog-footer" className={cn("ui-alert-dialog-footer", className)} {...props}/>);
});
AlertDialogFooter.displayName = "AlertDialogFooter";
const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => {
    return (<AlertDialogPrimitive.Title ref={ref} data-slot="alert-dialog-title" className={cn("ui-alert-dialog-title", className)} {...props}/>);
});
AlertDialogTitle.displayName = "AlertDialogTitle";
const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => {
    return (<AlertDialogPrimitive.Description ref={ref} data-slot="alert-dialog-description" className={cn("ui-alert-dialog-description", className)} {...props}/>);
});
AlertDialogDescription.displayName = "AlertDialogDescription";
const AlertDialogAction = React.forwardRef(({ className, ...props }, ref) => {
    return (<AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props}/>);
});
AlertDialogAction.displayName = "AlertDialogAction";
const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => {
    return (<AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({ variant: "outline" }), className)} {...props}/>);
});
AlertDialogCancel.displayName = "AlertDialogCancel";
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger };
