"use client";

import { milestoneStatuses } from "../lib/constants";
import { formatTimestamp, formatToken } from "../lib/format";
import { MilestoneData } from "../lib/types";

type Props = {
  milestones: MilestoneData[];
};

export function MilestoneList({ milestones }: Props) {
  const emptyProof = "0x" + "0".repeat(64);

  return (
    <div className="card stack">
      <div className="section-title">
        <h3>Milestones</h3>
        <span className="meta">Each tranche is tracked as a clear operational lane from advance through maturity.</span>
      </div>
      {milestones.length === 0 ? (
        <div className="empty-state">
          <strong>No milestones loaded yet.</strong>
          <span className="meta">Once an invoice is created, each tranche will appear here with status, proof, due time, and settlement readiness.</span>
        </div>
      ) : null}
      {milestones.map((milestone) => (
        <div className="milestone stack" key={milestone.id.toString()}>
          <div className="row">
            <span className="pill">Milestone #{milestone.id.toString()}</span>
            <span className={`pill ${milestoneStatuses[milestone.status] === "Disputed" ? "status-danger" : milestoneStatuses[milestone.status] === "Settled" ? "status" : "status-soft"}`}>
              {milestoneStatuses[milestone.status]}
            </span>
          </div>
          <div className="info-grid">
            <div className="info-block">
              <strong>Face value</strong>
              <div className="meta">{formatToken(milestone.faceValue)}</div>
            </div>
            <div className="info-block">
              <strong>Discounted advance</strong>
              <div className="meta">{formatToken(milestone.discountedAdvance)}</div>
            </div>
            <div className="info-block">
              <strong>Due</strong>
              <div className="meta">{formatTimestamp(milestone.dueTimestamp)}</div>
            </div>
            <div className="info-block">
              <strong>Proof reference</strong>
              <div className="meta mono">{milestone.proofHash === emptyProof ? "-" : milestone.proofHash}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
