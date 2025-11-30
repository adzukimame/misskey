export class RemoveServerMachineStats1764517649636 {
    name = 'RemoveServerMachineStats1764517649636'

    async up(queryRunner) {
			await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "enableServerMachineStats"`);
    }

    async down(queryRunner) {
			await queryRunner.query(`ALTER TABLE "meta" ADD "enableServerMachineStats" boolean NOT NULL DEFAULT false`);
    }
}
