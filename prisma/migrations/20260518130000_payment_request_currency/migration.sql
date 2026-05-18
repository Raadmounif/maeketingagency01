-- Payment requests: USD or SYP deposit amount

ALTER TABLE `PaymentRequest` ADD COLUMN `amountCurrency` ENUM('USD', 'SYP') NOT NULL DEFAULT 'USD',
    ADD COLUMN `amountSyp` INTEGER NOT NULL DEFAULT 0;

-- Legacy rows: amountCents already set, currency stays USD
