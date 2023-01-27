import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { changeMemberTypeBodySchema } from './schema';
import type { MemberTypeEntity } from '../../utils/DB/entities/DBMemberTypes';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<MemberTypeEntity[]> {
    return await fastify.db.memberTypes.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<MemberTypeEntity | null> {
      const typeToGet = await fastify.db.memberTypes.findOne({key: "id", equals: request.params.id});
      if(!typeToGet) {
        reply.statusCode = 404;
        throw new Error("Member type not found")
      }
      return typeToGet;
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeMemberTypeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<MemberTypeEntity> {
      if(!["basic", "business"].includes(request.params.id)){
        reply.statusCode = 400;
        throw new Error("Invalid ID");
      }
      const result = request.body;
      const changedType = await fastify.db.memberTypes.change(request.params.id, result);
      if(!changedType) {
        reply.statusCode = 404;
        throw new Error("Member type not found")
      }
      return changedType;
    }
  );
};

export default plugin;
