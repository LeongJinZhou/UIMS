/**
 * UIMS Database Seeder
 *
 * Generates dummy data for all 6 faculties, 50+ programmes, 3 intakes.
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding UIMS database...\n');

  // --- Faculties ---
  const faculties = [
    { name: 'Faculty of Computing & Information Technology', code: 'FOCIT' },
    { name: 'Faculty of Engineering', code: 'FOE' },
    { name: 'Faculty of Business & Communication', code: 'FOBC' },
    { name: 'Faculty of Medicine', code: 'FOM' },
    { name: 'Faculty of Pharmacy', code: 'FOP' },
    { name: 'Faculty of Education & Social Sciences', code: 'FOESS' },
  ];

  for (const faculty of faculties) {
    await prisma.faculty.upsert({
      where: { code: faculty.code },
      update: {},
      create: faculty,
    });
    console.log(`  ✓ Faculty: ${faculty.name}`);
  }

  // --- Sample Programmes (expand to 50+ in full seed) ---
  const programmes = [
    { facultyCode: 'FOCIT', name: 'Bachelor of Computer Science', code: 'BCS', totalCredits: 120, maxDuration: 12 },
    { facultyCode: 'FOCIT', name: 'Bachelor of Information Technology', code: 'BIT', totalCredits: 120, maxDuration: 12 },
    { facultyCode: 'FOCIT', name: 'Bachelor of Software Engineering', code: 'BSE', totalCredits: 130, maxDuration: 12 },
    { facultyCode: 'FOE', name: 'Bachelor of Electrical Engineering', code: 'BEE', totalCredits: 135, maxDuration: 14 },
    { facultyCode: 'FOE', name: 'Bachelor of Mechanical Engineering', code: 'BME', totalCredits: 135, maxDuration: 14 },
    { facultyCode: 'FOBC', name: 'Bachelor of Business Administration', code: 'BBA', totalCredits: 120, maxDuration: 12 },
    { facultyCode: 'FOBC', name: 'Bachelor of Communication', code: 'BCOM', totalCredits: 120, maxDuration: 12 },
    { facultyCode: 'FOM', name: 'Bachelor of Medicine & Surgery', code: 'MBBS', totalCredits: 200, maxDuration: 20 },
    { facultyCode: 'FOP', name: 'Bachelor of Pharmacy', code: 'BPHARM', totalCredits: 160, maxDuration: 16 },
    { facultyCode: 'FOESS', name: 'Bachelor of Education (Special Needs)', code: 'BESN', totalCredits: 120, maxDuration: 12 },
    { facultyCode: 'FOESS', name: 'Bachelor of Early Childhood Education', code: 'BECE', totalCredits: 120, maxDuration: 12 },
  ];

  for (const prog of programmes) {
    const faculty = await prisma.faculty.findUnique({ where: { code: prog.facultyCode } });
    if (!faculty) continue;

    await prisma.programme.upsert({
      where: { code: prog.code },
      update: {},
      create: {
        facultyId: faculty.id,
        name: prog.name,
        code: prog.code,
        calendarType: ['MBBS', 'BPHARM'].includes(prog.code) ? 'NON_STANDARD' : 'STANDARD',
        totalCredits: prog.totalCredits,
        maxDurationSemesters: prog.maxDuration,
      },
    });
    console.log(`  ✓ Programme: ${prog.code} — ${prog.name}`);
  }

  // --- Sample Venues ---
  const venues = [
    { name: 'Block A', building: 'A', floor: 1 },
    { name: 'Block B', building: 'B', floor: 3 },
    { name: 'Engineering Block', building: 'E', floor: 2 },
    { name: 'Medical Block', building: 'M', floor: 1 },
  ];

  for (const venue of venues) {
    const created = await prisma.venue.create({ data: venue });

    // Create rooms for each venue
    const roomCount = 5 + Math.floor(Math.random() * 5);
    for (let i = 1; i <= roomCount; i++) {
      await prisma.room.create({
        data: {
          venueId: created.id,
          code: `${venue.building}${venue.floor}-${String(i).padStart(2, '0')}`,
          name: `Room ${venue.building}${venue.floor}-${String(i).padStart(2, '0')}`,
          capacity: [30, 40, 50, 60, 80, 100, 150][Math.floor(Math.random() * 7)],
        },
      });
    }
    console.log(`  ✓ Venue: ${venue.name} (${roomCount} rooms)`);
  }

  console.log('\n✅ Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
