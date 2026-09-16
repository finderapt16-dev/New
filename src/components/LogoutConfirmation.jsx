import { LogOut } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
export function LogoutConfirmation({ children, onConfirm }) {
    return (<AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="logout-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="logout-dialog-title">Log out of Rentiloilo?</AlertDialogTitle>
          <AlertDialogDescription>
            You will need to sign in again to access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="logout-dialog-cancel">Stay logged in</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="logout-dialog-confirm">
            <LogOut className="logout-dialog-icon"/>
            Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>);
}
