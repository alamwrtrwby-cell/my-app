import { getAuth } from "@clerk/express";
import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateDailyQuestionBody,
  CreateDailyQuestionParams,
  CreateGameAnswerBody,
  CreateGameAnswerParams,
  CreateGameBody,
  CreateGameParams,
  CreateGroupBody,
  CreateMemoryBody,
  CreateMemoryParams,
  CreateMoodBody,
  CreateMoodParams,
  CreateOrUpdateMeBody,
  CreateQuestionAnswerBody,
  CreateQuestionAnswerParams,
  GetDailyQuestionParams,
  GetGameParams,
  GetGroupParams,
  JoinGroupBody,
  ListGamesParams,
  ListGroupMembersParams,
  ListGroupMoodsParams,
  ListMemoriesParams,
  ListQuestionAnswersParams,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import {
  dailyQuestionsTable,
  gameAnswersTable,
  gamesTable,
  groupMembersTable,
  groupsTable,
  memoriesTable,
  moodsTable,
  questionAnswersTable,
  usersTable,
} from "@workspace/db";

const router: IRouter = Router();

const defaultQuestions = [
  "What is one tiny thing that made you smile today?",
  "What would your perfect free afternoon look like?",
  "Which memory from this group do you replay most often?",
  "What are you looking forward to this week?",
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function iso(value: Date | string | null | undefined) {
  return value instanceof Date ? value.toISOString() : value ?? null;
}

function currentClerkId(req: Request) {
  return getAuth(req).userId;
}

async function currentUser(req: Request) {
  const clerkId = currentClerkId(req);
  if (!clerkId) return null;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  return user ?? null;
}

async function requireUser(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: "Please sign in to continue" });
    return null;
  }
  return user;
}

async function isMember(userId: string, groupId: string) {
  const [member] = await db
    .select()
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.userId, userId),
        eq(groupMembersTable.groupId, groupId),
      ),
    )
    .limit(1);
  return member ?? null;
}

function publicUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    joinedAt: iso(user.createdAt),
  };
}

function publicGroup(
  group: typeof groupsTable.$inferSelect,
  memberCount: number,
) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    inviteCode: group.inviteCode,
    createdBy: group.createdBy,
    memberCount,
    createdAt: iso(group.createdAt),
  };
}

async function groupWithCount(group: typeof groupsTable.$inferSelect) {
  const members = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, group.id));
  return publicGroup(group, members.length);
}

function responseMood(
  mood: typeof moodsTable.$inferSelect,
  userName: string,
) {
  return {
    id: mood.id,
    userId: mood.userId,
    userName,
    emoji: mood.emoji,
    label: mood.label,
    note: mood.note,
    shared: mood.shared,
    date: mood.moodDate,
  };
}

async function groupQuestion(groupId: string) {
  const [question] = await db
    .select()
    .from(dailyQuestionsTable)
    .where(
      and(
        eq(dailyQuestionsTable.groupId, groupId),
        eq(dailyQuestionsTable.questionDate, today()),
      ),
    )
    .limit(1);
  return question ?? null;
}

function responseQuestion(question: typeof dailyQuestionsTable.$inferSelect) {
  return {
    id: question.id,
    groupId: question.groupId,
    prompt: question.prompt,
    date: question.questionDate,
    answerCount: 0,
  };
}

router.get("/me", async (req, res) => {
  const user = await currentUser(req);
  if (!user) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(publicUser(user));
});

