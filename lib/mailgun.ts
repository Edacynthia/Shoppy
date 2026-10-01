import "server-only";

type OrderLine = {
  name: string;
  quantity: number;
  unit_price_minor: number;
};

type ShippingDetails = {
  name?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendOrderConfirmation(order: {
  id: string;
  buyer_email: string;
  amount_total_minor: number;
  currency: string;
  items: OrderLine[];
  shipping_details: ShippingDetails;
}) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM_EMAIL;
  if (!apiKey || !domain || !from) throw new Error("Mailgun credentials are not configured.");

  const storeName = process.env.STORE_NAME ?? "Fieldwork Supply";
  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: order.currency.toUpperCase(),
    maximumFractionDigits: 0,
  });
  const rows = order.items
    .map((item) => `<tr><td>${escapeHtml(item.name)} × ${item.quantity}</td><td style="text-align:right">${formatter.format(item.unit_price_minor * item.quantity / 100)}</td></tr>`)
    .join("");
  const total = formatter.format(order.amount_total_minor / 100);
  const shippingLines = [
    order.shipping_details.name,
    order.shipping_details.address_line_1,
    order.shipping_details.address_line_2,
    [order.shipping_details.city, order.shipping_details.region, order.shipping_details.postal_code]
      .filter(Boolean)
      .join(", "),
    order.shipping_details.country,
  ].filter(Boolean);
  const text = [
    `Thank you for your order from ${storeName}.`,
    `Order: ${order.id}`,
    `Total: ${total}`,
    "",
    "Delivery address:",
    ...shippingLines,
  ].join("\n");
  const addressHtml = shippingLines.map((line) => `<div>${escapeHtml(line ?? "")}</div>`).join("");
  const region = process.env.MAILGUN_REGION === "EU" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  const body = new URLSearchParams({
    from: `${storeName} <${from}>`,
    to: order.buyer_email,
    subject: `Your ${storeName} order is confirmed`,
    text,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#202c24"><p style="color:#e94b31;letter-spacing:2px">${escapeHtml(storeName.toUpperCase())}</p><h1>Good things are on their way.</h1><p>Thank you for your order. We&apos;ll send another note when it ships.</p><table style="width:100%;border-collapse:collapse" cellpadding="12"><tbody>${rows}</tbody><tfoot><tr><th style="text-align:left">Total</th><th style="text-align:right">${total}</th></tr></tfoot></table><h2>Delivery address</h2>${addressHtml}<p style="color:#667066">Order ${order.id}</p></div>`,
  });
  const response = await fetch(`${region}/v3/${encodeURIComponent(domain)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) throw new Error(`Mailgun returned ${response.status}.`);
}