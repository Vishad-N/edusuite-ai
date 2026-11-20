import type { PrismaClient, UserRole } from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/auth/crypto";

/** Test-only password shared by every fixture user. */
export const PASSWORD = "Test-Pass-123!";

export type Fixtures = Awaited<ReturnType<typeof createFixtures>>;

/** Institute A with two branches and one user per role, plus institute B with one admin. */
export async function createFixtures(db: PrismaClient) {
  const passwordHash = await hashPassword(PASSWORD);

  const instA = await db.institute.create({ data: { code: "TSTA", name: "Test Institute A" } });
  const mainA = await db.branch.create({ data: { instituteId: instA.id, code: "MAIN", name: "A Main" } });
  const otherA = await db.branch.create({ data: { instituteId: instA.id, code: "SEC", name: "A Second" } });
  const instB = await db.institute.create({ data: { code: "TSTB", name: "Test Institute B" } });
  const mainB = await db.branch.create({ data: { instituteId: instB.id, code: "MAIN", name: "B Main" } });

  let n = 0;
  const user = (role: UserRole, code: string, instituteId: string, branchId: string) => {
    n += 1;
    return db.appUser.create({
      data: {
        instituteId,
        branchId,
        employeeCode: code,
        email: `${code.toLowerCase()}@test.edusuite.test`,
        phone: `+9180000000${String(n).padStart(2, "0")}`,
        displayName: code,
        fullName: code,
        role,
        passwordHash,
      },
    });
  };

  const users = {
    superadmin: await user("superadmin", "A-SA", instA.id, mainA.id),
    branchAdmin: await user("branch_admin", "A-BA", instA.id, mainA.id),
    teacher: await user("teacher", "A-T", instA.id, mainA.id),
    typist: await user("typist", "A-TY", instA.id, mainA.id),
    counselor: await user("counselor", "A-C", instA.id, otherA.id),
    otherAdmin: await user("branch_admin", "B-BA", instB.id, mainB.id),
  };
  // The teacher may also work at A's second branch (DN-015).
  await db.userBranch.create({ data: { userId: users.teacher.id, branchId: otherA.id } });

  return { instA, mainA, otherA, instB, mainB, users };
}
