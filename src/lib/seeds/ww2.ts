/**
 * WW2 Timeline Seed Data
 *
 * Creates a seeded timeline with key events from World War II
 */

import { prisma } from '@/lib/db';

export async function seedWW2Timeline() {
  // Check if WW2 timeline already exists
  const existing = await prisma.timeline.findFirst({
    where: { title: 'World War II Timeline' },
    include: { tracks: true, events: true },
  });

  if (existing) {
    // Timeline exists - delete all tracks and events, then recreate to ensure clean state
    await prisma.timelineEvent.deleteMany({
      where: { timelineId: existing.id },
    });
    await prisma.track.deleteMany({
      where: { timelineId: existing.id },
    });
    await prisma.timeline.delete({
      where: { id: existing.id },
    });
  }

  // Create the timeline
  const timeline = await prisma.timeline.create({
    data: {
      title: 'World War II Timeline',
      description: 'Key events from World War II (1939-1945)',
      visibility: 'public',
      tracks: {
        create: [
          {
            name: 'WW2 Overall',
            type: 'main',
            color: 'blue',
            order: 0,
            visible: true,
          },
          {
            name: 'United States',
            type: 'custom',
            color: 'red',
            order: 1,
            visible: true,
          },
        ],
      },
    },
    include: { tracks: true },
  });

  const mainTrack = timeline.tracks.find((t) => t.name === 'WW2 Overall')!;
  const usTrack = timeline.tracks.find((t) => t.name === 'United States')!;

  // Create events for WW2 Overall track
  const ww2Events = [
    {
      timelineId: timeline.id,
      trackId: mainTrack.id,
      title: 'Germany Invades Poland',
      description: 'Nazi Germany invades Poland, marking the beginning of World War II in Europe.',
      longDescription: '',
      startDate: '1939-09-01',
      type: 'point' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Poland',
        latitude: 52.2297,
        longitude: 21.0122,
      },
      sources: [
        {
          title: 'Invasion of Poland',
          url: 'https://en.wikipedia.org/wiki/Invasion_of_Poland',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: mainTrack.id,
      title: 'Battle of Britain',
      description:
        'The Royal Air Force defends Britain against large-scale attacks by the German Luftwaffe.',
      longDescription: '',
      startDate: '1940-07-10',
      endDate: '1940-10-31',
      type: 'span' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'United Kingdom',
        latitude: 51.5074,
        longitude: -0.1278,
      },
      sources: [
        {
          title: 'Battle of Britain',
          url: 'https://en.wikipedia.org/wiki/Battle_of_Britain',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: mainTrack.id,
      title: 'Operation Barbarossa',
      description:
        'Germany launches a massive invasion of the Soviet Union, opening the Eastern Front.',
      longDescription: '',
      startDate: '1941-06-22',
      type: 'point' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Soviet Union',
        latitude: 55.7558,
        longitude: 37.6173,
      },
      sources: [
        {
          title: 'Operation Barbarossa',
          url: 'https://en.wikipedia.org/wiki/Operation_Barbarossa',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: mainTrack.id,
      title: 'Battle of Stalingrad',
      description:
        'One of the bloodiest battles in history. Soviet victory marks a major turning point on the Eastern Front.',
      longDescription: '',
      startDate: '1942-08-23',
      endDate: '1943-02-02',
      type: 'span' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Stalingrad, Soviet Union',
        latitude: 48.708,
        longitude: 44.5133,
      },
      sources: [
        {
          title: 'Battle of Stalingrad',
          url: 'https://en.wikipedia.org/wiki/Battle_of_Stalingrad',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: mainTrack.id,
      title: 'D-Day: Normandy Invasion',
      description:
        'Allied forces launch the largest amphibious invasion in history, landing on the beaches of Normandy.',
      longDescription: '',
      startDate: '1944-06-06',
      type: 'point' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Normandy, France',
        latitude: 49.3333,
        longitude: -0.5,
      },
      sources: [
        {
          title: 'Normandy landings',
          url: 'https://en.wikipedia.org/wiki/Normandy_landings',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: mainTrack.id,
      title: 'VE Day',
      description: 'Germany surrenders unconditionally, marking the end of World War II in Europe.',
      longDescription: '',
      startDate: '1945-05-08',
      type: 'point' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Berlin, Germany',
        latitude: 52.52,
        longitude: 13.405,
      },
      sources: [
        {
          title: 'Victory in Europe Day',
          url: 'https://en.wikipedia.org/wiki/Victory_in_Europe_Day',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: mainTrack.id,
      title: 'VJ Day',
      description: 'Japan announces surrender following atomic bombings, ending World War II.',
      longDescription: '',
      startDate: '1945-08-15',
      type: 'point' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Tokyo, Japan',
        latitude: 35.6762,
        longitude: 139.6503,
      },
      sources: [
        {
          title: 'Victory over Japan Day',
          url: 'https://en.wikipedia.org/wiki/Victory_over_Japan_Day',
          type: 'wikipedia' as const,
        },
      ],
    },
  ];

  // Create events for US track
  const usEvents = [
    {
      timelineId: timeline.id,
      trackId: usTrack.id,
      title: 'Lend-Lease Act',
      description:
        'US Congress passes the Lend-Lease Act, allowing the US to supply military aid to Allied nations.',
      longDescription: '',
      startDate: '1941-03-11',
      type: 'point' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Washington, D.C.',
        latitude: 38.9072,
        longitude: -77.0369,
      },
      sources: [
        {
          title: 'Lend-Lease',
          url: 'https://en.wikipedia.org/wiki/Lend-Lease',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: usTrack.id,
      title: 'Pearl Harbor Attack',
      description:
        'Japanese forces launch a surprise attack on Pearl Harbor, bringing the United States into World War II.',
      longDescription: '',
      startDate: '1941-12-07',
      type: 'point' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Pearl Harbor, Hawaii',
        latitude: 21.3646,
        longitude: -157.95,
      },
      sources: [
        {
          title: 'Attack on Pearl Harbor',
          url: 'https://en.wikipedia.org/wiki/Attack_on_Pearl_Harbor',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: usTrack.id,
      title: 'US Declares War on Japan',
      description: 'The United States formally declares war on Japan, entering World War II.',
      longDescription: '',
      startDate: '1941-12-08',
      type: 'point' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Washington, D.C.',
        latitude: 38.9072,
        longitude: -77.0369,
      },
      sources: [
        {
          title: 'United States declaration of war on Japan',
          url: 'https://en.wikipedia.org/wiki/United_States_declaration_of_war_on_Japan',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: usTrack.id,
      title: 'Battle of Midway',
      description: 'Decisive US naval victory over Japan, turning the tide of the Pacific War.',
      longDescription: '',
      startDate: '1942-06-04',
      endDate: '1942-06-07',
      type: 'span' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Midway Atoll',
        latitude: 28.2072,
        longitude: -177.3735,
      },
      sources: [
        {
          title: 'Battle of Midway',
          url: 'https://en.wikipedia.org/wiki/Battle_of_Midway',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: usTrack.id,
      title: 'Atomic Bombing of Hiroshima',
      description: 'US drops the first atomic bomb on Hiroshima, Japan.',
      longDescription: '',
      startDate: '1945-08-06',
      type: 'point' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Hiroshima, Japan',
        latitude: 34.3853,
        longitude: 132.4553,
      },
      sources: [
        {
          title: 'Atomic bombings of Hiroshima and Nagasaki',
          url: 'https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki',
          type: 'wikipedia' as const,
        },
      ],
    },
    {
      timelineId: timeline.id,
      trackId: usTrack.id,
      title: 'Atomic Bombing of Nagasaki',
      description: 'US drops a second atomic bomb on Nagasaki, Japan.',
      longDescription: '',
      startDate: '1945-08-09',
      type: 'point' as const,
      datePrecision: 'day' as const,
      status: 'confirmed' as const,
      location: {
        name: 'Nagasaki, Japan',
        latitude: 32.7503,
        longitude: 129.8779,
      },
      sources: [
        {
          title: 'Atomic bombings of Hiroshima and Nagasaki',
          url: 'https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki',
          type: 'wikipedia' as const,
        },
      ],
    },
  ];

  // Insert all events
  await prisma.timelineEvent.createMany({
    data: [...ww2Events, ...usEvents],
  });

  // Return the complete timeline with all data
  return await prisma.timeline.findUnique({
    where: { id: timeline.id },
    include: {
      tracks: {
        orderBy: { order: 'asc' },
      },
      events: {
        orderBy: { startDate: 'asc' },
      },
    },
  });
}