router.post("/me", async (req, res) => {
  const clerkId = currentClerkId(req);
  if (!clerkId) {
    res.status(401).json({ error: "Please sign in to continue" });
    return;
  }
  const parsed = CreateOrUpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Name and email are required" });
    return;
  }
  const existing = await currentUser(req);
  const user = existing
    ? (
        await db
          .update(usersTable)
          .set({
            name: parsed.data.name,
            email: parsed.data.email,
            avatarUrl: parsed.data.avatarUrl ?? null,
          })
          .where(eq(usersTable.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(usersTable)
          .values({
            clerkId,
            name: parsed.data.name,
            email: parsed.data.email,
            avatarUrl: parsed.data.avatarUrl ?? null,
          })
          .returning()
      )[0];
  res.json(publicUser(user!));
});

router.get("/groups", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const memberships = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.userId, user.id));
  const groups = await Promise.all(
    memberships.map(async ({ groupId }) => {
      const [group] = await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, groupId))
        .limit(1);
      return group ? groupWithCount(group) : null;
    }),
  );
  res.json(groups.filter(Boolean));
});

router.post("/groups", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A group name is required" });
    return;
  }
  const inviteCode = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  const group = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(groupsTable)
      .values({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        inviteCode,
        createdBy: user.id,
      })
      .returning();
    await tx.insert(groupMembersTable).values({
      groupId: created.id,
      userId: user.id,
      role: "owner",
    });
    await tx.insert(dailyQuestionsTable).values({
      groupId: created.id,
      prompt: defaultQuestions[0],
      questionDate: today(),
    });
    return created;
  });
  res.status(201).json(publicGroup(group, 1));
});

router.post("/groups/join", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = JoinGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid invite code" });
    return;
  }
  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.inviteCode, parsed.data.inviteCode.trim().toUpperCase()))
    .limit(1);
  if (!group) {
    res.status(404).json({ error: "We couldn't find that group" });
    return;
  }
  const member = await isMember(user.id, group.id);
  if (!member) {
    await db.insert(groupMembersTable).values({
      groupId: group.id,
      userId: user.id,
      role: "member",
    });
  }
  res.json(await groupWithCount(group));
});

router.get("/groups/:groupId", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = GetGroupParams.safeParse(req.params);
  if (!parsed.success || !(await isMember(user.id, parsed.data.groupId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, parsed.data.groupId))
    .limit(1);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json(await groupWithCount(group));
});

