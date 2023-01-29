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
          birthday: Int
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

        input UserInput {
          firstName: String!
          lastName: String!
          email: String!
        }

        input PostInput {
          title: String!
          content: String!
          userId: ID!
        }

        input MemberTypeInput {
          discount: Int
          monthPostsLimit: Int
        }

        input ProfileInput {
          avatar: String!
          sex: String!
          birthday: Int!
          country: String!
          street: String!
          city: String!
          userId: ID!
          memberTypeId: String!
        }

        type Mutation {
          createUser(input: UserInput): User
          createPost(input: PostInput): Post
          createProfile(input: ProfileInput): Profile
          updateUser(id:ID, input: UserInput): User
          updateProfile(id:ID, input: ProfileInput): Profile
          updateMemberType(id:ID, input: MemberTypeInput): MemberType
          updatePost(id:ID, input: PostInput): Post
          subscribeTo(userId:ID, subscribeToId: ID): User
          unsubscribeFrom(userId:ID, unsubscribeFromId:ID): User
        }
      `);

      const root = {
        users: async () => {
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
          if(!isUUID(id)) throw new Error("Invalid ID");
          const user = await this.db.users.findOne({key: "id", equals: id});
          if (!user) throw new Error("User does not exist");
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
          if(!isUUID(id)) throw new Error("Invalid ID");
          const profile = await this.db.profiles.findOne({key: "id", equals: id});
          if (!profile) throw new Error("Profile does not exist");
          return profile
        },

        post: async ({id}: {id: string}) => {
          if(!isUUID(id)) throw new Error("Invalid ID");
          const post = await this.db.posts.findOne({key: "id", equals: id})
          if (!post) throw new Error("Post does not exist");
          return post;
        },

        memberType: ({id}: {id: string}) => {
          if(!["basic", "business"].includes(id)) throw new Error("Invalid ID");
          return this.db.memberTypes.findOne({key: "id", equals: id})
        },

        createUser: <T extends {firstName: string, lastName: string, email: string}>({input}: {input: T}) => {
          return this.db.users.create(input);
        }, 

        createProfile:  async <T extends {avatar: string, sex: string, birthday: number, country: string, city: string, street: string, userId: string, memberTypeId: string}>({input}: {input: T}) => {
          if(!isUUID(input.userId)) throw new Error("Invalid User ID");
          if(!["basic", "business"].includes(input.memberTypeId)) throw new Error("Invalid MemberType ID");
          const user = await fastify.db.users.findOne({key: "id", equals: input.userId});
          if(!user) throw new Error("User does not exist");
          const profile = await this.db.profiles.findOne({key: "userId", equals: input.userId});
          if(profile) throw new Error("Profile already exists");
          return this.db.profiles.create(input);
        },

        createPost: async <T extends {title: string, content: string, userId: string}>({input}: {input: T}) => {
          if(!isUUID(input.userId)) throw new Error("Invalid User ID");
          const user = await fastify.db.users.findOne({key: "id", equals: input.userId});
          if(!user) throw new Error("User does not exist");
          return this.db.posts.create(input);
        },

        updatePost: async <T extends {title: string, content: string, userId: string}>({input, id}: {input: T, id: string}) => {
          if(!isUUID(id)) throw new Error("Invalid ID");
          const post = await this.db.posts.findOne({key: "id", equals: id})
          if (!post) throw new Error("Post does not exist");
          return this.db.posts.change(id, input);
        },

        updateProfile: async <T extends {avatar: string, sex: string, birthday: number, country: string, city: string, street: string, userId: string, memberTypeId: string}>({input, id}: {input: T, id: string}) => {
          if(!isUUID(id)) throw new Error("Invalid ID");
          const profile = await this.db.profiles.findOne({key: "id", equals: id})
          if (!profile) throw new Error("Profile does not exist");
          return this.db.profiles.change(id, input);
        },

        updateMemberType: async <T extends {discount: number, monthPostsLimit: number}>({id, input}: {id: string, input: T}) => {
          if(!["basic", "business"].includes(id)) throw new Error("Invalid ID");
          return this.db.memberTypes.change(id, input);
        },

        updateUser: async <T extends {firstName: string, lastName: string, email: string}>({id, input}: {id: string, input: T}) => {
          if(!isUUID(id)) throw new Error("Invalid ID");
          const user = await this.db.users.findOne({key: "id", equals: id})
          if (!user) throw new Error("User does not exist");
          return this.db.users.change(id, input);
        },

        subscribeTo: async ({userId, subscribeToId}: {userId: string, subscribeToId: string}) => {
          if(!isUUID(userId) || !isUUID(subscribeToId)) throw new Error("Invalid ID");
          const follower = await this.db.users.findOne({key: "id", equals: userId});
          if(!follower) throw new Error(`User with ID:${userId} does not exist`);
          const following = await this.db.users.findOne({key: "id", equals: subscribeToId});
          if(!following) throw new Error(`User with ID:${subscribeToId} does not exist`);
          if(following.subscribedToUserIds.includes(userId)) throw new Error("Already subscribed");
          following.subscribedToUserIds.push(userId);
          return this.db.users.change(subscribeToId, following);
        },

        unsubscribeFrom: async ({userId, unsubscribeFromId}: {userId: string, unsubscribeFromId: string}) => {
          if(!isUUID(userId) || !isUUID(unsubscribeFromId)) throw new Error("Invalid ID");
          const follower = await this.db.users.findOne({key: "id", equals: userId});
          if(!follower) throw new Error(`User with ID:${userId} does not exist`);
          const following = await this.db.users.findOne({key: "id", equals: unsubscribeFromId});
          if(!following) throw new Error(`User with ID:${unsubscribeFromId} does not exist`);
          const followerIndex = following.subscribedToUserIds.indexOf(userId);
          following.subscribedToUserIds.splice(followerIndex, 1);
          return this.db.users.change(unsubscribeFromId, following);},
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
