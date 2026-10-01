import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="confirmation">
      <p className="eyebrow"><Check size={14} /> THANK YOU</p>
      <h1>Good things<br /><em>are in motion.</em></h1>
      <p>Your payment is confirmed. We&apos;ll email your order details and delivery address shortly.</p>
      <Link className="button button-dark" href="/">Back to Fieldwork <ArrowRight size={15} /></Link>
    </main>
  );
}