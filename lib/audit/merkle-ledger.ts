import crypto from "crypto";

export interface AuditBlock {
  index: number;
  siteId: string;
  action: string;
  actorEmail: string;
  timestamp: string;
  dataHash: string;
  previousHash: string;
  merkleHash: string;
}

/**
 * Superpower 5: Merkle-Tree Cryptographic Audit Ledger Engine
 * Cryptographically chains audit records into SHA-256 Merkle hashes for 1-click SOC2 / ISO27001 proof.
 */
export function createAuditBlock(
  index: number,
  siteId: string,
  action: string,
  actorEmail: string,
  previousHash: string = "GENESIS_HASH_00000000000000000000000000000000",
  timestamp?: string
): AuditBlock {
  const ts = timestamp || new Date().toISOString();
  const rawData = `${siteId}:${action}:${actorEmail}:${ts}`;
  const dataHash = crypto.createHash("sha256").update(rawData).digest("hex");
  const merkleHash = crypto.createHash("sha256").update(`${previousHash}:${dataHash}`).digest("hex");

  return {
    index,
    siteId,
    action,
    actorEmail,
    timestamp: ts,
    dataHash,
    previousHash,
    merkleHash,
  };
}

/**
 * Verifies that a chain of cryptographic audit blocks has not been tampered with.
 */
export function verifyAuditChain(blocks: AuditBlock[]): boolean {
  if (blocks.length === 0) return true;

  for (let i = 0; i < blocks.length; i++) {
    const current = blocks[i];
    if (i > 0) {
      const prev = blocks[i - 1];
      if (current.previousHash !== prev.merkleHash) {
        return false;
      }
    }
    const rawData = `${current.siteId}:${current.action}:${current.actorEmail}:${current.timestamp}`;
    const expectedDataHash = crypto.createHash("sha256").update(rawData).digest("hex");
    if (current.dataHash !== expectedDataHash) {
      return false;
    }
    const expectedMerkle = crypto.createHash("sha256").update(`${current.previousHash}:${current.dataHash}`).digest("hex");
    if (current.merkleHash !== expectedMerkle) {
      return false;
    }
  }

  return true;
}
