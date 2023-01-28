import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { graphqlBodySchema } from './schema';
import { graphql, buildSchema } from 'graphql';
import isUUID from './UUIDvalidation';

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
      const querySchema = buildSchema(`
        type User {
          id: ID
          firstName: String
          lastName: String
          email: String
          subscribedToUserIds: [ID]
          subscribedToUser: [User]
          userSubscribedTo: [User]
          profile: Profile
          posts: [Post]
          memberType: MemberType
        }

        type Profile {
          id: ID
          avatar: String
          sex: String
          birthday: String
          country: String
          street: String
          city: String
          userId: ID
          memberTypeId: String
        }

        type Post {
          id: ID
          title: String
          content: String
          userId: ID
        }

        type MemberType {
          id: String
          discount: Int
          monthPostsLimit: Int
        }

        type Query {
          users: [User]
          profiles: [Profile]
          posts: [Post]
          memberTypes: [MemberType]
          user(id: ID): User
          profile(id: ID): Profile
          post(id: ID): Post
          memberType(id: ID): MemberType
        }
      `);

      const root = {
        users: async (i: number | undefined) => {
          const users = await this.db.users.findMany();
          return users.map(async user => {
            const profile = await this.db.profiles.findOne({key: "userId", equals: user.id});
            const memberType = profile? await this.db.memberTypes.findOne({key: "id", equals: profile.memberTypeId}) : null;
            const userSubscribedTo = await this.db.users.findMany({key: "subscribedToUserIds", inArray: user.id});
            const STU = userSubscribedTo.map(async sub => {
              const subSubscribers = await this.db.users.findMany({key: "subscribedToUserIds", inArray: sub.id});
              const subSubscribedTo = [...sub.subscribedToUserIds.map(async id => await this.db.users.findOne({key: "id", equals: id}))]
              return {...sub, subscribedToUser: subSubscribers, userSubscribedTo: subSubscribedTo}
            });
            const subscribedToUser =  [...user.subscribedToUserIds.map(async id => await this.db.users.findOne({key: "id", equals: id}))];
            const UTS = subscribedToUser.map(async sub => {
              const folowing = await sub;
              if(folowing) {
                const subSubscribers = await this.db.users.findMany({key: "subscribedToUserIds", inArray: folowing.id});
                const subSubscribedTo = [...folowing.subscribedToUserIds.map(async id => await this.db.users.findOne({key: "id", equals: id}))]
                return {...folowing, subscribedToUser: subSubscribers, userSubscribedTo: subSubscribedTo}
              }
            });
            const posts = await this.db.posts.findMany({key: "userId", equals: user.id});
            return {...user, 
              profile: profile, 
              userSubscribedTo: UTS, 
              subscribedToUser: STU, 
              memberType: memberType, 
              posts: posts};
          });
        },

        profiles: () => {
          return this.db.profiles.findMany();
        },

        posts: () => {
          return this.db.posts.findMany();
        },

        memberTypes: () => {
          return this.db.memberTypes.findMany();
        },

        user: async ({id}: {id: string}) => {
          if(!isUUID(id)) {
            reply.statusCode = 400;
            throw new Error("Invalid ID");
          }
          const user = await this.db.users.findOne({key: "id", equals: id});
          if (!user) {
            reply.statusCode = 404;
            throw new Error("User not found")
          }
          const profile = await this.db.profiles.findOne({key: "userId", equals: user.id});
          const memberType = profile? await this.db.memberTypes.findOne({key: "id", equals: profile.memberTypeId}) : null;
          const userSubscribedTo =  await this.db.users.findMany({key: "subscribedToUserIds", inArray: user.id});
          const subscribedToUser = [...user.subscribedToUserIds.map(async id =>  await this.db.users.findOne({key: "id", equals: id}))];
          const posts = await this.db.posts.findMany({key: "userId", equals: user.id});
          return {...user, 
            profile: profile, 
            memberType: memberType, 
            userSubscribedTo: userSubscribedTo,
            subscribedToUser: subscribedToUser,
            posts: posts};
        },

        profile: async({id}: {id: string}) => {
          if(!isUUID(id)) {
            reply.statusCode = 400;
            throw new Error("Invalid ID");
          }
          const profile = await this.db.profiles.findOne({key: "id", equals: id});
          if (!profile) {
            reply.statusCode = 404;
            throw new Error("Profile not found")
          }
          return profile
        },

        post: async ({id}: {id: string}) => {
          if(!isUUID(id)) {
            reply.statusCode = 400;
            throw new Error("Invalid ID");
          }
          const post = await this.db.posts.findOne({key: "id", equals: id})
          if (!post) {
            reply.statusCode = 404;
            throw new Error("Post not found")
          }
          return post;
        },

        memberType: ({id}: {id: string}) => {
          if(!["basic", "business"].includes(id)) {
            reply.statusCode = 400;
            throw new Error("Invalid ID");
          }
          return this.db.memberTypes.findOne({key: "id", equals: id})
        }
    }

      return await graphql({
        schema: querySchema,
        source: String(request.body.query),
        contextValue: fastify,
        rootValue: root,
        variableValues: request.body.variables
      });
    }
  );
};

export default plugin;
