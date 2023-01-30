import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { graphqlBodySchema } from './schema';
import { graphql } from 'graphql';
import root from './rootQuery';
import querySchema from './queryScema';
import { FastifyInstance } from 'fastify';
let context: FastifyInstance;

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.post(
    '/',
    {
      schema: {
        body: graphqlBodySchema,
      },
    },
    async function (request, reply) {
      context = fastify;
      return await graphql({
        schema: querySchema,
        source: String(request.body.query),
        rootValue: root,
        variableValues: request.body.variables
      });
    }
  );
};

export {context};
export default plugin;
