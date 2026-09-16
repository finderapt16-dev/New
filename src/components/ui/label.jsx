"use client";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";
import { cn } from "./utils";
const Label = React.forwardRef(({ className, ...props }, ref) => (<LabelPrimitive.Root ref={ref} data-slot="label" className={cn("ui-label", className)} {...props}/>));
Label.displayName = LabelPrimitive.Root.displayName;
export { Label };
