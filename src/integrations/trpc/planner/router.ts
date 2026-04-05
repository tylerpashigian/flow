import { TRPCError } from '@trpc/server'
import { prisma } from '#/db'
import { createTRPCRouter, publicProcedure } from '../init'
import {
  AddTaskDependencyInputSchema,
  BoardSnapshotByWindowInputSchema,
  CreatePlanInputSchema,
  CreateResourceInputSchema,
  CreateSegmentInputSchema,
  CreateTaskInputSchema,
  ListByPlanInputSchema,
  ListByPlanWindowInputSchema,
  PlannerBoardSnapshotSchema,
  PlannerConflictListSchema,
  PlanSchema,
  RemoveTaskAssignmentInputSchema,
  RemoveTaskDependencyInputSchema,
  ResourceSchema,
  SegmentSchema,
  TaskReadSchema,
  TaskAssignmentSchema,
  TaskDependencySchema,
  TaskSchema,
  UpdateResourceInputSchema,
  UpdateTaskAssignmentProgressInputSchema,
  UpdateTaskInputSchema,
  UpsertTaskAssignmentInputSchema,
} from './schemas'
import {
  assertWindow,
  buildTaskOverlapConflicts,
  buildUnavailabilityConflicts,
  computeEndDayUtc,
  dedupeConflicts,
  isPlannerDomainValidationError,
  mapTaskToTaskRead,
  toUtcStartOfDay,
  wouldCreateDependencyCycle,
} from './domain'
import { STANDARD_EFFORT_DAY_MINUTES } from './constants'

function mapPlannerDomainError(error: unknown): never {
  if (isPlannerDomainValidationError(error)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    })
  }

  throw error
}

function assertWindowOrThrowTrpc(
  windowStartUtc: Date,
  windowEndUtc: Date,
): void {
  try {
    assertWindow(windowStartUtc, windowEndUtc)
  } catch (error) {
    mapPlannerDomainError(error)
  }
}

function computeEndDayUtcOrThrowTrpc(
  startDayUtc: Date,
  durationDays: number,
): Date {
  try {
    return computeEndDayUtc(startDayUtc, durationDays)
  } catch (error) {
    mapPlannerDomainError(error)
  }
}

function assertValidWorkWindow(
  workdayStartMinuteLocal: number,
  workdayEndMinuteLocal: number,
): void {
  if (workdayEndMinuteLocal <= workdayStartMinuteLocal) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'workdayEndMinuteLocal must be greater than workdayStartMinuteLocal',
    })
  }
}

function assertValidTimezone(timezone: string): void {
  try {
    // Throws RangeError for invalid IANA zone names.
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date())
  } catch {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid timezone',
    })
  }
}

async function listTaskReadsByPlanWindow(
  planId: string,
  windowStartUtc: Date,
  windowEndUtc: Date,
  segmentIds?: string[],
) {
  const tasks = await prisma.task.findMany({
    where: {
      planId,
      startDayUtc: { lt: windowEndUtc },
      endDayUtc: { gt: windowStartUtc },
      ...(segmentIds && segmentIds.length > 0
        ? { segmentId: { in: segmentIds } }
        : {}),
    },
    include: {
      assignments: {
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              picture: true,
              capacityPercent: true,
              workdayStartMinuteLocal: true,
              workdayEndMinuteLocal: true,
            },
          },
        },
      },
    },
    orderBy: [{ startDayUtc: 'asc' }, { createdAt: 'asc' }],
  })

  return TaskReadSchema.array().parse(
    tasks.map((task) => mapTaskToTaskRead(task, STANDARD_EFFORT_DAY_MINUTES)),
  )
}

async function listConflictsByWindow(
  planId: string,
  windowStartUtc: Date,
  windowEndUtc: Date,
) {
  const [assignments, unavailabilityWindows] = await Promise.all([
    prisma.taskAssignment.findMany({
      where: {
        resource: { planId },
        task: {
          startDayUtc: { lt: windowEndUtc },
          endDayUtc: { gt: windowStartUtc },
        },
      },
      select: {
        resourceId: true,
        task: {
          select: {
            id: true,
            startDayUtc: true,
            endDayUtc: true,
          },
        },
      },
    }),
    prisma.resourceUnavailability.findMany({
      where: {
        resource: { planId },
        startDayUtc: { lt: windowEndUtc },
        endDayUtc: { gt: windowStartUtc },
      },
      select: {
        resourceId: true,
        startDayUtc: true,
        endDayUtc: true,
        reason: true,
      },
    }),
  ])

  const assignedTasks = assignments.map((assignment) => ({
    id: assignment.task.id,
    resourceId: assignment.resourceId,
    startDayUtc: assignment.task.startDayUtc,
    endDayUtc: assignment.task.endDayUtc,
  }))

  const conflicts = dedupeConflicts([
    ...buildTaskOverlapConflicts(assignedTasks),
    ...buildUnavailabilityConflicts(assignedTasks, unavailabilityWindows),
  ])

  return PlannerConflictListSchema.parse(conflicts)
}

