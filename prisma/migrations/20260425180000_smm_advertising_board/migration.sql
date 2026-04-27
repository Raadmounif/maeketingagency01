CREATE TABLE `SmmAdvertisingBoard` (
    `locale` VARCHAR(8) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `title` VARCHAR(255) NOT NULL DEFAULT '',
    `body` TEXT NOT NULL,
    `linkUrl` VARCHAR(512) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`locale`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `SmmAdvertisingBoard` (`locale`, `enabled`, `title`, `body`, `linkUrl`, `updatedAt`)
VALUES
    ('en', false, '', '', NULL, CURRENT_TIMESTAMP(3)),
    ('ar', false, '', '', NULL, CURRENT_TIMESTAMP(3));
