import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@tanstack/react-router";

function extractZodMessages(error) {
  if (Array.isArray(error)) {
    return error.map((e) => `${e.path?.[0] || "parameter"}: ${e.message}`);
  }

  if (Array.isArray(error?.errors)) {
    return error.errors.map(
      (e) => `${e.path?.[0] || "parameter"}: ${e.message}`,
    );
  }

  if (Array.isArray(error?.issues)) {
    return error.issues.map(
      (e) => `${e.path?.[0] || "parameter"}: ${e.message}`,
    );
  }
  // Handle case where message is a stringified array
  try {
    const parsed = JSON.parse(error?.message);
    if (Array.isArray(parsed)) {
      return parsed.map((e) => `${e.path?.[0] || "parameter"}: ${e.message}`);
    }
  } catch {
    // not JSON, ignore
  }
  return [error?.message || "There was a problem with your search parameters."];
}

function SearchParamErrorComponent({ error }) {
  const messages = extractZodMessages(error);
  const router = useRouter();
  const goBackToRequestedRoute = () => {
    router.navigate({
      to: router.state.location.pathname,
      replace: true,
    });
  };

  return (
    <div className="h-screen w-full flex items-center justify-center px-4">
      <div className="max-w-md text-center text-white space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <ul className="space-y-1 text-left list-disc list-inside">
          {messages.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
        <div className="flex justify-center">
          <Button
            className="bg-white text-black mt-4 w-[150px] h-10 font-normal rounded-md shadow-[4px_4px_4px_0px_#3CAE3F] 
                      flex justify-center items-center p-2 
                      hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200"
            onClick={goBackToRequestedRoute}
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SearchParamErrorComponent;
