-- CreateTable
CREATE TABLE `SmmTopServicePick` (
  `id` VARCHAR(191) NOT NULL,
  `kind` ENUM('API','MANUAL','OFFER') NOT NULL,
  `refId` VARCHAR(191) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `SmmTopServicePick_kind_idx` (`kind`),
  INDEX `SmmTopServicePick_enabled_idx` (`enabled`),
  INDEX `SmmTopServicePick_sort_idx` (`sort`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

