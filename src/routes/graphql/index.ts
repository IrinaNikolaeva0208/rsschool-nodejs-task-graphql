import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { graphqlBodySchema } from './schema';
import { graphql, validate, parse } from 'graphql';
import root from './rootQuery';
import querySchema from './queryScema';
import { FastifyInstance } from 'fastify';
import depthLimit = require('graphql-depth-limit');
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
      const error = validate(querySchema, parse(String(request.body.query)), [depthLimit(6)]);
      if(error.length) reply.send(error);
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