router.get("/groups/:groupId/members", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = ListGroupMembersParams.safeParse(req.params);
  if (!parsed.success || !(await isMember(user.id, parsed.data.groupId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const members = await db
    .select({
      member: groupMembersTable,
      user: usersTable,
    })
    .from(groupMembersTable)
    .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
    .where(eq(groupMembersTable.groupId, parsed.data.groupId));
  const moods = await db
    .select()
    .from(moodsTable)
    .where(
      and(
        eq(moodsTable.groupId, parsed.data.groupId),
        eq(moodsTable.moodDate, today()),
      ),
    );
  res.json(
    members.map(({ member, user: memberUser }) => ({
      id: member.id,
      userId: memberUser.id,
      name: memberUser.name,
      avatarUrl: memberUser.avatarUrl,
      role: member.role,
      joinedAt: iso(member.joinedAt),
      currentMood:
        moods.find((mood) => mood.userId === memberUser.id && mood.shared)
          ?.emoji ?? null,
    })),
  );
});

router.get("/groups/:groupId/moods", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = ListGroupMoodsParams.safeParse(req.params);
  if (!parsed.success || !(await isMember(user.id, parsed.data.groupId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const moods = await db
    .select({ mood: moodsTable, user: usersTable })
    .from(moodsTable)
    .innerJoin(usersTable, eq(moodsTable.userId, usersTable.id))
    .where(
      and(
        eq(moodsTable.groupId, parsed.data.groupId),
        eq(moodsTable.shared, true),
      ),
    )
    .orderBy(desc(moodsTable.createdAt))
    .limit(30);
  res.json(moods.map(({ mood, user: moodUser }) => responseMood(mood, moodUser.name)));
});

router.post("/groups/:groupId/moods", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const params = CreateMoodParams.safeParse(req.params);
  const body = CreateMoodBody.safeParse(req.body);
  if (!params.success || !body.success || !(await isMember(user.id, params.data.groupId))) {
    res.status(400).json({ error: "Mood could not be saved" });
    return;
  }
  const [existing] = await db
    .select()
    .from(moodsTable)
    .where(
      and(
        eq(moodsTable.groupId, params.data.groupId),
        eq(moodsTable.userId, user.id),
        eq(moodsTable.moodDate, today()),
      ),
    )
    .limit(1);
  const mood = existing
    ? (
        await db
          .update(moodsTable)
          .set({
            emoji: body.data.emoji,
            label: body.data.label,
            note: body.data.note ?? null,
            shared: body.data.shared,
          })
          .where(eq(moodsTable.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(moodsTable)
          .values({
            groupId: params.data.groupId,
            userId: user.id,
            emoji: body.data.emoji,
            label: body.data.label,
            note: body.data.note ?? null,
            shared: body.data.shared,
            moodDate: today(),
          })
          .returning()
      )[0];
  res.status(201).json(responseMood(mood!, user.name));
});

router.get("/groups/:groupId/daily-question", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = GetDailyQuestionParams.safeParse(req.params);
  if (!parsed.success || !(await isMember(user.id, parsed.data.groupId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  let question = await groupQuestion(parsed.data.groupId);
  if (!question) {
    const [created] = await db
      .insert(dailyQuestionsTable)
      .values({
        groupId: parsed.data.groupId,
        prompt: defaultQuestions[new Date().getDay() % defaultQuestions.length],
        questionDate: today(),
      })
      .returning();
    question = created;
  }
  const answers = await db
    .select()
    .from(questionAnswersTable)
    .where(eq(questionAnswersTable.questionId, question.id));
  res.json({ ...responseQuestion(question), answerCount: answers.length });
});

router.post("/groups/:groupId/daily-question", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const params = CreateDailyQuestionParams.safeParse(req.params);
  const body = CreateDailyQuestionBody.safeParse(req.body);
  if (!params.success || !body.success || !(await isMember(user.id, params.data.groupId))) {
    res.status(400).json({ error: "Question could not be saved" });
    return;
  }
  const [question] = await db
    .insert(dailyQuestionsTable)
    .values({
      groupId: params.data.groupId,
      prompt: body.data.prompt,
      questionDate: body.data.date,
    })
    .returning();
  res.status(201).json(responseQuestion(question!));
});

router.get("/questions/:questionId/answers", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = ListQuestionAnswersParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid question" });
    return;
  }
  const answers = await db
    .select({ answer: questionAnswersTable, user: usersTable })
    .from(questionAnswersTable)
    .innerJoin(usersTable, eq(questionAnswersTable.userId, usersTable.id))
    .where(eq(questionAnswersTable.questionId, parsed.data.questionId))
    .orderBy(desc(questionAnswersTable.createdAt));
  res.json(
    answers.map(({ answer, user: answerUser }) => ({
      id: answer.id,
      questionId: answer.questionId,
      userId: answer.userId,
      userName: answerUser.name,
      answer: answer.answer,
      createdAt: iso(answer.createdAt),
    })),
  );
});

router.post("/questions/:questionId/answers", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const params = CreateQuestionAnswerParams.safeParse(req.params);
  const body = CreateQuestionAnswerBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Answer could not be saved" });
    return;
  }
  const [existing] = await db
    .select()
    .from(questionAnswersTable)
    .where(
      and(
        eq(questionAnswersTable.questionId, params.data.questionId),
        eq(questionAnswersTable.userId, user.id),
      ),
    )
    .limit(1);
  const answer = existing
    ? (
        await db
          .update(questionAnswersTable)
          .set({ answer: body.data.answer })
          .where(eq(questionAnswersTable.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(questionAnswersTable)
          .values({
            questionId: params.data.questionId,
            userId: user.id,
            answer: body.data.answer,
          })
          .returning()
      )[0];
  res.status(201).json({
    id: answer!.id,
    questionId: answer!.questionId,
    userId: answer!.userId,
    userName: user.name,
    answer: answer!.answer,
    createdAt: iso(answer!.createdAt),
  });
});

router.get("/groups/:groupId/games", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = ListGamesParams.safeParse(req.params);
  if (!parsed.success || !(await isMember(user.id, parsed.data.groupId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const games = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.groupId, parsed.data.groupId))
    .orderBy(desc(gamesTable.createdAt));
  res.json(
    games.map((game) => ({
      ...game,
      questionCount: Number(game.questionCount),
      createdAt: iso(game.createdAt),
    })),
  );
});

router.post("/groups/:groupId/games", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const params = CreateGameParams.safeParse(req.params);
  const body = CreateGameBody.safeParse(req.body);
  if (!params.success || !body.success || !(await isMember(user.id, params.data.groupId))) {
    res.status(400).json({ error: "Game could not be started" });
    return;
  }
  const [game] = await db
    .insert(gamesTable)
    .values({
      groupId: params.data.groupId,
      title: body.data.title,
      prompt: "Who would know you best?",
      questionCount: "1",
    })
    .returning();
  res.status(201).json({
    ...game,
    questionCount: Number(game!.questionCount),
    createdAt: iso(game!.createdAt),
  });
});

router.get("/games/:gameId", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = GetGameParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  const [game] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.id, parsed.data.gameId))
    .limit(1);
  if (!game || !(await isMember(user.id, game.groupId))) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json({
    ...game,
    questionCount: Number(game.questionCount),
    createdAt: iso(game.createdAt),
  });
});

