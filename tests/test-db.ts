export const TEST_DATABASE_URL = "postgresql://tutor:tutor@localhost:5433/tutor_test";

export async function truncateAll(db: { $executeRawUnsafe(query: string): Promise<unknown> }) {
  await db.$executeRawUnsafe(
    'TRUNCATE "Visit", "RecurringSeries", "Student", "LoginAttempt", "User" CASCADE',
  );
}
