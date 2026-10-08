"use client";

export default function Error({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <div className="container mx-auto px-8 xl:px-24">

            <div className="flex flex-col items-center justify-center gap-5 py-20">
                <h1 className="text-7xl text-center font-bold mb-4">Something went wrong!</h1>
                <p className="text-gray-500 mt-2">
                    {error.message}
                </p>

                <button onClick={reset}>
                    Try Again
                </button>

            </div>



        </div>
    );
}