async function ensurePlanExists(planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } })

  if (!plan) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' })
  }

  return plan
}

async function ensureTaskExists(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } })

  if (!task) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
  }

  return task
}

async function ensureResourceExists(resourceId: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  })

  if (!resource) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' })
  }

  return resource
}

async function assertSamePlanForTaskAndResource(
  taskId: string,
  resourceId: string,
) {
  const [task, resource] = await Promise.all([
    ensureTaskExists(taskId),
    ensureResourceExists(resourceId),
  ])

  if (task.planId !== resource.planId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Task and resource must belong to the same plan',
    })
  }
}

async function assertSamePlanForDependency(
  predecessorTaskId: string,
  successorTaskId: string,
) {
  const [predecessorTask, successorTask] = await Promise.all([
    ensureTaskExists(predecessorTaskId),
    ensureTaskExists(successorTaskId),
  ])

  if (predecessorTask.planId !== successorTask.planId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Dependency tasks must belong to the same plan',
    })
  }

  return predecessorTask.planId
}

export const plannerRouter = createTRPCRouter({
  plans: createTRPCRouter({
    list: publicProcedure.output(PlanSchema.array()).query(async () => {
      const plans = await prisma.plan.findMany({
        orderBy: { createdAt: 'desc' },
      })

      return PlanSchema.array().parse(plans)
    }),
    create: publicProcedure
      .input(CreatePlanInputSchema)
      .output(PlanSchema)
      .mutation(async ({ input }) => {
        const plan = await prisma.plan.create({
          data: { name: input.name },
        })

        return PlanSchema.parse(plan)
      }),
  }),
  segments: createTRPCRouter({
    listByPlan: publicProcedure
      .input(ListByPlanInputSchema)
      .output(SegmentSchema.array())
      .query(async ({ input }) => {
        await ensurePlanExists(input.planId)

        const segments = await prisma.segment.findMany({
          where: { planId: input.planId },
          orderBy: { createdAt: 'asc' },
        })

        return SegmentSchema.array().parse(segments)
      }),
    create: publicProcedure
      .input(CreateSegmentInputSchema)
      .output(SegmentSchema)
      .mutation(async ({ input }) => {
        await ensurePlanExists(input.planId)

        const segment = await prisma.segment.create({
          data: {
            planId: input.planId,
            name: input.name,
          },
        })

        return SegmentSchema.parse(segment)
      }),
  }),
  resources: createTRPCRouter({
    listByPlan: publicProcedure
      .input(ListByPlanInputSchema)
      .output(ResourceSchema.array())
      .query(async ({ input }) => {
        await ensurePlanExists(input.planId)

        const resources = await prisma.resource.findMany({
          where: { planId: input.planId },
          orderBy: { createdAt: 'asc' },
        })

        return ResourceSchema.array().parse(resources)
      }),
    create: publicProcedure
      .input(CreateResourceInputSchema)
      .output(ResourceSchema)
      .mutation(async ({ input }) => {
        await ensurePlanExists(input.planId)
        const workdayStartMinuteLocal = input.workdayStartMinuteLocal ?? 0
        const workdayEndMinuteLocal = input.workdayEndMinuteLocal ?? 1440
        const timezone = input.timezone ?? 'UTC'
        assertValidWorkWindow(workdayStartMinuteLocal, workdayEndMinuteLocal)
        assertValidTimezone(timezone)

        const resource = await prisma.resource.create({
          data: {
            planId: input.planId,
            userId: input.userId ?? null,
            name: input.name,
            picture: input.picture ?? null,
            capacityPercent: input.capacityPercent ?? 100,
            timezone,
            workdayStartMinuteLocal,
            workdayEndMinuteLocal,
          },
        })

        return ResourceSchema.parse(resource)
      }),
    update: publicProcedure
      .input(UpdateResourceInputSchema)
      .output(ResourceSchema)
      .mutation(async ({ input }) => {
        const existing = await ensureResourceExists(input.id)
        const workdayStartMinuteLocal =
          input.workdayStartMinuteLocal ?? existing.workdayStartMinuteLocal
        const workdayEndMinuteLocal =
          input.workdayEndMinuteLocal ?? existing.workdayEndMinuteLocal
        const timezone = input.timezone ?? existing.timezone
        assertValidWorkWindow(workdayStartMinuteLocal, workdayEndMinuteLocal)
        assertValidTimezone(timezone)

        const resource = await prisma.resource.update({
          where: { id: existing.id },
          data: {
            userId: input.userId,
            name: input.name,
            picture: input.picture,
            capacityPercent: input.capacityPercent,
            timezone,
            workdayStartMinuteLocal,
            workdayEndMinuteLocal,
          },
        })

        return ResourceSchema.parse(resource)
      }),
  }),
  tasks: createTRPCRouter({
    listByPlanWindow: publicProcedure
      .input(ListByPlanWindowInputSchema)
      .output(TaskReadSchema.array())
      .query(async ({ input }) => {
        await ensurePlanExists(input.planId)
        assertWindowOrThrowTrpc(input.windowStartUtc, input.windowEndUtc)

        return listTaskReadsByPlanWindow(
          input.planId,
          input.windowStartUtc,
          input.windowEndUtc,
        )
      }),
    create: publicProcedure
      .input(CreateTaskInputSchema)
      .output(TaskSchema)
      .mutation(async ({ input }) => {
        await ensurePlanExists(input.planId)

        if (input.segmentId) {
          const segment = await prisma.segment.findUnique({
            where: { id: input.segmentId },
            select: { id: true, planId: true },
          })

          if (!segment) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Segment not found',
            })
          }

          if (segment.planId !== input.planId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Task segment must belong to the same plan',
            })
          }
        }

        const startDayUtc = toUtcStartOfDay(input.startDayUtc)
        const endDayUtc = computeEndDayUtcOrThrowTrpc(
          startDayUtc,
          input.durationDays,
        )

        const task = await prisma.task.create({
          data: {
            planId: input.planId,
            segmentId: input.segmentId ?? null,
            name: input.name,
            color: input.color,
            startDayUtc,
            durationDays: input.durationDays,
            estimatedEffortDays: input.estimatedEffortDays ?? null,
            endDayUtc,
          },
        })

        return TaskSchema.parse(task)
      }),
    update: publicProcedure
      .input(UpdateTaskInputSchema)
      .output(TaskSchema)
      .mutation(async ({ input }) => {
        const existing = await ensureTaskExists(input.id)

        if (input.segmentId) {
          const segment = await prisma.segment.findUnique({
            where: { id: input.segmentId },
            select: { id: true, planId: true },
          })

          if (!segment) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Segment not found',
            })
          }

          if (segment.planId !== existing.planId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Task segment must belong to the same plan',
            })
          }
        }

        const nextStart = input.startDayUtc
          ? toUtcStartOfDay(input.startDayUtc)
          : existing.startDayUtc
        const nextDuration = input.durationDays ?? existing.durationDays
        const nextEnd = computeEndDayUtcOrThrowTrpc(nextStart, nextDuration)

        const task = await prisma.task.update({
          where: { id: existing.id },
          data: {
            segmentId: input.segmentId,
            name: input.name,
            color: input.color,
            startDayUtc: nextStart,
            durationDays: nextDuration,
            estimatedEffortDays: input.estimatedEffortDays,
            endDayUtc: nextEnd,
          },
        })

        return TaskSchema.parse(task)
      }),
  }),
  assignments: createTRPCRouter({
    add: publicProcedure
      .input(UpsertTaskAssignmentInputSchema)
      .output(TaskAssignmentSchema)
      .mutation(async ({ input }) => {
        await assertSamePlanForTaskAndResource(input.taskId, input.resourceId)

        const assignment = await prisma.taskAssignment.upsert({
          where: {
            taskId_resourceId: {
              taskId: input.taskId,
              resourceId: input.resourceId,
            },
          },
          create: {
            taskId: input.taskId,
            resourceId: input.resourceId,
            progressPercent: input.progressPercent ?? 0,
          },
          update: {
            progressPercent: input.progressPercent,
          },
        })

        return TaskAssignmentSchema.parse(assignment)
      }),
    updateProgress: publicProcedure
      .input(UpdateTaskAssignmentProgressInputSchema)
      .output(TaskAssignmentSchema)
      .mutation(async ({ input }) => {
        await assertSamePlanForTaskAndResource(input.taskId, input.resourceId)

        const assignment = await prisma.taskAssignment.update({
          where: {
            taskId_resourceId: {
              taskId: input.taskId,
              resourceId: input.resourceId,
            },
          },
          data: {
            progressPercent: input.progressPercent,
          },
        })

        return TaskAssignmentSchema.parse(assignment)
      }),
    remove: publicProcedure
      .input(RemoveTaskAssignmentInputSchema)
      .output(TaskAssignmentSchema)
      .mutation(async ({ input }) => {
        const assignment = await prisma.taskAssignment.delete({
          where: {
            taskId_resourceId: {
              taskId: input.taskId,
              resourceId: input.resourceId,
            },
          },
        })

        return TaskAssignmentSchema.parse(assignment)
      }),
  }),
  dependencies: createTRPCRouter({
    add: publicProcedure
      .input(AddTaskDependencyInputSchema)
      .output(TaskDependencySchema)
      .mutation(async ({ input }) => {
        const planId = await assertSamePlanForDependency(
          input.predecessorTaskId,
          input.successorTaskId,
        )

        const planTaskDependencies = await prisma.taskDependency.findMany({
          where: {
            predecessorTask: { planId },
            successorTask: { planId },
          },
          select: {
            predecessorTaskId: true,
            successorTaskId: true,
          },
        })

        if (
          wouldCreateDependencyCycle(
            planTaskDependencies,
            input.predecessorTaskId,
            input.successorTaskId,
          )
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Dependency would create a cycle',
          })
        }

        const dependency = await prisma.taskDependency.create({
          data: {
            predecessorTaskId: input.predecessorTaskId,
            successorTaskId: input.successorTaskId,
            type: input.type,
          },
        })

        return TaskDependencySchema.parse(dependency)
      }),
    remove: publicProcedure
      .input(RemoveTaskDependencyInputSchema)
      .output(TaskDependencySchema)
      .mutation(async ({ input }) => {
        const dependency = await prisma.taskDependency.delete({
          where: {
            predecessorTaskId_successorTaskId: {
              predecessorTaskId: input.predecessorTaskId,
              successorTaskId: input.successorTaskId,
            },
          },
        })

        return TaskDependencySchema.parse(dependency)
      }),
  }),
  board: createTRPCRouter({
    snapshotByWindow: publicProcedure
      .input(BoardSnapshotByWindowInputSchema)
      .output(PlannerBoardSnapshotSchema)
      .query(async ({ input }) => {
        const plan = await ensurePlanExists(input.planId)
        assertWindowOrThrowTrpc(input.windowStartUtc, input.windowEndUtc)

        const tasks = await listTaskReadsByPlanWindow(
          input.planId,
          input.windowStartUtc,
          input.windowEndUtc,
          input.segmentIds,
        )

        const taskIds = [...new Set(tasks.map((task) => task.id))]
        const [dependencies, conflicts] = await Promise.all([
          taskIds.length === 0
            ? Promise.resolve([])
            : prisma.taskDependency.findMany({
                where: {
                  predecessorTask: { planId: input.planId },
                  successorTask: { planId: input.planId },
                  OR: [
                    { predecessorTaskId: { in: taskIds } },
                    { successorTaskId: { in: taskIds } },
                  ],
                },
                orderBy: { createdAt: 'asc' },
              }),
          listConflictsByWindow(
            input.planId,
            input.windowStartUtc,
            input.windowEndUtc,
          ),
        ])

        const resourceIds = [
          ...new Set(
            tasks
              .flatMap((task) => task.assignees)
              .map((assignee) => assignee.resourceId),
          ),
        ]
        const segmentIds = [
          ...new Set(
            tasks
              .map((task) => task.segmentId)
              .filter((segmentId): segmentId is string => Boolean(segmentId)),
          ),
        ]

        const [resources, segments] = await Promise.all([
          resourceIds.length === 0
            ? Promise.resolve([])
            : prisma.resource.findMany({
                where: {
                  planId: input.planId,
                  id: { in: resourceIds },
                },
                orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
              }),
          segmentIds.length === 0
            ? Promise.resolve([])
            : prisma.segment.findMany({
                where: {
                  planId: input.planId,
                  id: { in: segmentIds },
                },
                orderBy: { createdAt: 'asc' },
              }),
        ])

        return PlannerBoardSnapshotSchema.parse({
          plan,
          window: {
            windowStartUtc: input.windowStartUtc,
            windowEndUtc: input.windowEndUtc,
          },
          tasks,
          dependencies: TaskDependencySchema.array().parse(dependencies),
          conflicts,
          resources: ResourceSchema.array().parse(resources),
          segments: SegmentSchema.array().parse(segments),
        })
      }),
  }),
  conflicts: createTRPCRouter({
    listByWindow: publicProcedure
      .input(ListByPlanWindowInputSchema)
      .output(PlannerConflictListSchema)
      .query(async ({ input }) => {
        await ensurePlanExists(input.planId)
        assertWindowOrThrowTrpc(input.windowStartUtc, input.windowEndUtc)
        return listConflictsByWindow(
          input.planId,
          input.windowStartUtc,
          input.windowEndUtc,
        )
      }),
  }),
})
