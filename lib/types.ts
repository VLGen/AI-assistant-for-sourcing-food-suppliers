export type Supplier = {
  id: string;
  name: string;
  categories: string[];
  region: string;
  city: string;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  sourceUrl?: string | null;
  minOrder?: string | null;
  priceRange?: string | null;
  certificates: string[];
  deliveryTerms?: string | null;
  workRegion: string[];
  notes?: string | null;
  verified: boolean;
};

export type SupplierQuery = {
  q?: string;
  categories?: string[];
  region?: string;
  minOrderMax?: number;
  hasPrice?: boolean;
  certificates?: string[];
  verifiedOnly?: boolean;
};
