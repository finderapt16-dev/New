import { Suspense } from "react";
export function PageLoader({ children }) {
    return (<Suspense fallback={<div className="page-loader-fallback">Loading page...</div>}>
      {children}
    </Suspense>);
}
