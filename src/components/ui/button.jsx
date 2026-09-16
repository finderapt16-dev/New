import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "./utils";
const buttonVariants = cva("ui-button", {
    variants: {
        variant: {
            default: "ui-button-default",
            destructive: "ui-button-destructive",
            outline: "ui-button-outline",
            secondary: "ui-button-secondary",
            ghost: "ui-button-ghost",
            link: "ui-button-link",
        },
        size: {
            default: "ui-button-size-default",
            sm: "ui-button-size-sm",
            lg: "ui-button-size-lg",
            icon: "ui-button-size-icon",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
        return (<Slot data-slot="button" className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}/>);
    }
    return (<button data-slot="button" className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}/>);
});
Button.displayName = "Button";
export { Button, buttonVariants };
