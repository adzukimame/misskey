export default class AddSensitivityDetectionServiceUrl1763990264668 {
		name = 'AddSensitivityDetectionServiceUrl1763990264668'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "sensitivityDetectionServiceUrl" character varying(1024)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "sensitivityDetectionServiceUrl"`);
    }
}
