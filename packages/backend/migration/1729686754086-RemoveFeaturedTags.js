export class RemoveFeaturedTags1729686754086 {
    name = 'RemoveFeaturedTags1729686754086'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "hiddenTags"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "hiddenTags" character varying(1024) array NOT NULL DEFAULT '{}'`);
    }
}
