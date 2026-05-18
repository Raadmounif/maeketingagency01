-- Wallet dual currency + admin FX rate + debit splits for accurate refunds

ALTER TABLE `Wallet` ADD COLUMN `balanceSyp` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `WalletTransaction` ADD COLUMN `sypAmount` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `SiteSettings` ADD COLUMN `walletSypPerUsd` DECIMAL(18, 6) NULL;

ALTER TABLE `SmmOrder` ADD COLUMN `walletDebitUsdCents` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `walletDebitSyp` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `SmmOfferOrder` ADD COLUMN `walletDebitUsdCents` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `walletDebitSyp` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `CustomServiceOrder` ADD COLUMN `walletDebitUsdCents` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `walletDebitSyp` INTEGER NOT NULL DEFAULT 0;
