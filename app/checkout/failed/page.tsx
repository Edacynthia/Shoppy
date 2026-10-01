import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CheckoutFailedPage() {
  return (
    <main className="confirmation">
      <p className="eyebrow">PAYMENT NOT COMPLETED</p>
      <h1>Your bag is<br /><em>still yours.</em></h1>
      <p>No completed payment was confirmed. You can return to the shop and try again.</p>
      <Link className="button button-dark" href="/checkout">Return to checkout <ArrowRight size={15} /></Link>
    </main>
  );
}