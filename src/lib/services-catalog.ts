/** Marketing + `/services` — add entries here as new modules ship. */
export type ServiceCatalogEntry = {
  slug: string;
  name: string;
  description: string;
};

export const serviceCatalog: ReadonlyArray<ServiceCatalogEntry> = [
  {
    slug: "trust",
    name: "SMM Growth",
    description:
      "Brand trust, reputation, and growth loops—designed as a clear service module.",
  },
];
