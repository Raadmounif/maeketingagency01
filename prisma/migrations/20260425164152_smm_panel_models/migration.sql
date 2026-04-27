-- CreateTable
CREATE TABLE `SmmProviderConfig` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `baseUrl` VARCHAR(512) NOT NULL,
    `resellerMinMarginPct` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmmCategory` (
    `id` VARCHAR(191) NOT NULL,
    `providerName` VARCHAR(255) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SmmCategory_providerName_key`(`providerName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmmService` (
    `id` VARCHAR(191) NOT NULL,
    `providerServiceId` INTEGER NOT NULL,
    `providerName` VARCHAR(512) NOT NULL,
    `providerType` VARCHAR(64) NOT NULL,
    `providerRate` DECIMAL(12, 6) NOT NULL,
    `providerMin` INTEGER NOT NULL,
    `providerMax` INTEGER NOT NULL,
    `providerRefill` BOOLEAN NOT NULL DEFAULT false,
    `providerCancel` BOOLEAN NOT NULL DEFAULT false,
    `categoryId` VARCHAR(191) NOT NULL,
    `enabledForClients` BOOLEAN NOT NULL DEFAULT false,
    `enabledForResellers` BOOLEAN NOT NULL DEFAULT false,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SmmService_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `SmmService_providerServiceId_key`(`providerServiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmmMarkupRule` (
    `id` VARCHAR(191) NOT NULL,
    `scope` ENUM('GLOBAL', 'CATEGORY', 'SERVICE') NOT NULL,
    `kind` ENUM('PERCENT', 'FIXED') NOT NULL,
    `value` DOUBLE NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SmmMarkupRule_scope_idx`(`scope`),
    INDEX `SmmMarkupRule_categoryId_idx`(`categoryId`),
    INDEX `SmmMarkupRule_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Wallet` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `balanceCents` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Wallet_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WalletTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `type` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `note` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmmOrder` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `channel` ENUM('DIRECT', 'RESELLER') NOT NULL DEFAULT 'DIRECT',
    `resellerUserId` VARCHAR(191) NULL,
    `link` VARCHAR(2048) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `chargeCents` INTEGER NOT NULL,
    `providerOrderId` INTEGER NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `remains` INTEGER NULL,
    `providerCharge` DECIMAL(12, 6) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SmmOrder_userId_idx`(`userId`),
    INDEX `SmmOrder_serviceId_idx`(`serviceId`),
    INDEX `SmmOrder_providerOrderId_idx`(`providerOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResellerAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `apiKeyHash` VARCHAR(128) NOT NULL,
    `discountPct` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ResellerAccount_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SmmService` ADD CONSTRAINT `SmmService_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `SmmCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmmMarkupRule` ADD CONSTRAINT `SmmMarkupRule_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `SmmCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmmMarkupRule` ADD CONSTRAINT `SmmMarkupRule_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `SmmService`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Wallet` ADD CONSTRAINT `Wallet_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletTransaction` ADD CONSTRAINT `WalletTransaction_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmmOrder` ADD CONSTRAINT `SmmOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmmOrder` ADD CONSTRAINT `SmmOrder_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `SmmService`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResellerAccount` ADD CONSTRAINT `ResellerAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