router.post("/games/:gameId/answers", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const params = CreateGameAnswerParams.safeParse(req.params);
  const body = CreateGameAnswerBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Answer could not be saved" });
    return;
  }
  const [game] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.id, params.data.gameId))
    .limit(1);
  if (!game || !(await isMember(user.id, game.groupId))) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  const [answer] = await db
    .insert(gameAnswersTable)
    .values({
      gameId: game.id,
      userId: user.id,
      answer: body.data.answer,
      correct: false,
    })
    .returning();
  res.status(201).json({
    id: answer!.id,
    gameId: answer!.gameId,
    userId: user.id,
    userName: user.name,
    answer: answer!.answer,
    correct: answer!.correct,
  });
});

router.get("/groups/:groupId/memories", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = ListMemoriesParams.safeParse(req.params);
  if (!parsed.success || !(await isMember(user.id, parsed.data.groupId))) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const memories = await db
    .select({ memory: memoriesTable, user: usersTable })
    .from(memoriesTable)
    .innerJoin(usersTable, eq(memoriesTable.authorId, usersTable.id))
    .where(eq(memoriesTable.groupId, parsed.data.groupId))
    .orderBy(desc(memoriesTable.createdAt));
  res.json(
    memories.map(({ memory, user: author }) => ({
      id: memory.id,
      groupId: memory.groupId,
      authorName: author.name,
      type: memory.type,
      title: memory.title,
      body: memory.body,
      imageUrl: memory.imageUrl,
      createdAt: iso(memory.createdAt),
    })),
  );
});

router.post("/groups/:groupId/memories", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const params = CreateMemoryParams.safeParse(req.params);
  const body = CreateMemoryBody.safeParse(req.body);
  if (!params.success || !body.success || !(await isMember(user.id, params.data.groupId))) {
    res.status(400).json({ error: "Memory could not be saved" });
    return;
  }
  const [memory] = await db
    .insert(memoriesTable)
    .values({
      groupId: params.data.groupId,
      authorId: user.id,
      type: body.data.type,
      title: body.data.title,
      body: body.data.body ?? null,
      imageUrl: body.data.imageUrl ?? null,
    })
    .returning();
  res.status(201).json({
    id: memory!.id,
    groupId: memory!.groupId,
    authorName: user.name,
    type: memory!.type,
    title: memory!.title,
    body: memory!.body,
    imageUrl: memory!.imageUrl,
    createdAt: iso(memory!.createdAt),
  });
});

