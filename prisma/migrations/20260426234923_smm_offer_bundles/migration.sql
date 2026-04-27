-- AlterTable
ALTER TABLE `smmclientcategory` ADD COLUMN `offerPriceCents` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `smmclientcategoryitem` ADD COLUMN `offerQuantity` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `SmmOfferOrder` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `chargeCents` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SmmOfferOrder_userId_idx`(`userId`),
    INDEX `SmmOfferOrder_categoryId_idx`(`categoryId`),
    INDEX `SmmOfferOrder_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmmOfferOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `offerOrderId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `link` VARCHAR(2048) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `smmOrderId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SmmOfferOrderItem_smmOrderId_key`(`smmOrderId`),
    INDEX `SmmOfferOrderItem_offerOrderId_idx`(`offerOrderId`),
    INDEX `SmmOfferOrderItem_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SmmOfferOrder` ADD CONSTRAINT `SmmOfferOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmmOfferOrder` ADD CONSTRAINT `SmmOfferOrder_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `SmmClientCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmmOfferOrderItem` ADD CONSTRAINT `SmmOfferOrderItem_offerOrderId_fkey` FOREIGN KEY (`offerOrderId`) REFERENCES `SmmOfferOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmmOfferOrderItem` ADD CONSTRAINT `SmmOfferOrderItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `SmmService`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmmOfferOrderItem` ADD CONSTRAINT `SmmOfferOrderItem_smmOrderId_fkey` FOREIGN KEY (`smmOrderId`) REFERENCES `SmmOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
