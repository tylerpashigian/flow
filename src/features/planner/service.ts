import { trpcClient } from '#/integrations/trpc/client'
import {
  AddTaskDependencyInputSchema,
  BoardSnapshotByWindowInputSchema,
  CreatePlanInputSchema,
  CreateResourceInputSchema,
  CreateSegmentInputSchema,
  CreateTaskInputSchema,
  ListByPlanInputSchema,
  PlanSchema,
  PlannerBoardSnapshotSchema,
  RemoveTaskAssignmentInputSchema,
  RemoveTaskDependencyInputSchema,
  ResourceSchema,
  SegmentSchema,
  TaskAssignmentSchema,
  TaskDependencySchema,
  TaskSchema,
  UpdateResourceInputSchema,
  UpdateSegmentInputSchema,
  UpdateTaskAssignmentProgressInputSchema,
  UpdateTaskInputSchema,
  UpsertTaskAssignmentInputSchema,
} from '#/integrations/trpc/planner/schemas'
import type {
  AddTaskDependencyInputDto,
  BoardSnapshotByWindowInputDto,
  CreatePlanInputDto,
  CreateResourceInputDto,
  CreateSegmentInputDto,
  CreateTaskInputDto,
  ListByPlanInputDto,
  RemoveTaskAssignmentInputDto,
  RemoveTaskDependencyInputDto,
  UpdateResourceInputDto,
  UpdateSegmentInputDto,
  UpdateTaskAssignmentProgressInputDto,
  UpdateTaskInputDto,
  UpsertTaskAssignmentInputDto,
} from '#/integrations/trpc/planner/schemas'
import {
  toBoardSnapshotModel,
  toPlanModel,
  toResourceModel,
  toSegmentModel,
  toTaskAssignmentModel,
  toTaskDependencyModel,
  toTaskModelFromTask,
} from '#/data/planner'
import type {
  BoardSnapshotModel,
  PlanModel,
  ResourceModel,
  SegmentModel,
  TaskAssignmentModel,
  TaskDependencyModel,
  TaskModel,
} from '#/data/planner'

export interface PlannerService {
  listPlans: () => Promise<PlanModel[]>
  createPlan: (input: CreatePlanInputDto) => Promise<PlanModel>
  getOrCreateDefaultPlan: () => Promise<PlanModel>
  listResourcesByPlan: (input: ListByPlanInputDto) => Promise<ResourceModel[]>
  createResource: (input: CreateResourceInputDto) => Promise<ResourceModel>
  updateResource: (input: UpdateResourceInputDto) => Promise<ResourceModel>
  listSegmentsByPlan: (input: ListByPlanInputDto) => Promise<SegmentModel[]>
  createSegment: (input: CreateSegmentInputDto) => Promise<SegmentModel>
  updateSegment: (input: UpdateSegmentInputDto) => Promise<SegmentModel>
  getBoardSnapshotByWindow: (
    input: BoardSnapshotByWindowInputDto,
  ) => Promise<BoardSnapshotModel>
  createTask: (input: CreateTaskInputDto) => Promise<TaskModel>
  updateTask: (input: UpdateTaskInputDto) => Promise<TaskModel>
  addAssignment: (
    input: UpsertTaskAssignmentInputDto,
  ) => Promise<TaskAssignmentModel>
  updateAssignmentProgress: (
    input: UpdateTaskAssignmentProgressInputDto,
  ) => Promise<TaskAssignmentModel>
  removeAssignment: (
    input: RemoveTaskAssignmentInputDto,
  ) => Promise<TaskAssignmentModel>
  addDependency: (
    input: AddTaskDependencyInputDto,
  ) => Promise<TaskDependencyModel>
  removeDependency: (
    input: RemoveTaskDependencyInputDto,
  ) => Promise<TaskDependencyModel>
}

