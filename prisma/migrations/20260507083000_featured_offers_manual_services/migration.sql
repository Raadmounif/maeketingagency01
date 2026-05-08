-- CreateTable
CREATE TABLE `SmmClientCategoryManualItem` (
  `id` VARCHAR(191) NOT NULL,
  `categoryId` VARCHAR(191) NOT NULL,
  `customServiceId` VARCHAR(191) NOT NULL,
  `offerUnits` INTEGER NOT NULL DEFAULT 1,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `SmmClientCategoryManualItem_categoryId_idx` (`categoryId`),
  INDEX `SmmClientCategoryManualItem_customServiceId_idx` (`customServiceId`),
  UNIQUE INDEX `SmmClientCategoryManualItem_categoryId_customServiceId_key` (`categoryId`, `customServiceId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SmmClientCategoryManualItem_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `SmmClientCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SmmClientCategoryManualItem_customServiceId_fkey` FOREIGN KEY (`customServiceId`) REFERENCES `CustomService`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmmOfferOrderManualItem` (
  `id` VARCHAR(191) NOT NULL,
  `offerOrderId` VARCHAR(191) NOT NULL,
  `customServiceId` VARCHAR(191) NOT NULL,
  `link` VARCHAR(2048) NOT NULL,
  `units` INTEGER NOT NULL,
  `customServiceOrderId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SmmOfferOrderManualItem_customServiceOrderId_key` (`customServiceOrderId`),
  INDEX `SmmOfferOrderManualItem_offerOrderId_idx` (`offerOrderId`),
  INDEX `SmmOfferOrderManualItem_customServiceId_idx` (`customServiceId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SmmOfferOrderManualItem_offerOrderId_fkey` FOREIGN KEY (`offerOrderId`) REFERENCES `SmmOfferOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SmmOfferOrderManualItem_customServiceId_fkey` FOREIGN KEY (`customServiceId`) REFERENCES `CustomService`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SmmOfferOrderManualItem_customServiceOrderId_fkey` FOREIGN KEY (`customServiceOrderId`) REFERENCES `CustomServiceOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

