import { LiveInvoicesBoard } from "../../components/LiveInvoicesBoard";

export default function LiveInvoicesPage() {
  return (
    <div className="page-stack">
      <section className="hero">
        <div className="split-hero">
          <div className="hero-panel">
            <span className="eyebrow">Live Invoice Index</span>
            <h1>Open any invoice already created on the deployed testnet contract.</h1>
            <p>
              This page lists invoices discovered directly from the live Escrowiva deployment. Select any invoice to
              open its detail workspace, review its status, and continue actions such as signing from the UI.
            </p>
          </div>
        </div>
      </section>

      <LiveInvoicesBoard
        limit={20}
        title="All Live Invoices"
        description="Invoices created on the deployed testnet contract. Open any one to review details and continue the workflow."
      />
    </div>
  );
}
