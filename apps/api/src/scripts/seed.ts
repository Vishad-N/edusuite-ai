/**
 * Local demo data (prompt §4 "local" profile): one demo institute with two
 * branches and one user per role, plus a second institute for "wrong
 * institute" testing. Safe to run again; it updates what already exists.
 *
 * Usage: npm run db:seed   (reads infra/.env.local)
 *
 * These are TEST passwords for local testing only. They live in this file and
 * nowhere else. The script refuses to run when NODE_ENV=production; the first
 * real super admin is created with a one-time CLI command instead.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type UserRole } from "../generated/prisma/client";
import { hashPassword } from "../auth/crypto";

type SeedUser = {
  code: string;
  email: string;
  phone: string;
  displayName: string;
  fullName: string;
  role: UserRole;
  password: string;
  branch: string;
  extraBranches?: string[];
};

const DEMO = {
  code: "DEMO",
  name: "डेमो कोचिंग संस्थान",
  branches: [
    { code: "MAIN", name: "मेन ब्रांच", city: "इंदौर" },
    { code: "GTB", name: "गीता भवन ब्रांच", city: "इंदौर" },
  ],
  users: [
    { code: "DEMO-SA", email: "superadmin@demo.edusuite.test", phone: "+919000000001", displayName: "डेमो सुपर एडमिन", fullName: "Demo Super Admin", role: "superadmin", password: "Demo-Super-2026!", branch: "MAIN" },
    { code: "DEMO-BA", email: "branchadmin@demo.edusuite.test", phone: "+919000000002", displayName: "डेमो ब्रांच एडमिन", fullName: "Demo Branch Admin", role: "branch_admin", password: "Demo-Branch-2026!", branch: "MAIN" },
    { code: "DEMO-T", email: "teacher@demo.edusuite.test", phone: "+919000000003", displayName: "डेमो शिक्षक", fullName: "Demo Teacher", role: "teacher", password: "Demo-Teacher-2026!", branch: "MAIN", extraBranches: ["GTB"] },
    { code: "DEMO-TY", email: "typist@demo.edusuite.test", phone: "+919000000004", displayName: "डेमो टाइपिस्ट", fullName: "Demo Typist", role: "typist", password: "Demo-Typist-2026!", branch: "MAIN" },
    { code: "DEMO-C", email: "counselor@demo.edusuite.test", phone: "+919000000005", displayName: "डेमो काउंसलर", fullName: "Demo Counselor", role: "counselor", password: "Demo-Counselor-2026!", branch: "GTB" },
  ] satisfies SeedUser[],
};

const OTHER = {
  code: "OTHR",
  name: "दूसरा परीक्षण संस्थान",
  branches: [{ code: "MAIN", name: "मुख्य शाखा", city: "भोपाल" }],
  users: [
    { code: "OTHR-BA", email: "branchadmin@other.edusuite.test", phone: "+919000000101", displayName: "दूसरा एडमिन", fullName: "Other Institute Admin", role: "branch_admin", password: "Other-Branch-2026!", branch: "MAIN" },
  ] satisfies SeedUser[],
};

/** The EduSuite operator (DN-053): manages every institute's AI credits. */
const OPERATOR = {
  code: "EDUSUITE",
  name: "EduSuite",
  branches: [{ code: "HQ", name: "EduSuite HQ", city: "" }],
  users: [
    { code: "DEMO-PA", email: "operator@edusuite.test", phone: "+919000000201", displayName: "EduSuite ऑपरेटर", fullName: "EduSuite Operator", role: "platform_admin", password: "Demo-Operator-2026!", branch: "HQ" },
  ] satisfies SeedUser[],
};

/** Local starting credits for the demo institutes, granted once through the ledger. */
const STARTING_CREDITS: Record<string, number> = { DEMO: 200, OTHR: 20 };

type SeedInstitute = typeof DEMO | typeof OTHER | typeof OPERATOR;

async function seedInstitute(db: PrismaClient, spec: SeedInstitute): Promise<void> {
  const institute = await db.institute.upsert({
    where: { code: spec.code },
    update: { name: spec.name },
    create: { code: spec.code, name: spec.name, aiMonthlyTokenQuota: 2_000_000 },
  });

  const branchIds = new Map<string, string>();
  for (const b of spec.branches) {
    const branch = await db.branch.upsert({
      where: { instituteId_code: { instituteId: institute.id, code: b.code } },
      update: { name: b.name, city: b.city },
      create: { instituteId: institute.id, code: b.code, name: b.name, city: b.city },
    });
    branchIds.set(b.code, branch.id);
  }

  for (const u of spec.users as SeedUser[]) {
    const branchId = branchIds.get(u.branch)!;
    const data = {
      instituteId: institute.id,
      branchId,
      email: u.email,
      phone: u.phone,
      displayName: u.displayName,
      fullName: u.fullName,
      role: u.role,
      passwordHash: await hashPassword(u.password),
      status: "active" as const,
      failedLoginCount: 0,
      lockedUntil: null,
    };
    const user = await db.appUser.upsert({
      where: { employeeCode: u.code },
      update: data,
      create: { employeeCode: u.code, ...data },
    });
    for (const extra of u.extraBranches ?? []) {
      const extraId = branchIds.get(extra)!;
      await db.userBranch.upsert({
        where: { userId_branchId: { userId: user.id, branchId: extraId } },
        update: {},
        create: { userId: user.id, branchId: extraId },
      });
    }
  }
  const credits = STARTING_CREDITS[spec.code];
  if (credits && (await db.creditLedger.count({ where: { instituteId: institute.id } })) === 0) {
    await db.$transaction(async (tx) => {
      const updated = await tx.institute.update({ where: { id: institute.id }, data: { creditBalance: { increment: credits } } });
      await tx.creditLedger.create({
        data: { instituteId: institute.id, kind: "grant", delta: credits, balanceAfter: updated.creditBalance, note: "स्थानीय डेमो क्रेडिट" },
      });
    });
  }
  console.log(`Seeded ${spec.code}: ${spec.branches.length} branches, ${spec.users.length} users.`);
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data with NODE_ENV=production.");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (run `npm run stack:env` and check infra/.env.local).");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    await seedInstitute(db, DEMO);
    await seedInstitute(db, OTHER);
    await seedInstitute(db, OPERATOR);
    // Never print passwords; they are in this file for whoever needs them.
    console.log("Done. Test logins and passwords are listed in apps/api/src/scripts/seed.ts.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
