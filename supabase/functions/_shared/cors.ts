export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  // PATCH and DELETE are not CORS-safelisted, so without listing them here the
  // browser's preflight blocks product edit/activate/delete calls (POST/GET
  // would still work, hiding the problem). Keep this in sync with the methods
  // the products function actually serves.
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};
