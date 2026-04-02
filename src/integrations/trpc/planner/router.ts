import { TRPCError } from '@trpc/server'
import { prisma } from '#/db'
import { createTRPCRouter, publicProcedure } from '../init'
import {
  AddTaskDependencyInputSchema,
  CreatePlanInputSchema,
  CreateResourceInputSchema,
  CreateSegmentInputSchema,
  CreateTaskInputSchema,
  ListByPlanInputSchema,
  ListByPlanWindowInputSchema,
  PlannerConflictListSchema,
  PlanSchema,
  RemoveTaskAssignmentInputSchema,
  RemoveTaskDependencyInputSchema,
  ResourceSchema,
  SegmentSchema,
  TaskAssignmentSchema,
  TaskDependencySchema,
  TaskSchema,
  UpdateResourceInputSchema,
  UpdateTaskInputSchema,
  UpsertTaskAssignmentInputSchema,
} from './schemas'
import {
  assertWindow,
  buildTaskOverlapConflicts,
  buildUnavailabilityConflicts,
  computeEndDayUtc,
  dedupeConflicts,
  toUtcStartOfDay,
  wouldCreateDependencyCycle,
} from './domain'

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

        const resource = await prisma.resource.create({
          data: {
            planId: input.planId,
            userId: input.userId ?? null,
            name: input.name,
            picture: input.picture ?? null,
          },
        })

        return ResourceSchema.parse(resource)
      }),
    update: publicProcedure
      .input(UpdateResourceInputSchema)
      .output(ResourceSchema)
      .mutation(async ({ input }) => {
        const existing = await ensureResourceExists(input.id)

        const resource = await prisma.resource.update({
          where: { id: existing.id },
          data: {
            userId: input.userId,
            name: input.name,
            picture: input.picture,
          },
        })

        return ResourceSchema.parse(resource)
      }),
  }),
  tasks: createTRPCRouter({
    listByPlanWindow: publicProcedure
      .input(ListByPlanWindowInputSchema)
      .output(TaskSchema.array())
      .query(async ({ input }) => {
        await ensurePlanExists(input.planId)
        assertWindow(input.windowStartUtc, input.windowEndUtc)

        const tasks = await prisma.task.findMany({
          where: {
            planId: input.planId,
            startDayUtc: { lt: input.windowEndUtc },
            endDayUtc: { gt: input.windowStartUtc },
          },
          orderBy: [{ startDayUtc: 'asc' }, { createdAt: 'asc' }],
        })

        return TaskSchema.array().parse(tasks)
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
        const endDayUtc = computeEndDayUtc(startDayUtc, input.durationDays)

        const task = await prisma.task.create({
          data: {
            planId: input.planId,
            segmentId: input.segmentId ?? null,
            name: input.name,
            color: input.color,
            startDayUtc,
            durationDays: input.durationDays,
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
        const nextEnd = computeEndDayUtc(nextStart, nextDuration)

        const task = await prisma.task.update({
          where: { id: existing.id },
          data: {
            segmentId: input.segmentId,
            name: input.name,
            color: input.color,
            startDayUtc: nextStart,
            durationDays: nextDuration,
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
          },
          update: {},
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
  conflicts: createTRPCRouter({
    listByWindow: publicProcedure
      .input(ListByPlanWindowInputSchema)
      .output(PlannerConflictListSchema)
      .query(async ({ input }) => {
        await ensurePlanExists(input.planId)
        assertWindow(input.windowStartUtc, input.windowEndUtc)

        const [assignments, unavailabilityWindows] = await Promise.all([
          prisma.taskAssignment.findMany({
            where: {
              resource: { planId: input.planId },
              task: {
                startDayUtc: { lt: input.windowEndUtc },
                endDayUtc: { gt: input.windowStartUtc },
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
              resource: { planId: input.planId },
              startDayUtc: { lt: input.windowEndUtc },
              endDayUtc: { gt: input.windowStartUtc },
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
      }),
  }),
})
