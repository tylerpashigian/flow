import { trpcClient } from '#/integrations/trpc/client'
import {
  AddTaskDependencyInputSchema,
  BoardSnapshotByWindowInputSchema,
  CreateTaskInputSchema,
  PlannerBoardSnapshotSchema,
  RemoveTaskAssignmentInputSchema,
  RemoveTaskDependencyInputSchema,
  TaskAssignmentSchema,
  TaskDependencySchema,
  TaskSchema,
  UpdateTaskAssignmentProgressInputSchema,
  UpdateTaskInputSchema,
  UpsertTaskAssignmentInputSchema,
} from '#/integrations/trpc/planner/schemas'
import type {
  AddTaskDependencyInputDto,
  BoardSnapshotByWindowInputDto,
  CreateTaskInputDto,
  RemoveTaskAssignmentInputDto,
  RemoveTaskDependencyInputDto,
  UpdateTaskAssignmentProgressInputDto,
  UpdateTaskInputDto,
  UpsertTaskAssignmentInputDto,
} from '#/integrations/trpc/planner/schemas'

import {
  toBoardSnapshotModel,
  toTaskAssignmentModel,
  toTaskDependencyModel,
  toTaskModelFromTask,
} from './conversions'
import type {
  BoardSnapshotModel,
  TaskAssignmentModel,
  TaskDependencyModel,
  TaskModel,
} from './models'

export interface PlannerService {
  getBoardSnapshotByWindow: (
    input: BoardSnapshotByWindowInputDto,
  ) => Promise<BoardSnapshotModel>
  createTask: (input: CreateTaskInputDto) => Promise<TaskModel>
  updateTask: (input: UpdateTaskInputDto) => Promise<TaskModel>
  addAssignment: (input: UpsertTaskAssignmentInputDto) => Promise<TaskAssignmentModel>
  updateAssignmentProgress: (
    input: UpdateTaskAssignmentProgressInputDto,
  ) => Promise<TaskAssignmentModel>
  removeAssignment: (
    input: RemoveTaskAssignmentInputDto,
  ) => Promise<TaskAssignmentModel>
  addDependency: (input: AddTaskDependencyInputDto) => Promise<TaskDependencyModel>
  removeDependency: (
    input: RemoveTaskDependencyInputDto,
  ) => Promise<TaskDependencyModel>
}

export const plannerService: PlannerService = {
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
