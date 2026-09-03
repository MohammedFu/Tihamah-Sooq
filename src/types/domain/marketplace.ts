import type { EntityId, IsoDateString, MoneyAmount } from "./common";

export const LISTING_STATUSES = ["pending_review", "active", "sold", "rejected", "inactive"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_MEDIA_TYPES = ["image", "video"] as const;
export type ListingMediaType = (typeof LISTING_MEDIA_TYPES)[number];

export type Category = Readonly<{
  id: EntityId;
  name: string;
  iconUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: IsoDateString | null;
  updatedAt: IsoDateString | null;
}>;

export type Village = Readonly<{
  id: EntityId;
  regionId: EntityId;
  name: string;
  isActive: boolean;
  createdAt: IsoDateString | null;
  updatedAt: IsoDateString | null;
}>;

export type Region = Readonly<{
  id: EntityId;
  name: string;
  isActive: boolean;
  villages: readonly Village[];
  createdAt: IsoDateString | null;
  updatedAt: IsoDateString | null;
}>;

export type UserDevice = Readonly<{
  id: EntityId;
  userId: EntityId;
  deviceType: string;
  deviceName: string;
  lastActiveAt: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString | null;
}>;

export type UserStats = Readonly<{
  totalListings: number;
  activeListings: number;
  soldListings: number;
  totalCommissions: MoneyAmount;
  unpaidCommissions: MoneyAmount;
  totalChats: number;
  totalReports: number;
}>;

export type User = Readonly<{
  id: EntityId;
  fullName: string;
  phone: string;
  regionId: EntityId | null;
  villageId: EntityId | null;
  region: Region | null;
  village: Village | null;
  regionName: string | null;
  villageName: string | null;
  isBanned: boolean;
  banReason: string | null;
  devices: readonly UserDevice[];
  stats: UserStats | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString | null;
}>;

export type ListingMedia = Readonly<{
  id: EntityId;
  url: string;
  type: ListingMediaType;
  isPrimary: boolean;
  createdAt: IsoDateString | null;
}>;

export type Listing = Readonly<{
  id: EntityId;
  sellerId: EntityId;
  seller: User | null;
  categoryId: EntityId;
  category: Category | null;
  regionId: EntityId;
  region: Region | null;
  villageId: EntityId;
  village: Village | null;
  title: string;
  description: string;
  price: MoneyAmount;
  status: ListingStatus;
  viewCount: number | null;
  media: readonly ListingMedia[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString | null;
}>;

export const BANNER_TARGET_TYPES = ["none", "category", "listing"] as const;
export type BannerTargetType = (typeof BANNER_TARGET_TYPES)[number];

export type Banner = Readonly<{
  id: EntityId;
  title: string | null;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  targetType: BannerTargetType;
  targetId: EntityId | null;
  startsAt: IsoDateString | null;
  endsAt: IsoDateString | null;
  createdAt: IsoDateString | null;
  updatedAt: IsoDateString | null;
}>;
