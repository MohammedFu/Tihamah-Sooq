import type { AdminIdentity } from "./auth";
import type { EntityId, IsoDateString, MoneyAmount } from "./common";
import type { Listing, User } from "./marketplace";

export const COMMISSION_STATUSES = ["unpaid", "paid", "verified", "rejected"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export type Commission = Readonly<{
  id: EntityId;
  listingId: EntityId;
  listing: Listing | null;
  sellerId: EntityId;
  seller: User | null;
  amount: MoneyAmount;
  soldPrice: MoneyAmount | null;
  status: CommissionStatus;
  transferReceiptUrl: string | null;
  verifiedById: EntityId | null;
  verifiedBy: AdminIdentity | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString | null;
}>;

export const REPORT_STATUSES = ["open", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_TYPES = ["fraud", "misleading", "sold", "prohibited", "other"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export type Report = Readonly<{
  id: EntityId;
  listingId: EntityId | null;
  listing: Listing | null;
  reporterId: EntityId;
  reporter: User | null;
  type: ReportType;
  reason: string;
  status: ReportStatus;
  resolutionNotes: string | null;
  resolvedById: EntityId | null;
  resolvedBy: AdminIdentity | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString | null;
}>;
