import { RegistrationStatus, TicketStatus, UserRole } from '@prisma/client';
import { connectMongo, disconnectMongo, prisma } from './config/db';
import { appendFeedEntry } from './modules/feeds/feed.service';

async function main() {
  console.log('Seeding database...');

  const forceSeed = process.env.FORCE_SEED === 'true';
  const existingUsers = await prisma.user.count();

  if (existingUsers > 0 && !forceSeed) {
    console.log('Seed skipped: data already present. Set FORCE_SEED=true to overwrite.');
    return;
  }

  if (forceSeed && existingUsers > 0) {
    console.log('Force seeding enabled, existing data will be cleared.');
  }

  await prisma.ticket.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.organizer.deleteMany();
  await prisma.user.deleteMany();

  const users = await prisma.user.createMany({
    data: [
      {
        email: 'alice@example.com',
        name: 'Alice',
        role: UserRole.ADMIN,
      },
      {
        email: 'bob@example.com',
        name: 'Bob',
        role: UserRole.USER,
      },
      {
        email: 'carol@example.com',
        name: 'Carol',
        role: UserRole.USER,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Created ${users.count} users`);

  const organizer = await prisma.organizer.create({
    data: {
      name: 'Evently Org',
    },
  });

  const venue = await prisma.venue.create({
    data: {
      name: 'Grand Hall',
      address: '123 Main St, Paris',
    },
  });

  const [techEvent, meetupEvent] = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Tech Conference 2025',
        description: 'A conference about modern web development',
        startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        capacity: 150,
        status: 'PUBLISHED',
        organizerId: organizer.id,
        venueId: venue.id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Community Meetup',
        description: 'Monthly meetup for the Evently community',
        startAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        capacity: 80,
        status: 'PUBLISHED',
        organizerId: organizer.id,
        venueId: venue.id,
      },
    }),
  ]);

  console.log('Created events', techEvent.id, meetupEvent.id);

  const [alice, bob] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: 'alice@example.com' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'bob@example.com' } }),
  ]);

  const techRegistration = await prisma.registration.create({
    data: {
      userId: alice.id,
      eventId: techEvent.id,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.ticket.create({
    data: {
      registrationId: techRegistration.id,
      price: 49.99,
      status: TicketStatus.ISSUED,
    },
  });

  await prisma.registration.create({
    data: {
      userId: bob.id,
      eventId: meetupEvent.id,
      status: RegistrationStatus.PENDING,
    },
  });

  await connectMongo();

  await appendFeedEntry(techEvent.id, {
    type: 'COMMENT',
    payload: {
      author: 'Alice',
      message: 'Hâte de participer !',
    },
  });

  await appendFeedEntry(techEvent.id, {
    type: 'CHECKIN',
    payload: {
      attendee: { name: 'Alice', email: 'alice@example.com' },
      source: 'QR',
    },
  });

  await appendFeedEntry(meetupEvent.id, {
    type: 'COMMENT',
    payload: {
      author: 'Bob',
      message: 'Qui vient ce mois-ci ?',
    },
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
