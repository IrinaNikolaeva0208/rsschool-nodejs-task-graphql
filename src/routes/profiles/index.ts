import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { createProfileBodySchema, changeProfileBodySchema } from './schema';
import type { ProfileEntity } from '../../utils/DB/entities/DBProfiles';

const uuidRegEx = /[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/;
function isUUID (id: string) {
  return id.match(uuidRegEx) && id.length == 36;
}

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<ProfileEntity[]> {
    return await fastify.db.profiles.findMany()
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const profileToGet = await fastify.db.profiles.findOne({key: "id", equals: request.params.id});
      if(!profileToGet) {
        reply.statusCode = 404;
        throw new Error("Profile not found");
      }
      return profileToGet;
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createProfileBodySchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const newProfile = request.body;
      if(!["basic", "business"].includes(newProfile.memberTypeId)) {
        reply.statusCode = 400;
        throw new Error("Recieved wrong data");
      }
      const user = await fastify.db.users.findOne({key: "id", equals: newProfile.userId});
      if(!user) {
        reply.statusCode = 400;
        throw new Error("User does not exist");
      }
      const sameUserProfile = await fastify.db.profiles.findOne({key: "userId", equals: newProfile.userId});
      if(sameUserProfile) {
        reply.statusCode = 400;
        throw new Error("User already has a profile");
      }
      return await fastify.db.profiles.create(newProfile);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      if(!isUUID(request.params.id)){
        reply.statusCode = 400;
        throw new Error("Invalid ID");
      }
      const profileToDelete = await fastify.db.profiles.delete(request.params.id);
      if(!profileToDelete) {
        reply.statusCode = 404;
        throw new Error("Profile not found");
      }
      return profileToDelete;
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeProfileBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      if(!isUUID(request.params.id)){
        reply.statusCode = 400;
        throw new Error("Invalid ID");
      }
      const result = request.body;
      const profileToChange = await fastify.db.profiles.change(request.params.id, result);
      if(!profileToChange) {
        reply.statusCode = 404;
        throw new Error("Profile not found");
      }
      return profileToChange;
    }
  );
};

export default plugin;
