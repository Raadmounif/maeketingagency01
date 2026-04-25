-- CreateTable
CREATE TABLE `SiteSettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `twitterUrl` VARCHAR(512) NULL,
    `linkedinUrl` VARCHAR(512) NULL,
    `facebookUrl` VARCHAR(512) NULL,
    `instagramUrl` VARCHAR(512) NULL,
    `youtubeUrl` VARCHAR(512) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