router.get("/dashboard", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const memberships = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.userId, user.id));
  const selectedMembership = memberships[0];
  const selectedGroup = selectedMembership
    ? (
        await db
          .select()
          .from(groupsTable)
          .where(eq(groupsTable.id, selectedMembership.groupId))
          .limit(1)
      )[0]
    : null;
  if (!selectedGroup) {
    res.json({
      user: publicUser(user),
      selectedGroup: null,
      members: [],
      todayMood: null,
      question: null,
      recentAnswers: [],
      latestMemories: [],
      activeGame: null,
    });
    return;
  }
  const [members, moods, question, memories, games] = await Promise.all([
    db
      .select({ member: groupMembersTable, memberUser: usersTable })
      .from(groupMembersTable)
      .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
      .where(eq(groupMembersTable.groupId, selectedGroup.id)),
    db
      .select({ mood: moodsTable, moodUser: usersTable })
      .from(moodsTable)
      .innerJoin(usersTable, eq(moodsTable.userId, usersTable.id))
      .where(
        and(
          eq(moodsTable.groupId, selectedGroup.id),
          eq(moodsTable.moodDate, today()),
        ),
      ),
    groupQuestion(selectedGroup.id),
    db
      .select({ memory: memoriesTable, author: usersTable })
      .from(memoriesTable)
      .innerJoin(usersTable, eq(memoriesTable.authorId, usersTable.id))
      .where(eq(memoriesTable.groupId, selectedGroup.id))
      .orderBy(desc(memoriesTable.createdAt))
      .limit(4),
    db
      .select()
      .from(gamesTable)
      .where(
        and(
          eq(gamesTable.groupId, selectedGroup.id),
          eq(gamesTable.status, "active"),
        ),
      )
      .orderBy(desc(gamesTable.createdAt))
      .limit(1),
  ]);
  const recentAnswers = question
    ? await db
        .select({ answer: questionAnswersTable, answerUser: usersTable })
        .from(questionAnswersTable)
        .innerJoin(usersTable, eq(questionAnswersTable.userId, usersTable.id))
        .where(eq(questionAnswersTable.questionId, question.id))
        .orderBy(desc(questionAnswersTable.createdAt))
        .limit(4)
    : [];
  res.json({
    user: publicUser(user),
    selectedGroup: await groupWithCount(selectedGroup),
    members: members.map(({ member, memberUser }) => ({
      id: member.id,
      userId: memberUser.id,
      name: memberUser.name,
      avatarUrl: memberUser.avatarUrl,
      role: member.role,
      joinedAt: iso(member.joinedAt),
      currentMood:
        moods.find(({ mood }) => mood.userId === memberUser.id && mood.shared)
          ?.mood.emoji ?? null,
    })),
    todayMood:
      moods.find(({ mood }) => mood.userId === user.id)
        ? responseMood(
            moods.find(({ mood }) => mood.userId === user.id)!.mood,
            user.name,
          )
        : null,
    question: question
      ? {
          ...responseQuestion(question),
          answerCount: recentAnswers.length,
        }
      : null,
    recentAnswers: recentAnswers.map(({ answer, answerUser }) => ({
      id: answer.id,
      questionId: answer.questionId,
      userId: answer.userId,
      userName: answerUser.name,
      answer: answer.answer,
      createdAt: iso(answer.createdAt),
    })),
    latestMemories: memories.map(({ memory, author }) => ({
      id: memory.id,
      groupId: memory.groupId,
      authorName: author.name,
      type: memory.type,
      title: memory.title,
      body: memory.body,
      imageUrl: memory.imageUrl,
      createdAt: iso(memory.createdAt),
    })),
    activeGame: games[0]
      ? {
          ...games[0],
          questionCount: Number(games[0].questionCount),
          createdAt: iso(games[0].createdAt),
        }
      : null,
  });
});

export default router;