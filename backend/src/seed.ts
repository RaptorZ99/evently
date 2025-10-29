import { connectMongo, disconnectMongo, prisma } from './config/db';
import { appendFeedEntry } from './modules/feeds/feed.service';
import { getCheckinModel, getCommentModel, getEventFeedModel, getPhotoModel } from './modules/feeds/feed.model';
import { randomUUID } from 'crypto';

async function main() {
  console.log('Seeding database (raw SQL + Mongo)...');

  // Check if seeding is necessary
  const forceSeed = process.env.FORCE_SEED === 'true';

  const [{ count: existingUsers } ] = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM "User"
  `;
  // Skip seeding if data exists and not forcing
  if (existingUsers > 0 && !forceSeed) {
    console.log('Seed skipped: data already present. Set FORCE_SEED=true to overwrite.');
    return;
  }

  if (forceSeed && existingUsers > 0) {
    console.log('Force seeding enabled, existing data will be cleared.');
  }

  // Wipe relational data in dependency order
  await prisma.$queryRaw`DELETE FROM "Ticket"`;
  await prisma.$queryRaw`DELETE FROM "Registration"`;
  await prisma.$queryRaw`DELETE FROM "Event"`;
  await prisma.$queryRaw`DELETE FROM "Venue"`;
  await prisma.$queryRaw`DELETE FROM "Organizer"`;
  await prisma.$queryRaw`DELETE FROM "User"`;

  // Users
  const aliceId = randomUUID();
  const bobId = randomUUID();
  const carolId = randomUUID();
  await prisma.$queryRaw`
    INSERT INTO "User" (id, email, name, role, "updatedAt") VALUES
    (${aliceId}, 'alice@example.com', 'Alice', 'ADMIN'::"UserRole", NOW()),
    (${bobId}, 'bob@example.com', 'Bob', 'USER'::"UserRole", NOW()),
    (${carolId}, 'carol@example.com', 'Carol', 'USER'::"UserRole", NOW())
  `;
  console.log('Created 3 users');

  // Organizer & Venue
  const orgId = randomUUID();
  await prisma.$queryRaw`
    INSERT INTO "Organizer" (id, name, "updatedAt") VALUES (${orgId}, 'Evently Org', NOW())
  `;

  const venueId = randomUUID();
  await prisma.$queryRaw`
    INSERT INTO "Venue" (id, name, address, "updatedAt") VALUES (${venueId}, 'Grand Hall', '123 Main St, Paris', NOW())
  `;

  // Events
  const now = Date.now();
  const start1 = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const end1 = new Date(start1.getTime() + 3 * 60 * 60 * 1000);
  const start2 = new Date(now + 14 * 24 * 60 * 60 * 1000);
  const end2 = new Date(start2.getTime() + 2 * 60 * 60 * 1000);

  const techEventId = randomUUID();
  const meetupEventId = randomUUID();

  await prisma.$queryRaw`
    INSERT INTO "Event" (id, title, description, "startAt", "endAt", capacity, status, "organizerId", "venueId", "updatedAt") VALUES
    (${techEventId}, 'Tech Conference 2025', 'A conference about modern web development', ${start1}, ${end1}, 150, 'PUBLISHED'::"EventStatus", ${orgId}, ${venueId}, NOW()),
    (${meetupEventId}, 'Community Meetup', 'Monthly meetup for the Evently community', ${start2}, ${end2}, 80, 'PUBLISHED'::"EventStatus", ${orgId}, ${venueId}, NOW())
  `;
  console.log('Created events', techEventId, meetupEventId);

  // Registrations & ticket
  const regAliceTechId = randomUUID();
  await prisma.$queryRaw`
    INSERT INTO "Registration" (id, "userId", "eventId", status) VALUES
    (${regAliceTechId}, ${aliceId}, ${techEventId}, 'CONFIRMED'::"RegistrationStatus")
  `;

  const ticketId = randomUUID();
  await prisma.$queryRaw`
    INSERT INTO "Ticket" (id, "registrationId", price, status) VALUES
    (${ticketId}, ${regAliceTechId}, 49.99, 'ISSUED'::"TicketStatus")
  `;

  const regBobMeetupId = randomUUID();
  await prisma.$queryRaw`
    INSERT INTO "Registration" (id, "userId", "eventId", status) VALUES
    (${regBobMeetupId}, ${bobId}, ${meetupEventId}, 'PENDING'::"RegistrationStatus")
  `;

  // Mongo: reset and append a few entries
  await connectMongo();
  const EventFeed = getEventFeedModel();
  const Comment = getCommentModel();
  const Checkin = getCheckinModel();
  const Photo = getPhotoModel();
  await Promise.all([
    EventFeed.deleteMany({}),
    Comment.deleteMany({}),
    Checkin.deleteMany({}),
    Photo.deleteMany({}),
  ]);

  await appendFeedEntry(techEventId, {
    type: 'COMMENT',
    payload: { author: 'Alice', message: 'Hâte de participer !' },
  });
  await appendFeedEntry(techEventId, {
    type: 'CHECKIN',
    payload: { attendee: { name: 'Alice', email: 'alice@example.com' }, source: 'QR' },
  });
  await appendFeedEntry(meetupEventId, {
    type: 'COMMENT',
    payload: { author: 'Bob', message: 'Qui vient ce mois-ci ?' },
  });

  console.log('Seed completed');
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectMongo();
    await prisma.$disconnect();
  });
