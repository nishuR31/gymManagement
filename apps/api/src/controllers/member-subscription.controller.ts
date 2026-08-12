import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { errors } from "../errors/app-error.js";
import type { MembershipService } from "../services/membership.service.js";
import type { RequestContext } from "../types/auth.js";

const memberParamsSchema = z.object({
  id: z.string().min(1)
});

const subscriptionParamsSchema = z.object({
  id: z.string().min(1),
  subId: z.string().min(1)
});

const assignSubscriptionSchema = z.object({
  planId: z.string().min(1),
  startDate: z.coerce.date().optional()
});

export class MemberSubscriptionController {
  public constructor(private readonly membershipService: MembershipService) {}

  public assign = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const actor = requireActor(request);
    const params = memberParamsSchema.parse(request.params);
    const body = assignSubscriptionSchema.parse(request.body);
    const subscription = await this.membershipService.assignSubscription(
      params.id,
      {
        planId: body.planId,
        ...(body.startDate ? { startDate: body.startDate } : {})
      },
      actor,
      getRequestContext(request)
    );
    reply.status(201).send({ subscription });
  };

  public list = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = memberParamsSchema.parse(request.params);
    const data = await this.membershipService.listSubscriptions(params.id, actor);
    return { data };
  };

  public freeze = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = subscriptionParamsSchema.parse(request.params);
    const subscription = await this.membershipService.freezeSubscription(params.id, params.subId, actor, getRequestContext(request));
    return { subscription };
  };

  public unfreeze = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = subscriptionParamsSchema.parse(request.params);
    const subscription = await this.membershipService.unfreezeSubscription(
      params.id,
      params.subId,
      actor,
      getRequestContext(request)
    );
    return { subscription };
  };

  public cancel = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = subscriptionParamsSchema.parse(request.params);
    const subscription = await this.membershipService.cancelSubscription(
      params.id,
      params.subId,
      actor,
      getRequestContext(request)
    );
    return { subscription };
  };
}

function requireActor(request: FastifyRequest) {
  if (!request.actor) {
    throw errors.unauthorized();
  }

  return request.actor;
}

function getRequestContext(request: FastifyRequest): RequestContext {
  return {
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
  };
}
