import { redirect } from "next/navigation";

export default function PayerPage() {
  // Payments removed: Streamora is now free. Redirect to home.
  redirect("/");
}
