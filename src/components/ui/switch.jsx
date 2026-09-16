"use client";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";
import { cn } from "./utils";
const Switch = React.forwardRef(({ className, ...props }, ref) => (<SwitchPrimitive.Root ref={ref} data-slot="switch" className={cn("ui-switch", className)} {...props}>
    <SwitchPrimitive.Thumb data-slot="switch-thumb" className={cn("ui-switch-thumb")}/>
  </SwitchPrimitive.Root>));
Switch.displayName = "Switch";
export { Switch };
