import { InvoiceForm } from "../../components/InvoiceForm";

export default function CreateInvoicePage() {
  return (
    <div className="page-stack">
      <section className="hero">
        <div className="split-hero">
          <div className="hero-panel">
            <span className="eyebrow">Structured Origination</span>
            <h1>Create a staged financing agreement that investors can trust.</h1>
            <p>
              Define the merchant-client commercial terms once, lock them with on-chain signatures, and preserve the
              escrow-first repayment logic exactly as the invoice moves through milestone funding and maturity settlement.
            </p>
          </div>
          <div className="hero-aside">
            <div className="highlight-card stack">
              <div className="section-title">
                <h3>Operator guidance</h3>
                <span className="meta">Keep milestone values and discounted advances aligned before requesting signatures.</span>
              </div>
              <div className="notice notice-info">
                Invoice terms become commercially binding on-chain once both merchant and client sign.
              </div>
            </div>
          </div>
        </div>
      </section>
      <InvoiceForm />
    </div>
  );
}
