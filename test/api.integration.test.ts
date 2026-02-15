import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as createConversationPost } from "@/app/api/conversations/route";
import { PATCH as renameConversationPatch } from "@/app/api/conversations/[id]/route";
import { POST as createMessagePost } from "@/app/api/conversations/[id]/messages/route";
import { POST as inviteParticipantPost } from "@/app/api/conversations/[id]/participants/route";
import { DELETE as removeParticipantDelete } from "@/app/api/conversations/[id]/participants/[userId]/route";
import { POST as adminCreateUserPost } from "@/app/api/admin/users/route";

type SeedUser = {
  id: string;
  username: string;
};

let alice: SeedUser;
let bob: SeedUser;
let carol: SeedUser;
let dave: SeedUser;

describe("API integration", () => {
  beforeAll(async () => {
    process.env.SHARED_PASSWORD = process.env.SHARED_PASSWORD ?? "community-password";
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-session-secret";

    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    alice = await prisma.user.create({
      data: {
        username: "alice",
        email: "alice@example.com",
        displayName: "Alice",
        role: "ADMIN"
      },
      select: {
        id: true,
        username: true
      }
    });

    bob = await prisma.user.create({
      data: {
        username: "bob",
        email: "bob@example.com",
        displayName: "Bob",
        role: "USER"
      },
      select: {
        id: true,
        username: true
      }
    });

    carol = await prisma.user.create({
      data: {
        username: "carol",
        email: "carol@example.com",
        displayName: "Carol",
        role: "USER"
      },
      select: {
        id: true,
        username: true
      }
    });

    dave = await prisma.user.create({
      data: {
        username: "dave",
        email: "dave@example.com",
        displayName: "Dave",
        role: "USER"
      },
      select: {
        id: true,
        username: true
      }
    });
  });

  afterAll(async () => {
    await prisma.session.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("logs in then creates a conversation", async () => {
    const loginRequest = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: bob.username,
        password: process.env.SHARED_PASSWORD
      })
    });

    const loginResponse = await loginPost(loginRequest);
    expect(loginResponse.status).toBe(200);

    const setCookie = loginResponse.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();

    const tokenMatch = setCookie?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    expect(tokenMatch?.[1]).toBeTruthy();

    const conversationRequest = new NextRequest("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=${tokenMatch?.[1] ?? ""}`
      },
      body: JSON.stringify({
        title: "Test Conversation",
        participantIds: [carol.id]
      })
    });

    const conversationResponse = await createConversationPost(conversationRequest);
    expect(conversationResponse.status).toBe(201);

    const payload = (await conversationResponse.json()) as { conversation?: { id: string } };
    expect(payload.conversation?.id).toBeTruthy();
  });

  it("allows admin to create users", async () => {
    const loginRequest = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: alice.username,
        password: process.env.SHARED_PASSWORD
      })
    });

    const loginResponse = await loginPost(loginRequest);
    expect(loginResponse.status).toBe(200);

    const setCookie = loginResponse.headers.get("set-cookie");
    const tokenMatch = setCookie?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    expect(tokenMatch?.[1]).toBeTruthy();

    const createUserRequest = new NextRequest("http://localhost:3000/api/admin/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=${tokenMatch?.[1] ?? ""}`
      },
      body: JSON.stringify({
        username: "eve",
        displayName: "Eve",
        email: "eve@example.com"
      })
    });

    const createUserResponse = await adminCreateUserPost(createUserRequest);
    expect(createUserResponse.status).toBe(201);

    const payload = (await createUserResponse.json()) as { user?: { username: string } };
    expect(payload.user?.username).toBe("eve");
  });

  it("allows participants to rename conversations", async () => {
    const bobLogin = await loginPost(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: bob.username,
          password: process.env.SHARED_PASSWORD
        })
      })
    );

    const bobCookie = bobLogin.headers.get("set-cookie");
    const bobToken = bobCookie?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1] ?? "";

    const createConversationResponse = await createConversationPost(
      new NextRequest("http://localhost:3000/api/conversations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${bobToken}`
        },
        body: JSON.stringify({
          title: "Original Title",
          participantIds: [carol.id]
        })
      })
    );

    const createdPayload = (await createConversationResponse.json()) as { conversation?: { id: string } };
    const conversationId = createdPayload.conversation?.id ?? "";
    expect(conversationId).toBeTruthy();

    const carolLogin = await loginPost(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: carol.username,
          password: process.env.SHARED_PASSWORD
        })
      })
    );

    const carolCookie = carolLogin.headers.get("set-cookie");
    const carolToken = carolCookie?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1] ?? "";

    const renameResponse = await renameConversationPatch(
      new NextRequest(`http://localhost:3000/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${carolToken}`
        },
        body: JSON.stringify({ title: "Renamed by Participant" })
      }),
      { params: { id: conversationId } }
    );

    expect(renameResponse.status).toBe(200);
    const renamePayload = (await renameResponse.json()) as { conversation?: { title: string | null } };
    expect(renamePayload.conversation?.title).toBe("Renamed by Participant");

    const daveLogin = await loginPost(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: dave.username,
          password: process.env.SHARED_PASSWORD
        })
      })
    );

    const daveCookie = daveLogin.headers.get("set-cookie");
    const daveToken = daveCookie?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1] ?? "";

    const forbiddenRename = await renameConversationPatch(
      new NextRequest(`http://localhost:3000/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${daveToken}`
        },
        body: JSON.stringify({ title: "Should not work" })
      }),
      { params: { id: conversationId } }
    );

    expect(forbiddenRename.status).toBe(403);
  });

  it("only allows participants to post and supports invites", async () => {
    const bobLogin = await loginPost(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: bob.username,
          password: process.env.SHARED_PASSWORD
        })
      })
    );

    const bobCookie = bobLogin.headers.get("set-cookie");
    const bobToken = bobCookie?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1] ?? "";

    const createConversationResponse = await createConversationPost(
      new NextRequest("http://localhost:3000/api/conversations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${bobToken}`
        },
        body: JSON.stringify({
          title: "Joinable Thread",
          participantIds: [carol.id]
        })
      })
    );

    const createdPayload = (await createConversationResponse.json()) as { conversation?: { id: string } };
    const conversationId = createdPayload.conversation?.id ?? "";
    expect(conversationId).toBeTruthy();

    const daveLogin = await loginPost(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: dave.username,
          password: process.env.SHARED_PASSWORD
        })
      })
    );

    const daveCookie = daveLogin.headers.get("set-cookie");
    const daveToken = daveCookie?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1] ?? "";

    const forbiddenPostResponse = await createMessagePost(
      new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${daveToken}`
        },
        body: JSON.stringify({ body: "I am joining this conversation." })
      }),
      { params: { id: conversationId } }
    );

    expect(forbiddenPostResponse.status).toBe(403);

    const inviteResponse = await inviteParticipantPost(
      new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/participants`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${bobToken}`
        },
        body: JSON.stringify({ userId: dave.id })
      }),
      { params: { id: conversationId } }
    );

    expect(inviteResponse.status).toBe(201);

    const inviteMessage = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      select: { body: true }
    });
    expect(inviteMessage?.body).toBe("Bob added Dave to the conversation.");

    const postMessageResponse = await createMessagePost(
      new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${daveToken}`
        },
        body: JSON.stringify({ body: "Thanks for the invite." })
      }),
      { params: { id: conversationId } }
    );

    expect(postMessageResponse.status).toBe(201);

    const daveMembership = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: dave.id
        }
      },
      select: { userId: true }
    });

    expect(daveMembership?.userId).toBe(dave.id);

    const participantCount = await prisma.conversationParticipant.count({
      where: { conversationId }
    });
    expect(participantCount).toBe(3);
  });

  it("allows admin to remove participants from a conversation", async () => {
    const bobLogin = await loginPost(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: bob.username,
          password: process.env.SHARED_PASSWORD
        })
      })
    );
    const bobToken = bobLogin.headers.get("set-cookie")?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1] ?? "";

    const createConversationResponse = await createConversationPost(
      new NextRequest("http://localhost:3000/api/conversations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${bobToken}`
        },
        body: JSON.stringify({
          title: "Admin Removal",
          participantIds: [carol.id, dave.id]
        })
      })
    );
    const conversationId =
      ((await createConversationResponse.json()) as { conversation?: { id: string } }).conversation?.id ?? "";
    expect(conversationId).toBeTruthy();

    const nonAdminRemoval = await removeParticipantDelete(
      new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/participants/${dave.id}`, {
        method: "DELETE",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${bobToken}`
        }
      }),
      { params: { id: conversationId, userId: dave.id } }
    );
    expect(nonAdminRemoval.status).toBe(403);

    const aliceLogin = await loginPost(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: alice.username,
          password: process.env.SHARED_PASSWORD
        })
      })
    );
    const aliceToken = aliceLogin.headers.get("set-cookie")?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1] ?? "";

    const adminRemoval = await removeParticipantDelete(
      new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/participants/${dave.id}`, {
        method: "DELETE",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${aliceToken}`
        }
      }),
      { params: { id: conversationId, userId: dave.id } }
    );
    expect(adminRemoval.status).toBe(200);

    const daveMembership = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: dave.id
        }
      }
    });
    expect(daveMembership).toBeNull();
  });
});
