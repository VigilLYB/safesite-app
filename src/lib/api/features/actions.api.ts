import { request, type Query } from "../client";
import { endpoints } from "../registry";
import {
  actionListSchema,
  actionSchema,
  actionTemplateListSchema,
  type ActionStatus,
  type ActionType,
} from "../schemas";

export interface ActionFilters extends Query {
  status?: string | undefined;
  mine?: boolean | undefined;
  overdue?: boolean | undefined;
  assigneeId?: string | undefined;
  incidentId?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface AssignActionInput {
  expectedVersion: number;
  type: ActionType;
  templateCode?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;
  assigneeId?: string | undefined;
  dueAt?: string | null | undefined;
  milestones?: { title: string; dueAt?: string | null | undefined }[] | undefined;
}

export const ACTIVE_ACTION_STATUSES: readonly ActionStatus[] = ["OPEN", "IN_PROGRESS"];

export const actionsApi = {
  templates: async (signal?: AbortSignal) =>
    (
      await request({
        endpoint: endpoints.actionTemplates,
        schema: actionTemplateListSchema,
        signal,
      })
    ).items,
  assign: (incidentId: string, body: AssignActionInput) =>
    request({
      endpoint: endpoints.actionAssign,
      params: { id: incidentId },
      body,
      schema: actionSchema,
    }),
  list: async (filters: ActionFilters, signal?: AbortSignal) =>
    (
      await request({
        endpoint: endpoints.actions,
        query: filters,
        schema: actionListSchema,
        signal,
      })
    ).items,
  get: (id: string, signal?: AbortSignal) =>
    request({ endpoint: endpoints.action, params: { id }, schema: actionSchema, signal }),
  completeMilestone: (id: string, milestoneId: string) =>
    request({
      endpoint: endpoints.milestoneComplete,
      params: { id, milestoneId },
      schema: actionSchema,
    }),
  complete: (id: string) =>
    request({ endpoint: endpoints.actionComplete, params: { id }, schema: actionSchema }),
};
