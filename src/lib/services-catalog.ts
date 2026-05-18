import { SERVICE_PAGE_CATALOG } from "@/lib/service-pages";

/** Marketing + `/services` — add entries here as new modules ship. */
export type ServiceCatalogEntry = {
  slug: string;
  name: string;
  description: string;
};

export const serviceCatalog: ReadonlyArray<ServiceCatalogEntry> = [
  ...SERVICE_PAGE_CATALOG,
  {
    slug: "trust",
    name: "SMM Growth",
    description:
      "Brand trust, reputation, and growth loops—designed as a clear service module.",
  },
];
