import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { flag, type Args } from "../../util/args.mts";
import { migrate, renderMigrate } from "./migrate.mjs";

export type MigrateInput = { dryRun: boolean };
export type MigrateResult = Record<string, unknown>;

export const migrateProject = action<MigrateInput, MigrateResult>(async ({ dryRun }, { root }) => done(migrate(root, { dryRun }) as MigrateResult));

export const verb: VerbSpec<MigrateInput, MigrateResult> = {
  usage: "migrate [--dry-run]",
  output: "json",
  parse: (args: Args) => ({ dryRun: flag(args, "dry-run") }),
  run: migrateProject,
  render: renderMigrate,
};