export const plannerService: PlannerService = {
  async listPlans() {
    const response = await trpcClient.planner.plans.list.query()
    const parsedResponse = PlanSchema.array().parse(response)

    return parsedResponse.map(toPlanModel)
  },

  async createPlan(input: CreatePlanInputDto) {
    const parsedInput = CreatePlanInputSchema.parse(input)
    const response = await trpcClient.planner.plans.create.mutate(parsedInput)
    const parsedResponse = PlanSchema.parse(response)

    return toPlanModel(parsedResponse)
  },

  async getOrCreateDefaultPlan() {
    const plans = await plannerService.listPlans()
    if (plans.length > 0) {
      return plans[0]
    }

    return plannerService.createPlan({ name: 'Planning Management Tool' })
  },

  async listResourcesByPlan(input: ListByPlanInputDto) {
    const parsedInput = ListByPlanInputSchema.parse(input)
    const response =
      await trpcClient.planner.resources.listByPlan.query(parsedInput)
    const parsedResponse = ResourceSchema.array().parse(response)

    return parsedResponse.map(toResourceModel)
  },

  async createResource(input: CreateResourceInputDto) {
    const parsedInput = CreateResourceInputSchema.parse(input)
    const response =
      await trpcClient.planner.resources.create.mutate(parsedInput)
    const parsedResponse = ResourceSchema.parse(response)

    return toResourceModel(parsedResponse)
  },

  async updateResource(input: UpdateResourceInputDto) {
    const parsedInput = UpdateResourceInputSchema.parse(input)
    const response =
      await trpcClient.planner.resources.update.mutate(parsedInput)
    const parsedResponse = ResourceSchema.parse(response)

    return toResourceModel(parsedResponse)
  },

  async listSegmentsByPlan(input: ListByPlanInputDto) {
    const parsedInput = ListByPlanInputSchema.parse(input)
    const response =
      await trpcClient.planner.segments.listByPlan.query(parsedInput)
    const parsedResponse = SegmentSchema.array().parse(response)

    return parsedResponse.map(toSegmentModel)
  },

  async createSegment(input: CreateSegmentInputDto) {
    const parsedInput = CreateSegmentInputSchema.parse(input)
    const response =
      await trpcClient.planner.segments.create.mutate(parsedInput)
    const parsedResponse = SegmentSchema.parse(response)

    return toSegmentModel(parsedResponse)
  },

  async updateSegment(input: UpdateSegmentInputDto) {
    const parsedInput = UpdateSegmentInputSchema.parse(input)
    const response =
      await trpcClient.planner.segments.update.mutate(parsedInput)
    const parsedResponse = SegmentSchema.parse(response)

    return toSegmentModel(parsedResponse)
  },

  async getBoardSnapshotByWindow(input: BoardSnapshotByWindowInputDto) {
    const parsedInput = BoardSnapshotByWindowInputSchema.parse(input)
    const response =
      await trpcClient.planner.board.snapshotByWindow.query(parsedInput)
    const parsedResponse = PlannerBoardSnapshotSchema.parse(response)

    return toBoardSnapshotModel(parsedResponse)
  },

  async createTask(input: CreateTaskInputDto) {
    const parsedInput = CreateTaskInputSchema.parse(input)
    const response = await trpcClient.planner.tasks.create.mutate(parsedInput)
    const parsedResponse = TaskSchema.parse(response)

    return toTaskModelFromTask(parsedResponse)
  },

  async updateTask(input: UpdateTaskInputDto) {
    const parsedInput = UpdateTaskInputSchema.parse(input)
    const response = await trpcClient.planner.tasks.update.mutate(parsedInput)
    const parsedResponse = TaskSchema.parse(response)

    return toTaskModelFromTask(parsedResponse)
  },

  async addAssignment(input: UpsertTaskAssignmentInputDto) {
    const parsedInput = UpsertTaskAssignmentInputSchema.parse(input)
    const response =
      await trpcClient.planner.assignments.add.mutate(parsedInput)
    const parsedResponse = TaskAssignmentSchema.parse(response)

    return toTaskAssignmentModel(parsedResponse)
  },

  async updateAssignmentProgress(input: UpdateTaskAssignmentProgressInputDto) {
    const parsedInput = UpdateTaskAssignmentProgressInputSchema.parse(input)
    const response =
      await trpcClient.planner.assignments.updateProgress.mutate(parsedInput)
    const parsedResponse = TaskAssignmentSchema.parse(response)

    return toTaskAssignmentModel(parsedResponse)
  },

  async removeAssignment(input: RemoveTaskAssignmentInputDto) {
    const parsedInput = RemoveTaskAssignmentInputSchema.parse(input)
    const response =
      await trpcClient.planner.assignments.remove.mutate(parsedInput)
    const parsedResponse = TaskAssignmentSchema.parse(response)

    return toTaskAssignmentModel(parsedResponse)
  },

  async addDependency(input: AddTaskDependencyInputDto) {
    const parsedInput = AddTaskDependencyInputSchema.parse(input)
    const response =
      await trpcClient.planner.dependencies.add.mutate(parsedInput)
    const parsedResponse = TaskDependencySchema.parse(response)

    return toTaskDependencyModel(parsedResponse)
  },

  async removeDependency(input: RemoveTaskDependencyInputDto) {
    const parsedInput = RemoveTaskDependencyInputSchema.parse(input)
    const response =
      await trpcClient.planner.dependencies.remove.mutate(parsedInput)
    const parsedResponse = TaskDependencySchema.parse(response)

    return toTaskDependencyModel(parsedResponse)
  },
}
