import * as React from "react";
import { cn } from "./utils";
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (<input type={type} ref={ref} data-slot="input" className={cn("ui-input", "ui-input-focus", "ui-input-invalid", className)} {...props}/>);
});
Input.displayName = "Input";
export { Input };
