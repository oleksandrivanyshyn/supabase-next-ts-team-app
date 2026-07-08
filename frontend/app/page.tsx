import { redirect } from "next/navigation";

// The app has no marketing landing page — the root just forwards into the app.
// proxy.ts / the (app) layout then bounce to /login or /onboarding as needed.
export default function Home() {
  redirect("/products");
}
