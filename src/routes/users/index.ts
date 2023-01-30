import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import {
  createUserBodySchema,
  changeUserBodySchema,
  subscribeBodySchema,
} from './schemas';
import type { UserEntity } from '../../utils/DB/entities/DBUsers';

const uuidRegEx = /[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/;
function isUUID (id: string) {
  return id.match(uuidRegEx) && id.length == 36;
}

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<UserEntity[]> {
      return await fastify.db.users.findMany()
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity>{
      const userToGet = await fastify.db.users.findOne({key: "id", equals: request.params.id});
      if(!userToGet) {
        reply.statusCode = 404;
        throw new Error("User not found")
      }
      return userToGet;
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createUserBodySchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const newUser = request.body;
      return await fastify.db.users.create(newUser);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      if(!isUUID(request.params.id)){
        reply.statusCode = 400;
        throw new Error("Invalid ID");
      }
      const userToDelete = await fastify.db.users.delete(request.params.id);
      if(!userToDelete) {
        reply.statusCode = 404;
        throw new Error("User not found");
      }
      const userProfile = await fastify.db.profiles.findOne({key: "userId", equals: userToDelete.id});
      if(userProfile) await fastify.db.profiles.delete(userProfile.id);
      const subscribers = await fastify.db.users.findMany({key: "subscribedToUserIds", inArray: userToDelete.id});
      if(subscribers.length) subscribers.forEach(async (sub, ind) => {
        sub.subscribedToUserIds.splice(ind, 1);
        await fastify.db.users.change(sub.id, sub);
      });
      const userPosts = await fastify.db.posts.findMany({key: "userId", equals: userToDelete.id})
      if(userPosts.length) userPosts.forEach(async post => await fastify.db.posts.delete(post.id));
      return userToDelete;
    }
  );

  fastify.post(
    '/:id/subscribeTo',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const subscriber = request.body.userId;
      const userToSubscribe = request.params.id;
      const subscriberInfo = await fastify.db.users.findOne({key: "id", equals: subscriber});
      if(!subscriberInfo) {
        reply.statusCode = 404;
        throw new Error("Subscriber not found");
      }
      const userIndex = subscriberInfo.subscribedToUserIds.indexOf(userToSubscribe);
      if(userIndex != -1) {
        reply.statusCode = 400;
        throw new Error("Already subscribed to this user");
      }
      subscriberInfo.subscribedToUserIds.push(userToSubscribe);
      const result = await fastify.db.users.change(subscriber, subscriberInfo);
      return result;
    }
  );

  fastify.post(
    '/:id/unsubscribeFrom',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const subscriber = request.body.userId;
      const userToUnsubscribe = request.params.id;
      const subscriberInfo = await fastify.db.users.findOne({key: "id", equals: subscriber});
      if(!subscriberInfo) {
        reply.statusCode = 404;
        throw new Error("Subscriber not found");
      }
      const userIndex = subscriberInfo.subscribedToUserIds.indexOf(userToUnsubscribe);
      if(userIndex == -1) {
        reply.statusCode = 400;
        throw new Error("Not subscribed to this user");
      }
      subscriberInfo.subscribedToUserIds.splice(userIndex, 1);
      const result = await fastify.db.users.change(subscriber, subscriberInfo);
      return result;
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeUserBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      if(!isUUID(request.params.id)){
        reply.statusCode = 400;
        throw new Error("Invalid ID");
      }
      const result = request.body;
      const userToChange = await fastify.db.users.change(request.params.id, result); 
      if(!userToChange) {
        reply.statusCode = 404;
        throw new Error("User not found")
      }
      return userToChange;
    }
  );
};

export default plugin;
