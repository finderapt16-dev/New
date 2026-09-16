import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "./utils";
const badgeVariants = cva("ui-badge", {
    variants: {
        variant: {
            default: "ui-badge-default",
            secondary: "ui-badge-secondary",
            destructive: "ui-badge-destructive",
            outline: "ui-badge-outline",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});
const Badge = React.forwardRef(({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "span";
    return (<Comp ref={ref} data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}/>);
});
Badge.displayName = "Badge";
export { Badge, badgeVariants };
