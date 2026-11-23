/**
 * One-time command that creates an institute, its first branch and its first
 * super admin (prompt §4 "production" profile: no seed data on the VPS).
 *
 *   docker compose -f infra/docker-compose.yml --env-file infra/.env exec api \
 *     node dist/src/scripts/createSuperAdmin.js \
 *       --institute-code DEMO --institute-name "डेमो कोचिंग संस्थान" \
 *       --branch-code MAIN --branch-name "मेन ब्रांच" \
 *       --employee-code IND-SA-1 --email owner@example.com --name "Owner Name"
 *
 * The password is asked for without echoing it. In a non-interactive shell it
 * is read from SUPERADMIN_PASSWORD instead; it is never a command-line
 * argument, so it can't end up in shell history or process lists.
 *
 * Refuses to run if the institute already has a super admin.
 *
 * With --platform it creates the EduSuite operator instead (DN-053): a
 * platform_admin who manages every institute's AI credits. Use a dedicated
 * operator institute (e.g. --institute-code EDUSUITE --branch-code HQ); the
 * command refuses an institute that has any other staff. The password comes
 * from a hidden prompt or PLATFORM_ADMIN_PASSWORD.
 */
import { parseArgs } from "node:util";
import { createInterface } from "node:readline";
import { PrismaPg } from "@prisma/adapter-pg";
import { BranchCodeSchema, EmployeeCodeSchema, MIN_PASSWORD_LENGTH, UserCreateSchema } from "@edusuite/shared";
import { ZodError } from "zod";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../auth/crypto";

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    // Print the prompt once, then swallow the typed characters.
    output._writeToOutput = (s: string) => {
      if (s.includes(prompt)) output.output.write(prompt);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function readPassword(platform: boolean): Promise<string> {
  const envName = platform ? "PLATFORM_ADMIN_PASSWORD" : "SUPERADMIN_PASSWORD";
  if (!process.stdin.isTTY) {
    const fromEnv = process.env[envName];
    if (!fromEnv) throw new Error(`No terminal: set ${envName} for this one command.`);
    return fromEnv;
  }
  const first = await readHidden(`New ${platform ? "operator" : "super admin"} password (min ${MIN_PASSWORD_LENGTH} characters): `);
  const second = await readHidden("Type it again: ");
  if (first !== second) throw new Error("The two passwords don't match.");
  return first;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "institute-code": { type: "string" },
      "institute-name": { type: "string" },
      "branch-code": { type: "string" },
      "branch-name": { type: "string" },
      "employee-code": { type: "string" },
      email: { type: "string" },
      name: { type: "string" },
      phone: { type: "string" },
      platform: { type: "boolean" },
    },
  });
  const platform = values.platform === true;
  const role = platform ? ("platform_admin" as const) : ("superadmin" as const);
  for (const key of ["institute-code", "institute-name", "branch-code", "branch-name", "employee-code", "email", "name"] as const) {
    if (!values[key]) throw new Error(`Missing --${key}`);
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const instituteCode = BranchCodeSchema.parse(values["institute-code"]);
  const branchCode = BranchCodeSchema.parse(values["branch-code"]);
  const employeeCode = EmployeeCodeSchema.parse(values["employee-code"]);
  const password = await readPassword(platform);

  // Validate everything before writing anything (the branch id is filled in later).
  const input = UserCreateSchema.parse({
    employeeCode,
    email: values.email,
    phone: values.phone,
    displayName: values.name,
    fullName: values.name,
    role: "superadmin",
    branchId: "00000000-0000-4000-8000-000000000000",
    password,
  });

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const existing = await db.institute.findUnique({ where: { code: instituteCode } });
    if (platform) {
      // The operator's institute holds only operators; it must never be a customer.
      if (existing && (await db.appUser.count({ where: { instituteId: existing.id, role: { not: "platform_admin" } } })) > 0) {
        throw new Error(`Institute ${instituteCode} has institute staff. Use a separate operator institute code.`);
      }
    } else if (existing && (await db.appUser.count({ where: { instituteId: existing.id, role: "superadmin" } })) > 0) {
      throw new Error(`Institute ${instituteCode} already has a super admin. Manage users from the app instead.`);
    }

    const passwordHash = await hashPassword(input.password);
    // Institute, branch, user and audit row are written together or not at all.
    const { user, institute, branch } = await db.$transaction(async (tx) => {
      const institute =
        existing ?? (await tx.institute.create({ data: { code: instituteCode, name: values["institute-name"]! } }));
      const branch = await tx.branch.upsert({
        where: { instituteId_code: { instituteId: institute.id, code: branchCode } },
        update: {},
        create: { instituteId: institute.id, code: branchCode, name: values["branch-name"]! },
      });
      const user = await tx.appUser.create({
        data: {
          instituteId: institute.id,
          branchId: branch.id,
          employeeCode: input.employeeCode,
          email: input.email,
          phone: input.phone ?? null,
          displayName: input.displayName,
          fullName: input.fullName,
          role,
          passwordHash,
        },
      });
      await tx.auditLog.create({
        data: {
          instituteId: institute.id,
          actorId: user.id,
          action: "user.create",
          entityType: "user",
          entityId: user.id,
          meta: { role, via: "cli" },
        },
      });
      return { user, institute, branch };
    });
    console.log(`Created ${platform ? "operator" : "super admin"} ${user.employeeCode} for ${institute.code}/${branch.code}. They can log in now.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  // Validation errors list field names and rules only; never print the password.
  if (err instanceof ZodError) {
    const fields = err.issues.map((i) => `${i.path.join(".") || "value"} (${i.message})`);
    console.error(`Invalid: ${fields.join(", ")}`);
  } else {
    console.error(err instanceof Error ? err.message.split("\n")[0] : "Failed.");
  }
  process.exit(1);
});
