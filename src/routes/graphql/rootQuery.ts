import isUUID from './UUIDvalidation';
import { context } from '.';

const root = {
    users: async () => {
      const users = await context.db.users.findMany();
      return users.map(async user => {
        const profile = await context.db.profiles.findOne({key: "userId", equals: user.id});
        const memberType = profile? await context.db.memberTypes.findOne({key: "id", equals: profile.memberTypeId}) : null;
        const userSubscribedTo = await context.db.users.findMany({key: "subscribedToUserIds", inArray: user.id});
        const STU = userSubscribedTo.map(async sub => {
          const subSubscribers = await context.db.users.findMany({key: "subscribedToUserIds", inArray: sub.id});
          const subSubscribedTo = [...sub.subscribedToUserIds.map(async id => await context.db.users.findOne({key: "id", equals: id}))]
          return {...sub, subscribedToUser: subSubscribers, userSubscribedTo: subSubscribedTo}
        });
        const subscribedToUser =  [...user.subscribedToUserIds.map(async id => await context.db.users.findOne({key: "id", equals: id}))];
        const UTS = subscribedToUser.map(async sub => {
          const folowing = await sub;
          if(folowing) {
            const subSubscribers = await context.db.users.findMany({key: "subscribedToUserIds", inArray: folowing.id});
            const subSubscribedTo = [...folowing.subscribedToUserIds.map(async id => await context.db.users.findOne({key: "id", equals: id}))]
            return {...folowing, subscribedToUser: subSubscribers, userSubscribedTo: subSubscribedTo}
          }
        });
        const posts = await context.db.posts.findMany({key: "userId", equals: user.id});
        return {...user, 
          profile: profile, 
          userSubscribedTo: UTS, 
          subscribedToUser: STU, 
          memberType: memberType, 
          posts: posts};
      });
    },

    profiles: () => {
      return context.db.profiles.findMany();
    },

    posts: () => {
      return context.db.posts.findMany();
    },

    memberTypes: () => {
      return context.db.memberTypes.findMany();
    },

    user: async ({id}: {id: string}) => {
      if(!isUUID(id)) throw new Error("Invalid ID");
      const user = await context.db.users.findOne({key: "id", equals: id});
      if (!user) throw new Error("User does not exist");
      const profile = await context.db.profiles.findOne({key: "userId", equals: user.id});
      const memberType = profile? await context.db.memberTypes.findOne({key: "id", equals: profile.memberTypeId}) : null;
      const userSubscribedTo =  await context.db.users.findMany({key: "subscribedToUserIds", inArray: user.id});
      const subscribedToUser = [...user.subscribedToUserIds.map(async id =>  await context.db.users.findOne({key: "id", equals: id}))];
      const posts = await context.db.posts.findMany({key: "userId", equals: user.id});
      return {...user, 
        profile: profile, 
        memberType: memberType, 
        userSubscribedTo: userSubscribedTo,
        subscribedToUser: subscribedToUser,
        posts: posts};
    },

    profile: async({id}: {id: string}) => {
      if(!isUUID(id)) throw new Error("Invalid ID");
      const profile = await context.db.profiles.findOne({key: "id", equals: id});
      if (!profile) throw new Error("Profile does not exist");
      return profile
    },

    post: async ({id}: {id: string}) => {
      if(!isUUID(id)) throw new Error("Invalid ID");
      const post = await context.db.posts.findOne({key: "id", equals: id})
      if (!post) throw new Error("Post does not exist");
      return post;
    },

    memberType: ({id}: {id: string}) => {
      if(!["basic", "business"].includes(id)) throw new Error("Invalid ID");
      return context.db.memberTypes.findOne({key: "id", equals: id})
    },

    createUser: <T extends {firstName: string, lastName: string, email: string}>({input}: {input: T}) => {
      return context.db.users.create(input);
    }, 

    createProfile:  async <T extends {avatar: string, sex: string, birthday: number, country: string, city: string, street: string, userId: string, memberTypeId: string}>({input}: {input: T}) => {
      if(!isUUID(input.userId)) throw new Error("Invalid User ID");
      if(!["basic", "business"].includes(input.memberTypeId)) throw new Error("Invalid MemberType ID");
      const user = await context.db.users.findOne({key: "id", equals: input.userId});
      if(!user) throw new Error("User does not exist");
      const profile = await context.db.profiles.findOne({key: "userId", equals: input.userId});
      if(profile) throw new Error("Profile already exists");
      return context.db.profiles.create(input);
    },

    createPost: async <T extends {title: string, content: string, userId: string}>({input}: {input: T}) => {
      if(!isUUID(input.userId)) throw new Error("Invalid User ID");
      const user = await context.db.users.findOne({key: "id", equals: input.userId});
      if(!user) throw new Error("User does not exist");
      return context.db.posts.create(input);
    },

    updatePost: async <T extends {title: string, content: string, userId: string}>({input, id}: {input: T, id: string}) => {
      if(!isUUID(id)) throw new Error("Invalid ID");
      const post = await context.db.posts.findOne({key: "id", equals: id})
      if (!post) throw new Error("Post does not exist");
      return context.db.posts.change(id, input);
    },

    updateProfile: async <T extends {avatar: string, sex: string, birthday: number, country: string, city: string, street: string, userId: string, memberTypeId: string}>({input, id}: {input: T, id: string}) => {
      if(!isUUID(id)) throw new Error("Invalid ID");
      const profile = await context.db.profiles.findOne({key: "id", equals: id})
      if (!profile) throw new Error("Profile does not exist");
      return context.db.profiles.change(id, input);
    },

    updateMemberType: async <T extends {discount: number, monthPostsLimit: number}>({id, input}: {id: string, input: T}) => {
      if(!["basic", "business"].includes(id)) throw new Error("Invalid ID");
      return context.db.memberTypes.change(id, input);
    },

    updateUser: async <T extends {firstName: string, lastName: string, email: string}>({id, input}: {id: string, input: T}) => {
      if(!isUUID(id)) throw new Error("Invalid ID");
      const user = await context.db.users.findOne({key: "id", equals: id})
      if (!user) throw new Error("User does not exist");
      return context.db.users.change(id, input);
    },

    subscribeTo: async ({userId, subscribeToId}: {userId: string, subscribeToId: string}) => {
      if(!isUUID(userId) || !isUUID(subscribeToId)) throw new Error("Invalid ID");
      const follower = await context.db.users.findOne({key: "id", equals: userId});
      if(!follower) throw new Error(`User with ID:${userId} does not exist`);
      const following = await context.db.users.findOne({key: "id", equals: subscribeToId});
      if(!following) throw new Error(`User with ID:${subscribeToId} does not exist`);
      if(following.subscribedToUserIds.includes(userId)) throw new Error("Already subscribed");
      following.subscribedToUserIds.push(userId);
      return context.db.users.change(subscribeToId, following);
    },

    unsubscribeFrom: async ({userId, unsubscribeFromId}: {userId: string, unsubscribeFromId: string}) => {
      if(!isUUID(userId) || !isUUID(unsubscribeFromId)) throw new Error("Invalid ID");
      const follower = await context.db.users.findOne({key: "id", equals: userId});
      if(!follower) throw new Error(`User with ID:${userId} does not exist`);
      const following = await context.db.users.findOne({key: "id", equals: unsubscribeFromId});
      if(!following) throw new Error(`User with ID:${unsubscribeFromId} does not exist`);
      const followerIndex = following.subscribedToUserIds.indexOf(userId);
      following.subscribedToUserIds.splice(followerIndex, 1);
      return context.db.users.change(unsubscribeFromId, following);},
}

export default root;