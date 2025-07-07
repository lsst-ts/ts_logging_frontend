function SearchParamErrorComponent({ error }) {
  return (
    <div className="p-8 text-red-500 bg-red-50 rounded">
      <h2 className="font-bold text-lg mb-2">Invalid URL Parameters</h2>
      <div>
        {error?.message || "There was a problem with your search parameters."}
      </div>
      {/* Optionally, add a button to reset params or go home */}
      <a
        href="/nightlydigest/"
        className="mt-4 inline-block text-blue-600 underline"
      >
        Go to default view
      </a>
    </div>
  );
}
export default SearchParamErrorComponent;
