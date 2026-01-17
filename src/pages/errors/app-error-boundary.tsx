import { isRouteErrorResponse, useRouteError } from "react-router";
import RouteErrorResponse from "@/components/errors/route-error-response";

export default function AppErrorBoundary()
{
    const error = useRouteError();

    if(isRouteErrorResponse(error)) {
        return <RouteErrorResponse error={error} />
    }

    return (
        <div>
            <h1>Unexpected Error</h1>
            <p>{(error as Error).message || String(error)}</p>
            <p>The stack is Here</p>
            <pre>{(error as Error).stack}</pre>
        </div>
    )
}