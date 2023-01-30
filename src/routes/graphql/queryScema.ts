import {buildSchema} from "graphql"

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
          memberType(id: String): MemberType
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

export default querySchema;