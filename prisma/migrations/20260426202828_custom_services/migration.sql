-- AlterTable
ALTER TABLE `smmadvertisingboard` MODIFY `body` TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE `CustomService` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `priceUsd` DECIMAL(10, 2) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomServiceOrder` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('ORDERED', 'DONE') NOT NULL DEFAULT 'ORDERED',
    `clientNote` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomServiceOrder_userId_idx`(`userId`),
    INDEX `CustomServiceOrder_serviceId_idx`(`serviceId`),
    INDEX `CustomServiceOrder_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomServiceOrder` ADD CONSTRAINT `CustomServiceOrder_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `CustomService`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomServiceOrder` ADD CONSTRAINT `CustomServiceOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
