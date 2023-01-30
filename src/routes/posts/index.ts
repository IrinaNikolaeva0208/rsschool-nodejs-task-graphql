import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { createPostBodySchema, changePostBodySchema } from './schema';
import type { PostEntity } from '../../utils/DB/entities/DBPosts';

const uuidRegEx = /[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/;
function isUUID (id: string) {
  return id.match(uuidRegEx) && id.length == 36;
}

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<PostEntity[]> {
    return await fastify.db.posts.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      const postToGet = await fastify.db.posts.findOne({key: "id", equals: request.params.id});
      if(!postToGet) {
        reply.statusCode = 404;
        throw new Error("Post not found");
      }
      return postToGet;
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createPostBodySchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      const newPost = request.body;
      const user = await fastify.db.users.findOne({key: "id", equals: newPost.userId});
      if(!user) {
        reply.statusCode = 400;
        throw new Error("User does not exist");
      }
      return await fastify.db.posts.create(newPost);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      if(!isUUID(request.params.id)){
        reply.statusCode = 400;
        throw new Error("Invalid ID");
      }
      const postToDelete = await fastify.db.posts.delete(request.params.id);
      if(!postToDelete) {
        reply.statusCode = 404;
        throw new Error("Post not found");
      }
      return postToDelete;
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changePostBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      if(!isUUID(request.params.id)){
        reply.statusCode = 400;
        throw new Error("Invalid ID");
      }
      const result = request.body;
      const postToChange = await fastify.db.posts.change(request.params.id, result);
      if(!postToChange) {
        reply.statusCode = 404;
        throw new Error("Post not found");
      }
      return postToChange;
    }
  );
};

export default plugin;
