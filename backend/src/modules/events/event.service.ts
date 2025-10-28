import { Prisma } from '@prisma/client';
import { connectMongo, prisma } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createEventSchema } from './event.schema';
import { getCheckinModel, getCommentModel, getEventFeedModel, getPhotoModel } from '../feeds/feed.model';

export async function createEvent(input: unknown) {
  const data = createEventSchema.parse(input);

  if (data.endAt <= data.startAt) {
    throw HttpError.badRequest('endAt must be after startAt');
  }

  const [organizer, venue] = await Promise.all([
    prisma.organizer.findUnique({ where: { id: data.organizerId } }),
    prisma.venue.findUnique({ where: { id: data.venueId } }),
  ]);

  if (!organizer) {
    throw HttpError.notFound('Organizer not found');
  }

  if (!venue) {
    throw HttpError.notFound('Venue not found');
  }

  try {
    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        capacity: data.capacity,
        status: data.status,
        venueId: data.venueId,
        organizerId: data.organizerId,
      },
      include: {
        organizer: true,
        venue: true,
      },
    });

    return {
      ...event,
      registrationCount: 0,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw HttpError.conflict('An event with the same title and start date already exists');
    }

    throw error;
  }
}

export async function listEvents(upcoming?: boolean) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: upcoming ? { startAt: { gte: now } } : undefined,
    include: {
      organizer: true,
      venue: true,
      _count: {
        select: {
          registrations: true,
        },
      },
    },
    orderBy: { startAt: 'asc' },
  });

  return events.map(({ _count, ...event }) => ({
    ...event,
    registrationCount: _count.registrations,
  }));
}

export async function getEventById(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: true,
      venue: true,
      registrations: {
        include: {
          user: true,
        },
      },
      _count: {
        select: {
          registrations: true,
        },
      },
    },
  });

  if (!event) {
    throw HttpError.notFound('Event not found');
  }

  const { _count, ...rest } = event;
  return {
    ...rest,
    registrationCount: _count.registrations,
  };
}

export async function deleteEvent(id: string) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    throw HttpError.notFound('Event not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.deleteMany({
      where: {
        registration: {
          eventId: id,
        },
      },
    });
    await tx.registration.deleteMany({ where: { eventId: id } });
    await tx.event.delete({ where: { id } });
  });

  await connectMongo();
  const EventFeed = getEventFeedModel();
  const Checkin = getCheckinModel();
  const Comment = getCommentModel();
  const Photo = getPhotoModel();

  await Promise.all([
    EventFeed.deleteOne({ eventId: id }),
    Checkin.deleteMany({ eventId: id }),
    Comment.deleteMany({ eventId: id }),
    Photo.deleteMany({ eventId: id }),
  ]);
}
