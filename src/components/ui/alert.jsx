import { cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "./utils";
const alertVariants = cva("ui-alert", {
    variants: {
        variant: {
            default: "ui-alert-default",
            destructive: "ui-alert-destructive",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});
function Alert({ className, variant, ...props }) {
    return (<div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props}/>);
}
function AlertTitle({ className, ...props }) {
    return (<div data-slot="alert-title" className={cn("ui-alert-title", className)} {...props}/>);
}
function AlertDescription({ className, ...props }) {
    return (<div data-slot="alert-description" className={cn("ui-alert-description", className)} {...props}/>);
}
export { Alert, AlertDescription, AlertTitle };
