-- CreateTable
CREATE TABLE `SmmClientCategory` (
    `id` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(255) NOT NULL,
    `nameAr` VARCHAR(255) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmmClientCategoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `markupPct` DOUBLE NOT NULL DEFAULT 0,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SmmClientCategoryItem_serviceId_key`(`serviceId`),
    INDEX `SmmClientCategoryItem_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SmmClientCategoryItem` ADD CONSTRAINT `SmmClientCategoryItem_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `SmmClientCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmmClientCategoryItem` ADD CONSTRAINT `SmmClientCategoryItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `SmmService`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

