-- Custom services: switch from fixed price to per-unit pricing, and store order inputs.

-- Rename CustomService.priceUsd -> unitPriceUsd
ALTER TABLE `CustomService`
  CHANGE COLUMN `priceUsd` `unitPriceUsd` DECIMAL(10, 2) NOT NULL;

-- CustomServiceOrder: add link + units + totalUsd
ALTER TABLE `CustomServiceOrder`
  ADD COLUMN `link` VARCHAR(2048) NOT NULL DEFAULT '' AFTER `status`,
  ADD COLUMN `units` INTEGER NOT NULL DEFAULT 1 AFTER `link`,
  ADD COLUMN `totalUsd` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER `units`;

-- Backfill totals for existing rows using service unit price, default units=1.
UPDATE `CustomServiceOrder` o
JOIN `CustomService` s ON s.`id` = o.`serviceId`
SET o.`totalUsd` = s.`unitPriceUsd`
WHERE o.`totalUsd` = 0.00;

