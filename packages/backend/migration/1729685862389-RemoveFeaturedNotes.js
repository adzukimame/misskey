export class RemoveFeaturedNotes1729685862389 {
    name = 'RemoveFeaturedNotes1729685862389'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" DROP COLUMN "injectFeaturedNote"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" ADD "injectFeaturedNote" boolean NOT NULL DEFAULT true`);
    }
}
