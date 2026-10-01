import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CheckoutProcessingPage() {
  return (
    <main className="confirmation">
      <p className="eyebrow">PAYMENT CHECK</p>
      <h1>One moment,<br /><em>please.</em></h1>
      <p>Your payment may have gone through, but we could not confirm it yet. Check your email before trying again so you don&apos;t pay twice.</p>
      <Link className="button button-dark" href="/">Back to Fieldwork <ArrowRight size={15} /></Link>
    </main>
  );
}