-- DropReseller
DROP TABLE IF EXISTS `ResellerAccount`;

ALTER TABLE `SmmService` DROP COLUMN `enabledForResellers`;
ALTER TABLE `SmmProviderConfig` DROP COLUMN `resellerMinMarginPct`;
ALTER TABLE `SmmOrder` DROP COLUMN `resellerUserId`;
ALTER TABLE `SmmOrder` DROP COLUMN `channel`;
