import { PrismaClient } from '../src/generated/prisma/client.ts'

import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing planner data (dependency order matters).
  await prisma.taskDependency.deleteMany()
  await prisma.taskAssignment.deleteMany()
  await prisma.resourceUnavailability.deleteMany()
  await prisma.task.deleteMany()
  await prisma.resource.deleteMany()
  await prisma.segment.deleteMany()
  await prisma.plan.deleteMany()

  // Clear existing todos
  await prisma.todo.deleteMany()

  // Create example todos
  const todos = await prisma.todo.createMany({
    data: [
      { title: 'Buy groceries' },
      { title: 'Read a book' },
      { title: 'Workout' },
    ],
  })

  console.log(`✅ Created ${todos.count} todos`)

  const plan = await prisma.plan.create({
    data: {
      name: 'Planning Management Tool',
    },
  })

  const [segment] = await Promise.all([
    prisma.segment.create({
      data: {
        name: 'Sprint 14',
        planId: plan.id,
      },
    }),
  ])

  const [resourceA, resourceB] = await Promise.all([
    prisma.resource.create({
      data: {
        planId: plan.id,
        name: 'John Appleseed',
        picture: null,
      },
    }),
    prisma.resource.create({
      data: {
        planId: plan.id,
        name: 'Jordan Lee',
        picture: null,
      },
    }),
  ])

  const [taskA, taskB] = await Promise.all([
    prisma.task.create({
      data: {
        planId: plan.id,
        segmentId: segment.id,
        name: 'Define timeline data model',
        color: 'BLUE',
        startDayUtc: new Date('2026-03-30T00:00:00.000Z'),
        durationDays: 3,
        endDayUtc: new Date('2026-04-02T00:00:00.000Z'),
      },
    }),
    prisma.task.create({
      data: {
        planId: plan.id,
        segmentId: segment.id,
        name: 'Ship drag-and-snap prototype',
        color: 'AMBER',
        startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
        durationDays: 2,
        endDayUtc: new Date('2026-04-03T00:00:00.000Z'),
      },
    }),
  ])

  await prisma.taskAssignment.createMany({
    data: [
      { taskId: taskA.id, resourceId: resourceA.id },
      { taskId: taskB.id, resourceId: resourceA.id },
      { taskId: taskB.id, resourceId: resourceB.id },
    ],
  })

  await prisma.taskDependency.create({
    data: {
      predecessorTaskId: taskA.id,
      successorTaskId: taskB.id,
      type: 'FINISH_TO_START',
    },
  })

  await prisma.resourceUnavailability.create({
    data: {
      resourceId: resourceA.id,
      startDayUtc: new Date('2026-04-02T00:00:00.000Z'),
      endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
      reason: 'PTO',
    },
  })

  console.log('✅ Created planner fixture data')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
