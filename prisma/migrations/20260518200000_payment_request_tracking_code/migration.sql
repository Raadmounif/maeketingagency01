ALTER TABLE `PaymentRequest` ADD COLUMN `trackingCode` VARCHAR(16) NULL;

UPDATE `PaymentRequest`
SET `trackingCode` = CONCAT('PAY-', UPPER(SUBSTRING(MD5(`id`), 1, 8)))
WHERE `trackingCode` IS NULL;

ALTER TABLE `PaymentRequest`
  MODIFY `trackingCode` VARCHAR(16) NOT NULL,
  ADD UNIQUE INDEX `PaymentRequest_trackingCode_key`(`trackingCode`);
